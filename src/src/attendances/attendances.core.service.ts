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
		let context = body.context || 'camp_days_activities_tracker';

		let query = `query MyQuery {
			attendance(where: {context:{_eq:${context}},context_id: {_eq:${id}}, date_time: {_gte:"${body?.start_date}", _lte:"${body?.end_date}"}}) {
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
		const { context, start_date, end_date, limit, page } = body || {};
		let pagination = '';
		let variables = {};
		let wherePagination = '';
		let attendanceAggreage = '';
		const filterWhere = [
			`context:{_eq:"${context || 'camp_days_activities_tracker'}"}`,
		];
		if (start_date && end_date) {
			filterWhere.push(
				`date_time: {_gte:"${start_date}", _lte:"${end_date}"}`,
			);
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

	// findAll(request: any) {
	// 	return this.hasuraService.getAll(
	// 		this.table,
	// 		this.returnFields,
	// 		request,
	// 	);
	// }

	// findOne(id: number) {
	// 	return this.hasuraService.getOne(+id, this.table, this.returnFields);
	// }

	// update(id: number, req: any) {
	// 	return this.hasuraService.update(
	// 		+id,
	// 		this.table,
	// 		req,
	// 		this.returnFields,
	// 	);
	// }
	getUserAttendanceList(body) {
		let context = body?.context || 'events';
		let context_id = body.context_id;
		const data = {
			query: `query MyQuery {
				users(where: {attendances: {context: {_eq: ${context}}, context_id: {_eq: ${context_id}}}}) {
				  id
				  first_name
				  middle_name
				  last_name
				  attendances(where: {context: {_eq: ${context}}, context_id: {_eq:${context_id}}}) {
					id
					status
					context
					context_id
				  }
				}
			  }`,
		};

		const result = this.hasuraServiceFromServices.getData(data);
		return result;
	}

	async getUserAttendancePresentList(user_id, context, context_id) {
		const query = `query MyQuery {
				attendance(where: {user_id: {_eq: ${user_id}}, context: {_eq: ${context}}, context_id: {_eq:${context_id}}, status: {_eq: "present"}}) {
					id
					status
					context
					context_id
				  }
			  }`;
		try {
			const result_response =
				await this.hasuraServiceFromServices.getData({ query });
			console.log('result_response', result_response);
			const data_list = result_response?.data?.attendance;
			//console.log('data_list cunt------>>>>>', data_list.length);
			//console.log('data_list------>>>>>', data_list);
			if (data_list) {
				return data_list;
			} else {
				return [];
			}
		} catch (error) {
			console.log('getUserAttendancePresentList:', error, error.stack);
			return [];
		}
	}
}
/*
SELECT
			users.*,
			(
				SELECT json_agg(attendance.*)
				FROM attendance
				WHERE events.context = attendance.context
				AND events.context_id = attendance.context_id
			) AS attendance_list,
			program_facilitators.*
		FROM
			events
	
		LEFT JOIN
			attendance
		ON
			events.context = attendance.context
			AND events.context_id = attendance.context_id
	
		LEFT JOIN
			users
		ON
			events.user_id = users.user_id
	
		LEFT JOIN
			attendances
		ON
			users.user_id = attendances.user_id
	
		LEFT JOIN
			program_facilitators
		ON
			users.program_id = program_facilitators.program_id
			AND users.academic_year_id = program_facilitators.academic_year_id;	
*/
