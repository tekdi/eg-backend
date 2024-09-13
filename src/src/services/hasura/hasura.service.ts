import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { lastValueFrom, map } from 'rxjs';
import { QueryGeneratorService } from 'src/helper/queryGenerator.service';

@Injectable()
export class HasuraService {
	public url = this.configService.get<string>('HASURA_BASE_URL');

	constructor(
		private configService: ConfigService,
		private readonly httpService: HttpService,
		private qgService: QueryGeneratorService,
	) {}

	public async postData(query) {
		const data = JSON.stringify(query);

		const url = this.configService.get<string>('HASURA_BASE_URL');

		const config: AxiosRequestConfig = {
			headers: {
				'x-hasura-admin-secret': this.configService.get<string>(
					'HASURA_ADMIN_SECRET',
				),
				'Content-Type': 'application/json',
			},
		};

		try {
			const observable = this.httpService.post(url, data, config);

			const promise = observable.toPromise();

			const response = await promise;

			return response.data;
		} catch (e) {
			console.log('post data error', e.message);
		}
	}

	public async getData(data) {
		try {
			let url = this.configService.get<string>('HASURA_BASE_URL');
			let admin_secret = this.configService.get<string>(
				'HASURA_ADMIN_SECRET',
			);
			return await lastValueFrom(
				this.httpService
					.post(url, data, {
						headers: {
							'x-hasura-admin-secret': admin_secret,
							'Content-Type': 'application/json',
						},
					})
					.pipe(map((res) => res.data)),
			);
		} catch (e) {
			console.log('get data error', e.message);
		}
	}

	public async queryWithVariable(query: any) {
		try {
			let axios = require('axios');
			let url = this.configService.get<string>('HASURA_BASE_URL');
			let admin_secret = this.configService.get<string>(
				'HASURA_ADMIN_SECRET',
			);
			var config = {
				method: 'post',
				url: url,
				headers: {
					'x-hasura-admin-secret': admin_secret,
					'Content-Type': 'application/json',
				},
				data: query,
			};

			return await axios(config);
		} catch (e) {
			console.log('query data error', e.message);
			return { error: e.message };
		}
	}

	public async executeRawSql(sql: string) {
		try {
			let url = this.configService.get<string>('HASURA_SQL_BASE_URL');

			const DBName = this.configService.get<string>('HASURA_DB_NAME');
			let admin_secret = this.configService.get<string>(
				'HASURA_ADMIN_SECRET',
			);
			const data = {
				type: 'run_sql',
				args: {
					source: DBName,
					sql: sql,
				},
			};

			return await lastValueFrom(
				this.httpService
					.post(url, data, {
						headers: {
							'x-hasura-admin-secret': admin_secret,
							'Content-Type': 'application/json',
						},
					})
					.pipe(map((res) => res.data)),
			);
		} catch (e) {}
	}

	public getFormattedData(arr, excludeFieldsIndex?) {
		excludeFieldsIndex = excludeFieldsIndex ?? [];
		let result = [];
		const columnNames = arr[0]?.filter(
			(name, index) => !excludeFieldsIndex.includes(index),
		);

		if (arr.length > 1) {
			result = arr.slice(1).map((record) => {
				const modifiedRecord = {};
				columnNames.forEach((columnName, cNameIndex) => {
					modifiedRecord[columnName] = record[cNameIndex];
				});
				return modifiedRecord;
			});
		}
		return result;
	}

	public async findAll(tableName: string, filters: Object = {}) {
		let query = '';
		if (filters) {
			Object.keys(filters).forEach((e) => {
				if (filters[e] && filters[e] != '') {
					query += `${e}:{_eq:"${filters[e]}"}`;
				}
			});
		}

		var data = {
			query: `query SearchUser {
			${tableName}_aggregate(where:{${query}}) {
			  aggregate {
				count
			  }
			}
			${tableName}(where:{${query}}) {
			  id
			  mobile
			  aadhar_token
			  aadhar_no
			  program_beneficiaries{
				facilitator_id
			  }
			  program_faciltators {
				id
			  }
			}}`,
		};

		return await lastValueFrom(
			this.httpService
				.post(this.url, data, {
					headers: {
						'x-hasura-admin-secret':
							process.env.HASURA_ADMIN_SECRET,
						'Content-Type': 'application/json',
					},
				})
				.pipe(map((res) => res.data)),
		);
	}

