import { Injectable } from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { UploadFileService } from 'src/upload-file/upload-file.service';
import { S3Service } from '../services/s3/s3.service';
import { EnumService } from '../enum/enum.service';

@Injectable()
export class CampCoreService {
	constructor(
		private userService: UserService,
		private hasuraService: HasuraService,
		private enumService: EnumService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private uploadFileService: UploadFileService,
		private s3Service: S3Service,
	) {}

	public async getStatuswiseCount(
		filterQuery: any,
		filterQueryArray: any,
		status: any,
		variables: any,
	) {
		let query = `query MyQuery {
        all:camps_aggregate(where:${filterQuery}) {
          aggregate {
            count
          }
        },
		camp_initiated: camps_aggregate(where:{ _and: [${filterQueryArray.join(
			',',
		)}, {group:{_or: [
            {status: {_nin: ${JSON.stringify(
				status.filter((item) => item != 'camp_initiated'),
			)}}},
            { status: { _is_null: true } }
         ]}}] } ) {
            aggregate {
                count
            }},
        ${status
			.filter((item) => item != 'camp_initiated')
			.map(
				(
					item,
				) => `${item}:camps_aggregate(where:{ _and: [${filterQueryArray.join(
					',',
				)},{group: {status: {_eq: ${item}}}}] } ) {
                    aggregate {
                        count
                    }}`,
			)}
    }`;

		const response = await this.hasuraServiceFromServices.getData({
			query,
			variables,
		});

		return response;
	}

	public async list(body: any) {
		let filterQueryArray = [];

		const status_array = this.enumService
			.getEnumValue('GROUPS_STATUS')
			.data.map((item) => item.value);

		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;
		let program_id = body?.program_id || 1;
		let academic_year_id = body?.academic_year_id || 1;
		let parent_ip_id = body?.parent_ip_id;
		let status = body?.status;

		filterQueryArray.push(
			`{group_users: {member_type: {_eq: "owner"}, group: {program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}},user:{program_faciltators:{parent_ip:{_eq:"${parent_ip_id}"}}}}}`,
		);

		if (body?.district && body?.district.length > 0) {
			filterQueryArray.push(
				`{properties:{district:{_in: ${JSON.stringify(
					body?.district,
				)}}}}`,
			);
		}

		if (body?.block && body?.block.length > 0) {
			filterQueryArray.push(
				`{properties:{block:{_in: ${JSON.stringify(body?.block)}}}}`,
			);
		}

		if (body.facilitator && body.facilitator.length > 0) {
			filterQueryArray.push(
				`{group_users: {user:{id:{_in: ${JSON.stringify(
					body.facilitator,
				)}}}}}`,
			);
		}

		if (!body?.status || body?.status === '' || body?.status == 'all') {
			filterQueryArray.push(
				`{group: {status: {_in: ${JSON.stringify(
					status_array.filter((item) => item != 'camp_initiated'),
				)}}}}`,
			);
		} else {
			filterQueryArray.push(`{group:{status:{_eq:"${status}"}}}`);
		}

		let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';

		let data = {
			query: `query MyQuery($limit: Int, $offset: Int) {
				camps_aggregate(where:${filterQuery}) {
				  aggregate {
					count
				  }
				}
				camps(limit: $limit, offset: $offset, where: ${filterQuery}) {
				  id
				  kit_received
					kit_was_sufficient
					kit_ratings
					kit_feedback
				  properties {
					district
					block
					state
					village
					landmark
					grampanchayat
					street
				  }
				  group {
					name
					status
				  }
				 faciltator:group_users(where: {member_type: {_eq: "owner"}}) {
					user {
					  faciltator_id: id
					  first_name
					  middle_name
					  last_name
					}
					
				  }
				  beneficiaries: group_users(where: {member_type: {_eq: "member"}, status: {_eq: "active"}}) {
					user {
						id
						first_name
						middle_name
						last_name
						mobile
						state
						district
						block
						village
						profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
							id
							name
							doument_type
							document_sub_type
							path
						}
					}
				}
				}
				
			  }
			  `,
			variables: {
				limit: limit,
				offset: offset,
			},
		};

		console.log('query-->>', data.query);
		const hasura_response = await this.hasuraServiceFromServices.getData(
			data,
		);

		const camps_data = hasura_response?.data?.camps;

		let camps = camps_data?.map((camp) => {
			camp.faciltator = camp?.faciltator?.[0];
			return camp;
		});

		const count = hasura_response?.data?.camps_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);
		if (camps) {
			return {
				camps,
				totalCount: count,
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			};
		} else {
			return {
				camps: [],
				totalCount: 0,
				limit: 0,
				currentPage: 0,
				totalPages: `0`,
			};
		}
	}

	public async getFacilitatorsForCamp(parent_ip_id: any) {
		let query = `
		query MyQuery {
			users(where: {program_faciltators: {parent_ip: {_eq: "${parent_ip_id}"}, status: {_in: ["selected_prerak", "selected_for_onboarding"]}}}) {
			  id
			  first_name
			  middle_name
			  last_name
			  district
			  block
			  state
			  camp_count: group_users_aggregate {
				aggregate {
				  count
				}
			  }
			  camp_learner_count: group_users {
				group {
				  group_users_aggregate(where: {member_type: {_eq: "member"}, status: {_eq: "active"}}) {
					aggregate {
					  count
					}
				  }
				}
			  }
			}
		  }
		  
		`;
		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		return hasura_response;
	}
	public async createCampUser(
		body: any,
		returnFields: any,
		req: any,
		res: any,
	) {
		let response = await this.hasuraService.q(
			'group_users',
			{
				...body,
			},
			[],
			false,
			[...returnFields],
		);

		return response;
	}

	public async updateCampUser(
		id: any,
		body: any,
		update_arr: any,
		returnFieldsgroupUsers: any,
		req: any,
		res: any,
	) {
		let response = await this.hasuraService.q(
			'group_users',
			{
				...body,
				id: id,
			},
			update_arr,
			true,
			[...returnFieldsgroupUsers],
		);

		return response;
	}

	public async updateCampStatus(
		id: any,
		body: any,
		update_arr: any,
		returnFieldsGroups: any,
		req: any,
		res: any,
	) {
		let response = await this.hasuraService.q(
			'groups',
			{
				...body,
				id: id,
			},
			update_arr,
			true,
			[...returnFieldsGroups],
		);

		return response;
	}
}
