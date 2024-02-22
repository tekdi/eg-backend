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

		if (body?.state && body?.state.length > 0) {
			filterQueryArray.push(
				`{properties:{state:{_in: ${JSON.stringify(body?.state)}}}}`,
			);
		}

		if (body?.district && body?.district.length > 0) {
			filterQueryArray.push(
				`{properties:{district:{_in: ${JSON.stringify(
					body?.district,
				)}}}}`,
			);
		}

		if (body?.state && body?.state.length > 0) {
			filterQueryArray.push(
				`{properties:{state:{_in: ${JSON.stringify(body?.state)}}}}`,
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
		body: any,
		parent_ip_id: any,
		limit: any,
		offset: any,
		req: any,
	) {
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;
		let filterQueryArray = [];

		let searchQuery = '';
		if (body.search && body.search !== '') {
			let first_name = body.search.split(' ')[0];
			let last_name = body.search.split(' ')[1] || '';
			if (last_name?.length > 0) {
				filterQueryArray.push(`{_and: [
				{first_name: { _ilike: "%${first_name}%" }},
				{ last_name: { _ilike: "%${last_name}%" } } 
				 ]} `);
			} else {
				filterQueryArray.push(
					`{_or:[{first_name: { _ilike: "%${first_name}%" }}, {last_name: { _ilike: "%${first_name}%" }}]}`,
				);
			}
		}

		if (body?.district && body?.district.length > 0) {
			filterQueryArray.push(
				`{district:{_in: ${JSON.stringify(body?.district)}}}`,
			);
		}

		if (body?.block && body?.block.length > 0) {
			filterQueryArray.push(
				`{block:{_in: ${JSON.stringify(body?.block)}}}`,
			);
		}

		let filterQuery = '_and: [' + filterQueryArray.join(',') + ']';

		let data = {
			query: `
				query MyQuery {
					users_aggregate(
						where: {${filterQuery},
							program_faciltators: {
								parent_ip: { _eq: "${parent_ip_id}" }, program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}}
								status: { _in: ["selected_prerak", "selected_for_onboarding"] }
							},
							references: { context: { _eq: "community.user" } }
						}
					) {
						aggregate {
							count
						}
					}
					users(
						where: {${filterQuery},
							program_faciltators: {
								parent_ip: { _eq: "${parent_ip_id}" }, program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}}
								status: { _in: ["selected_prerak", "selected_for_onboarding"] }
							},
							references: { context: { _eq: "community.user" } }
						}
					) {
						id
						first_name
						middle_name
						last_name
						district
						block
						state
						references {
							id
							context
							context_id
						}
						camp_count: group_users_aggregate(where: { status: { _eq: "active" } }) {
							aggregate {
								count
							}
						}
						camp_learner_count: group_users(where: { status: { _eq: "active" } }) {
							group {
								group_users_aggregate(where: { member_type: { _eq: "member" }, status: { _eq: "active" } }) {
									aggregate {
										count
									}
								}
							}
						}
					}
				}
			`,
		};

		const hasura_response = await this.hasuraServiceFromServices.getData(
			data,
		);

		const mappedUsersWithMinReferencesWithPagination =
			hasura_response?.data?.users
				.filter((user) => user.references.length >= 2)
				.map((user) => {
					return user;
				})
				.slice(offset, offset + limit);

		const mappedUsersWithMinReferences = hasura_response?.data?.users
			.filter((user) => user.references.length >= 2)
			.map((user) => {
				return user;
			});

		return {
			pagination_count: mappedUsersWithMinReferencesWithPagination,
			users: mappedUsersWithMinReferences,
		};
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

	public async getPrerakFilter_By_camp(body: any, resp: any, req: any) {
		try {
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

			let searchQuery = '';
			if (body.search && body.search !== '') {
				let first_name = body.search.split(' ')[0];
				let last_name = body.search.split(' ')[1] || '';

				if (last_name?.length > 0) {
					searchQuery = `_and:[{first_name: { _ilike: "%${first_name}%" }}, {last_name: { _ilike: "%${last_name}%" }}],`;
				} else {
					searchQuery = `_or:[{first_name: { _ilike: "%${first_name}%" }}, {last_name: { _ilike: "%${first_name}%" }}],`;
				}
			}

			filterQueryArray.push(
				`{group_users: {member_type: {_eq: "owner"}, group: {program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}},status: {_in: ${JSON.stringify(
					status_array.filter((item) => item != 'camp_initiated'),
				)}}},user:{program_faciltators:{parent_ip:{_eq:"${parent_ip_id}"}}}}}`,
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
					`{properties:{block:{_in: ${JSON.stringify(
						body?.block,
					)}}}}`,
				);
			}

			if (body.facilitator && body.facilitator.length > 0) {
				filterQueryArray.push(
					`{group_users: {user:{id:{_in: ${JSON.stringify(
						body.facilitator,
					)}}}}}`,
				);
			}

			let filterQuery = ' _and: [' + filterQueryArray.join(',') + '] ';

			const dataIds = {
				query: `query MyQuery($limit: Int, $offset: Int) {
					users_aggregate(where: {${searchQuery} ${filterQuery}}){
						aggregate{
							count
						}
				}
					users(where: {${searchQuery} ${filterQuery}},limit: $limit, offset: $offset) {
						id
						first_name
						last_name
					}
					}`,
				variables: {
					limit: limit,
					offset: offset,
				},
			};

			const result = await this.hasuraServiceFromServices.getData(
				dataIds,
			);
			const count = result?.data?.users_aggregate?.aggregate?.count;
			const totalPages = Math.ceil(count / limit);
			const returnData = {
				data: result,
				totalCount: count,
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			};
			return returnData;
		} catch (error) {
			return resp.status(500).json({
				message: 'BENEFICIARIES_LIST_ERROR',
				data: {},
			});
		}
	}

	//multiple users data update
	public async multipleUpdateCampUser(camp_id: any, body: any) {
		const idsArray = body?.learner_ids || [];

		const dataN = {
			query: `mutation MyMutation {
				update_group_users(where: {
					user_id: {_in: [${idsArray}]},
					member_type: {_eq: "member"},
					status: {_eq: "active"}
				}, _set: {
					updated_by: ${body?.updated_by},
					status: "inactive"
				}){
					affected_rows
				}
				activate:update_group_users(where: {
					user_id: {_in: [${idsArray}]},
					member_type: {_eq: "member"},
					group: {camp: {id:{_eq: ${camp_id}}}}
				}, _set: {
					updated_by: ${body?.updated_by},
					status: "active"
				}){
					affected_rows
					returning{
						group_id
						user_id
						camps{
							id
						}
					}
				}
			}`,
		};

		const response = await this.hasuraServiceFromServices.getData(dataN);
		return response?.data?.activate?.returning;
	}

	public async multipleCreateCampUser(
		body: any,
		returnFields: any,
		req: any,
		resp: any,
	) {
		let response = await this.hasuraService.qM(
			'insert_group_users',
			body,
			[],
			returnFields,
		);

		return { response };
	}

	public async multipleUpdateConsentDetails(body) {
		const data = {
			query: `mutation MyMutation2 {
				update_consents(where: {user_id: {_in: [${body?.learner_ids}]},camp_id:{_eq:${body?.old_camp_id}}}, _set: {status: "inactive"}){
					affected_rows
				}
			}`,
		};

		const response = await this.hasuraServiceFromServices.getData(data);

		return { response };
	}

	public async multipleUpdateCampGroup(
		camp_id: any,
		status: any = 'inactive',
	) {
		const data = {
			query: `mutation MyMutation {
				update_groups(where: {camp: {id: {_eq: ${camp_id}}}}, _set: {status: ${status}}){
					affected_rows
					returning{
						id 
					}
				}
			}`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		return { response };
	}

	async cehckOwnership({
		camp_id,
		user_id,
		program_id,
		academic_year_id,
		roles,
	}) {
		const member_type = 'owner';
		const status = 'active';
		let rolesQuery = `user_id: {_eq: ${user_id}}`;

		if (roles?.includes('program_owner')) {
			rolesQuery = ``;
		} else if (roles?.includes('staff')) {
			const redultIP = await this.userService.getIpRoleUserById(user_id, {
				program_id,
				academic_year_id,
			});
			const parent_ip = redultIP?.program_users?.[0]?.organisation_id;
			rolesQuery = `user:{program_faciltators:{
				academic_year_id: {_eq: ${academic_year_id}},
				program_id: {_eq: ${program_id}},
				parent_ip:{_eq:"${parent_ip}"}
			}}`;
		}
		let query = `query MyQuery {
			camps_aggregate(where: {
				id: {_eq: ${camp_id}},
				group: {
					academic_year_id: {_eq: ${academic_year_id}},
					program_id: {_eq: ${program_id}}
				},
				group_users: {
					member_type: {_eq: ${member_type}},
					status: {_eq: ${status}},
					${rolesQuery}
				}
			}) {
			  aggregate {
				count
			  }
			}
		}`;
		const response = await this.hasuraServiceFromServices.getData({
			query,
		});
		const newQdata = response?.data?.camps_aggregate?.aggregate?.count;

		return newQdata;
	}
}