	public async getAll(
		tableName: string,
		onlyFields: any = [],
		request: any = { filters: {}, page: '0', limit: '0' },
	) {
		const { data, errors } = await lastValueFrom(
			this.httpService
				.post(
					this.url,
					{
						query: this.qgService.query(
							tableName,
							onlyFields,
							request,
						),
					},
					{
						headers: {
							'Content-Type': 'application/json',
							'x-hasura-admin-secret':
								process.env.HASURA_ADMIN_SECRET,
						},
					},
				)
				.pipe(map((res) => res.data)),
		);
		let obj: any = { data: {} };
		if (!errors) {
			const { limit, page } = request;
			let mappedResponse = data?.[`${tableName}`];
			if (limit) {
				const totalCount =
					data?.[`${tableName}_aggregate`]?.aggregate?.count;
				const totalPages = limit ? Math.ceil(totalCount / limit) : 0;
				obj = {
					...obj,
					totalCount: `${totalCount}`,
					limit: `${limit}`,
					currentPage: page ? `${page}` : '1',
					totalPages: `${totalPages}`,
				};
			}
			obj = {
				...obj,
				data: mappedResponse,
			};
		} else {
			obj = { errors };
		}
		return {
			statusCode: 200,
			message: 'Ok.',
			...obj,
		};
	}

	public async getOne(id: number, tableName: string, onlyFields: any = []) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.findOne(
								id,
								tableName,
								onlyFields,
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async create(
		tableName: string,
		item: Object,
		onlyFields: any = [],
		fields: any = [],
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.create(
								tableName,
								item,
								onlyFields,
								fields,
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async createWithVariable(
		tableName: string,
		item: Object,
		onlyFields: any = [],
		fields: any = [],
		variable = [],
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						this.qgService.createWithVariable(
							tableName,
							item,
							onlyFields,
							fields,
							variable,
						),
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async update(
		id: number,
		tableName: string,
		item: Object,
		onlyFields: any = [],
		fields: any = [],
		props: any = {},
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.update(
								id,
								tableName,
								item,
								onlyFields,
								fields,
								props,
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async updateWithVariable(
		id: number,
		tableName: string,
		item: Object,
		onlyFields: any = [],
		fields: any = [],
		props: any = {},
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,

						this.qgService.updateWithVariable(
							id,
							tableName,
							item,
							onlyFields,
							fields,
							props,
						),

						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async delete(
		tableName: string,
		item: Object,
		onlyFields: any = [],
		returnFields: any = null,
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.deleteQuery(
								tableName,
								item,
								onlyFields,
								returnFields,
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async q(
		tableName: string,
		item: Object,
		onlyFields: any = [],
		update: boolean = false,
		fields: any = [],
	) {
		let query = this.qgService.mutation(
			tableName,
			item,
			onlyFields,
			update,
			fields,
		);

		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: query,
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async qM(
		tableName: string,
		item: any,
		fields: any,
		onlyFields: any = [],
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.queryMulti(
								tableName,
								item,
								fields,
								onlyFields,
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public getResponce = (
		{ data, errors }: any,
		tableName: any,
		response = 'table',
	) => {
		let result = null;
		if (data) {
			if (data[`${tableName}_by_pk`]) {
				result = data[`${tableName}_by_pk`];
			} else if (data[`insert_${tableName}_one`]) {
				result = data[`insert_${tableName}_one`];
			} else if (data[`update_${tableName}`]) {
				result = data[`update_${tableName}`];
				if (result['returning'] && result['returning'][0]) {
					result = result['returning'][0];
				}
			} else if (data[`delete_${tableName}`]) {
				result = data[`delete_${tableName}`];
			} else {
				result = data[tableName];
			}
		}
		result = result || errors?.[0] || {};
		if (response === 'data') {
			return result;
		} else {
			return { [tableName]: result };
		}
	};
}
