import { Injectable } from '@nestjs/common';

import { UploadFileService } from 'src/upload-file/upload-file.service';
import { UserService } from 'src/user/user.service';
import { EnumService } from '../enum/enum.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { S3Service } from '../services/s3/s3.service';
const moment = require('moment');
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

	public returnFieldsconsents = [
		'id',
		'user_id',
		'document_id',
		'facilitator_id',
	];

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

	public async list(body: any, req: any) {
		let filterQueryArray = [];

		const status_array = this.enumService
			.getEnumValue('GROUPS_STATUS')
			.data.map((item) => item.value);

		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;
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
				 faciltator:group_users(where: {member_type: {_eq: "owner"},status: {_eq: "active"}}) {
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

	public async getFacilitatorsForCamp(
		parent_ip_id: any,
		limit: any,
		offset: any,
	) {
		let data = {
			query: `
			query MyQuery($limit: Int, $offset: Int){
				users_aggregate(where: {program_faciltators: {parent_ip: {_eq: "${parent_ip_id}"}, status: {_in: ["selected_prerak", "selected_for_onboarding"]}}}){
				  aggregate{
					count
				  }
				}
				users(limit: $limit, offset: $offset,where: {program_faciltators: {parent_ip: {_eq: "${parent_ip_id}"}, status: {_in: ["selected_prerak", "selected_for_onboarding"]}}}) {
				  id
				  first_name
				  middle_name
				  last_name
				  district
				  block
				  state
				  camp_count: group_users_aggregate(where: {status: {_eq: "active"}}) {
					aggregate {
					  count
					}
				  }
				  camp_learner_count: group_users(where: {status: {_eq: "active"}}) {
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

			`,
			variables: {
				limit: limit,
				offset: offset,
			},
		};

		const hasura_response = await this.hasuraServiceFromServices.getData(
			data,
		);

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

	public async updateCampGroup(
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

	public async updateConsentDetails(body) {
		let response = await this.hasuraService.q(
			'consents',
			{
				...body,
				id: body?.consent_id,
			},
			body?.update_arr,
			true,
			[
				...this.returnFieldsconsents,
				'id',
				'user_id',
				'document_id',
				'camp_id',
				'facilitator_id',
				'status',
			],
		);

		return response;
	}
	public async getCampSessions(id) {
		let data = {
			query: `query MyQuery {
				learning_lesson_plans_master(order_by:{ordering:asc}) {
				  ordering
				  id
				  session_tracks(where:{camp_id:{_eq:${id}}}) {
					id
					status
					camp_id
					learning_lesson_plan_id
					created_by
					updated_by
					created_at
					updated_at
					lesson_plan_complete_feedback
					lesson_plan_incomplete_feedback
				  }
				}
			}`,
		};
		const result = await this.hasuraServiceFromServices.getData(data);
		return result;
	}

	public async getCampDayActivity(id: any) {
		const dateString = moment().startOf('day').format();
		const endDate = moment().endOf('day').format();

		let query = `query MyQuery {
			camp_days_activities_tracker(where: {camp_id: {_eq:${id}}, start_date: {_gte:"${dateString}", _lte:"${endDate}"}}) {
			  id
			  camp_id
			  camp_day_happening
			  camp_day_not_happening_reason
			  created_by
			  misc_activities
			  mood
			  start_date
			  end_date
			  updated_by
			  updated_at

			}
		  }
		  `;

		return await this.hasuraServiceFromServices.getData({
			query: query,
		});
	}
}
