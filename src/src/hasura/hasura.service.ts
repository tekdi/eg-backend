import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { QueryGeneratorService } from 'src/helper/queryGenerator.service';

@Injectable()
export class HasuraService {
	public url = process.env.HASURA_BASE_URL;
	constructor(
		private readonly httpService: HttpService,
		public qgService: QueryGeneratorService,
	) {}

	public async findAll(tableName: string, filters: Object = {}) {
		let query = '';
		if (filters) {
			Object.keys(filters).forEach((e) => {
				if (filters[e] && filters[e] != '') {
					query += `${e}:{_eq:"${filters[e]}"}`;
				}
			});
		}

		let data = {
			query: `query SearchUser {
		${tableName}_aggregate(where:{${query}}) {
		  aggregate {
			count
		  }
		}
		${tableName}(where:{${query}}) {
		  mobile
		  aadhar_token
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
		const { errors, data } = await lastValueFrom(
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
			const { page, limit } = request;
			let mappedResponse = data?.[`${tableName}`];
			if (limit) {
				const totalCount =
					data?.[`${tableName}_aggregate`]?.aggregate?.count;
				const totalPages = limit ? Math.ceil(totalCount / limit) : 0;
				obj = {
					...obj,
					limit: `${limit}`,
					totalCount: `${totalCount}`,
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
			success: 'true',
			data: { ...obj },
		};
	}

	async getOne(id: number, tableName: string, onlyFields: any = []) {
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

	async create(
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

	async update(
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

	async delete(tableName: string, item: Object, onlyFields: any = []) {
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

	async q(
		tableName: string,
		item: Object,
		onlyFields: any = [],
		update: boolean = false,
		fields: any = [],
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.mutation(
								tableName,
								item,
								onlyFields,
								update,
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

	async qM(tableName: string, item: any, fields: any, onlyFields: any = []) {
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
		//check
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
		result = result || (errors ? errors[0] : {});
		if (response === 'data') {
			return result;
		} else {
			return { [tableName]: result };
		}
	};
}
