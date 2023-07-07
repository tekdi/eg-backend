import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';

@Injectable()
export class GeolocationService {
	public url = process.env.HASURA_BASE_URL;

	constructor(
		private readonly httpService: HttpService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}

	public async findAll(tableName: String, filters: Object = {}) {
		let query = '';
		if (filters) {
			Object.keys(filters).forEach((e) => {
				if (filters[e] && filters[e] != '') {
					query += `${e}:{_eq:"${filters[e]}"}`;
				}
			});
		}

		let data = {
			query: `query SearchAttendance {
        ${tableName}_aggregate(where:{${query}}) {
          aggregate {
            count
          }
        }
        ${tableName}(where:{${query}}) {
          id
          state_name
          state_cd
          district_name
          district_cd
          block_name
          grampanchayat_name
          village_ward_name
          udise_block_code
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

	async states() {
		let data = {
			query: `query MyQuery {
        address_aggregate(distinct_on: [state_name]) {
          aggregate {
            count
          }
        }
        address(distinct_on: [state_name]) {
          state_name
          state_cd
        }
      }`,
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

	async districts(state: string) {
		let data = {
			query: `query MyQuery {
        address_aggregate(distinct_on: [district_name], where: {state_name: {_eq: "${state}"}}) {
          aggregate {
            count
          }
        }
        address(distinct_on: [district_name], where: {state_name: {_eq: "${state}"}}) {
          district_cd
          district_name
        }
      }`,
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

	async multipleblocks(body: any, resp: any) {
		let data = {
			query: `query MyQuery {
				address(distinct_on: [block_name], where: {district_name: {_in: ${JSON.stringify(
					body?.districts,
				)}}}) {
				  block_name
				  district_name
				}
			  }`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		if (response?.data?.address && response?.data?.address?.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Districts found success!',
				data: response?.data?.address,
			});
		} else {
			return resp.status(200).send({
				success: false,
				status: 'Not Found',
				message: 'Districts Not Found',
				data: {},
			});
		}
	}

	async blocks(district: string) {
		let data = {
			query: `query MyQuery {
        address_aggregate(distinct_on: [block_name], where: {district_name: {_eq: "${district}"}}) {
          aggregate {
            count
          }
        }
        address(distinct_on: [block_name], where: {district_name: {_eq: "${district}"}}) {
          block_name
        }
      }`,
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

	async villages(block: string) {
		let data = {
			query: `query MyQuery {
        address_aggregate(distinct_on: [village_ward_name], where: {block_name: {_eq: "${block}"}}) {
          aggregate {
            count
          }
        }
        address(distinct_on: [village_ward_name], where: {block_name: {_eq: "${block}"}}) {
          village_ward_name
        }
      }`,
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
}
