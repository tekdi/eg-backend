import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class AttendancesCoreService {
	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}
	public async create(body: any, returnFields: any, req: any, res: any) {
		let response = await this.hasuraService.q(
			'attendance',
			{
				...body,
			},
			[],
			false,
			[...returnFields],
		);

		return response;
	}

	public async update(
		body: any,
		id: any,
		update_array: any,
		returnFields: any,
		req: any,
		res: any,
	) {
		let response = await this.hasuraService.q(
			'attendance',
			{
				...body,
				id: id,
			},
			update_array,
			true,
			[...returnFields],
		);

		return response;
	}

	public async getByCampId(id: any, body: any, req: any, res: any) {
		let query = `query MyQuery {
			attendance(where: {context:{_eq:"camps"},context_id: {_eq:${id}}, date_time: {_gte:"${body?.start_date}", _lte:"${body?.end_date}"}}) {
			  id
			  lat
			  long
			  context_id
			  context
			  date_time
			  status
			  fa_is_processed
			  fa_similarity_percentage
			  user_id
			  created_by
			  updated_by
			  user{
				id
				first_name
				middle_name
				last_name
			  }
			}
		  }
		  `;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		return hasura_response;
	}

	public async getAttendances(body: any, req: any, res: any) {
		const {
			context,
			start_date,
			end_date,
			limit,
			page,
			user_id,
			status,
			confidence_level,
			search,
			camp_id,
		} = body || {};
		let pagination = '';
		let variables = {};
		let wherePagination = '';
		let attendanceAggreage = '';
		const filterWhere = [`context:{_eq:"${context || 'camps'}"}`];
		if (start_date && end_date) {
			filterWhere.push(
				`date_time: {_gte:"${start_date}", _lte:"${end_date}"}`,
			);
		}

		if (status) {
			filterWhere.push(`status:{_eq:${status}}`);
		}

		if (user_id) {
			filterWhere.push(`user_id:{_eq:${user_id}}`);
		}

		if (search && search !== '') {
			let first_name = search.split(' ')[0];
			let last_name = search.split(' ')[1] || '';

			if (last_name?.length > 0) {
				filterWhere.push(
					`user: {_and: [{first_name: {_ilike: "%${first_name}%"}}, {last_name: {_ilike: "%${last_name}%"}}]}`,
				);
			} else {
				filterWhere.push(
					`user: {_or: [{first_name: {_ilike: "%${first_name}%"}}, {last_name: {_ilike: "%${first_name}%"}}]}`,
				);
			}
		}

		if (confidence_level == 'yes') {
			filterWhere.push(`fa_similarity_percentage: {_is_null: false}`);
		} else if (confidence_level == 'no') {
			filterWhere.push(`fa_similarity_percentage: {_is_null: true}`);
		}

		if (camp_id) {
			filterWhere.push(`context_id:{_eq:${camp_id}}`);
		}

		if (limit && page) {
			const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);

			let temPage = isNaN(page) ? 1 : parseInt(page);
			let offset = temPage > 1 ? limit * (temPage - 1) : 0;
			wherePagination = 'limit: $limit, offset:$offset';
			pagination = `($limit:Int, $offset:Int)`;
			variables = {
				limit: limit,
				offset: offset,
			};
			attendanceAggreage = `attendance_aggregate(where: {${filterWhere.join(
				',',
			)}}){
			aggregate {
				count
			}}
			`;
		}
		const data = {
			query: `query MyQuery${pagination} {
				${attendanceAggreage}	
				attendance(${wherePagination}, where: {${filterWhere.join(',')}}) {
			  id
			  lat
			  long
			  context_id
			  context
			  date_time
			  status
			  fa_is_processed
			  fa_similarity_percentage
			  user_id
			  created_by
			  updated_by
			  photo_1
			  photo_2
			  user{
				id
				first_name
				middle_name
				last_name
				profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
					id
					name
					doument_type
					document_sub_type
					path
				}
				profile_photo_2: documents(where: {document_sub_type: {_eq: "profile_photo_2"}}) {
					id
					name
					doument_type
					document_sub_type
					path
				}
				profile_photo_3: documents(where: {document_sub_type: {_eq: "profile_photo_3"}}) {
					id
					name
					doument_type
					document_sub_type
					path
				}
			  }
			}
		  }
		  `,
			variables,
		};

		const hasura_response = await this.hasuraServiceFromServices.getData(
			data,
		);

		const count =
			hasura_response?.data?.attendance_aggregate?.aggregate?.count;
		const result = hasura_response?.data?.attendance;

		const totalPages = Math.ceil(count / limit);
		if (limit && page) {
			const returnData = {
				totalCount: count,
				data: result || [],
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			};
			return returnData;
		} else {
			return hasura_response;
		}
	}

	public async CampListAttendance(id) {
		let query = `query MyQuery {
			camps(where: {user: {program_faciltators: {parent_ip: {_eq: "${id}"}}}}){
			  camp_id:id,
			  camp_name:group{
				name
			  }
			   group_users(where:{member_type:{_eq:"owner"},status:{_eq:"active"}}){
				prerak_data:user{
				  id
				  first_name,
				  middle_name,
				  last_name
				}
			  }
			}
		  }
		  `;

		const camps_data = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		return camps_data;
	}
}
