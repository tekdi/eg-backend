import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';
import { stat } from 'fs';

@Injectable()
export class GeolocationService {
	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
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
			query: `
			query SearchAddress {
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
				}
			}`,
		};

		return await this.hasuraService.postData(data);
	}

	async getStates() {
		let data = {
			query: `
			query MyQuery {
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

		return await this.hasuraService.postData(data);
	}

	async getDistricts(state: string) {
		let data = {
			query: `
			query MyQuery {
				address_aggregate(
					distinct_on: [district_name],
					where: {
						state_name: {_eq: "${state}"}
					}
				) {
					aggregate {
						count
					}
				}

				address(
					distinct_on: [district_name],
					where: {
						state_name: {_eq: "${state}"}
					}
				) {
					district_cd
					district_name
				}
			}`,
		};

		return await this.hasuraService.postData(data);
	}

	async getBlocks(district: string) {
		let data = {
			query: `
			query MyQuery {
				address_aggregate(
					distinct_on: [block_name],
					where: {
						district_name: {_eq: "${district}"}
					}
				) {
					aggregate {
						count
					}
				}

				address(
					distinct_on: [block_name],
					where: {
						district_name: {_eq: "${district}"}
					}
				) {
					block_name
				}
			}`,
		};

		return await this.hasuraService.postData(data);
	}

	async getBlocksFromDistricts(body: any, resp: any) {
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
				message: 'Blocks found success!',
				data: response?.data?.address,
			});
		} else {
			return resp.status(200).send({
				success: false,
				status: 'Not Found',
				message: 'Blocks Not Found',
				data: {},
			});
		}
	}

	async getVillages(block: string, req: any) {
		let { state, district, grampanchayat } = req.query;
		let filter_query;

		if (grampanchayat == 'null') {
			filter_query = `where: {district_name: {_eq: ${district}}, block_name: {_eq:${block}}, state_name: {_eq:${state}}}`;
		} else {
			filter_query = `where: {district_name: {_eq: ${district}}, block_name: {_eq:${block}}, grampanchayat_name: {_eq:"${grampanchayat}"}, state_name: {_eq:${state}}}`;
		}
		let data = {
			query: `query MyQuery {
				address_aggregate(distinct_on: [village_ward_name],${filter_query}) {
				  aggregate {
					count
				  }
				}
				address(distinct_on: [village_ward_name],${filter_query}) {
				  village_ward_name
				}
			  }
			  `,
		};

		return await this.hasuraService.postData(data);
	}
}
