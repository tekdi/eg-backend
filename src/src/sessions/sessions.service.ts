import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
const moment = require('moment');

@Injectable()
export class SessionsService {
	constructor(
		private userService: UserService,
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}

	async createSession(body: any, request: any, response: any) {
		//validation to check if the data is already present in the
		let validation_query = `query MyQuery {
            learning_sessions_tracker(where: {learning_lesson_plan_id: {_eq:${body?.learning_lesson_plan_id}}, camp_id: {_eq:${body?.camp_id}}}){
                learning_lesson_plan_id
                camp_id
            }
          }
          `;

		const res = await this.hasuraServiceFromServices.getData({
			query: validation_query,
		});

		const learning_session_data = res?.data?.learning_sessions_tracker;

		if (learning_session_data.length > 0) {
			return response.json({
				status: 200,
				success: true,
				message: 'Successfully retrieved learning session',
				data: {
					learning_lesson_plan_id:
						learning_session_data?.[0]?.learning_lesson_plan_id,
					camp_id: learning_session_data?.[0]?.camp_id,
				},
			});
		}

		let createSessionResponse = await this.hasuraService.q(
			'learning_sessions_tracker',
			{
				...body,
				created_by: request?.mw_userid,
				updated_by: request?.mw_userid,
				status: 'incomplete',
			},
			[],
			false,
			['id', 'learning_lesson_plan_id', 'camp_id'],
		);

		if (createSessionResponse?.learning_sessions_tracker?.id) {
			return response.json({
				status: 200,
				success: true,
				message: 'Successfully create learning session',
				data: {
					learning_lesson_plan_id:
						createSessionResponse?.learning_sessions_tracker
							?.learning_lesson_plan_id,
					camp_id:
						createSessionResponse?.learning_sessions_tracker
							?.camp_id,
				},
			});
		}
	}

	async updateSession(id: any, body: any, request: any, response: any) {
		console.log('here');
		switch (body?.edit_session_type) {
			case 'edit_incomplete_session': {
				if (body?.session_feedback == '' || !body?.session_feedback) {
					return response.json({
						status: 400,
						message: 'Please enter a valid request',
						success: false,
						data: {},
					});
				}

				let update_body = {
					...body,
					updated_by: request?.mw_userid,
					updated_at: new Date().toISOString(),
					lesson_plan_incomplete_feedback: body?.session_feedback,
					status: 'incomplete',
				};

				let update_response = await this.hasuraService.q(
					'learning_sessions_tracker',
					{
						...update_body,
						id: id,
					},
					[
						'status',
						'lesson_plan_incomplete_feedback',
						'updated_by',
						'updated_at',
					],
					true,
					[
						'id',
						'status',
						'lesson_plan_incomplete_feedback',
						'updated_at',
						'camp_id',
						'learning_lesson_plan_id',
					],
				);

				if (update_response?.learning_sessions_tracker?.id) {
					return response.json({
						status: 200,
						message: 'Successfully updated data',
						success: true,
						data: {
							learning_lesson_plan_id:
								update_response?.learning_sessions_tracker
									?.learning_lesson_plan_id,
							camp_id:
								update_response?.learning_sessions_tracker
									?.camp_id,
						},
					});
				}

				break;
			}
			case 'edit_complete_session':
				{
					if (
						body?.session_feedback == '' ||
						!body?.session_feedback
					) {
						return response.json({
							status: 400,
							message: 'Please enter a valid request',
							success: false,
							data: {},
						});
					}

					let update_body = {
						...body,
						updated_by: request?.mw_userid,
						updated_at: new Date().toISOString(),
						lesson_plan_complete_feedback: body?.session_feedback,
						status: 'complete',
					};
					let update_response = await this.hasuraService.q(
						'learning_sessions_tracker',
						{
							...update_body,
							id: id,
						},
						[
							'status',
							'lesson_plan_complete_feedback',
							'updated_by',
							'updated_at',
						],
						true,
						[
							'id',
							'status',
							'lesson_plan_complete_feedback',
							'updated_at',
							'camp_id',
							'learning_lesson_plan_id',
						],
					);

					if (update_response?.learning_sessions_tracker?.id) {
						return response.json({
							status: 200,
							message: 'Successfully updated data',
							success: true,
							data: {
								learning_lesson_plan_id:
									update_response?.learning_sessions_tracker
										?.learning_lesson_plan_id,
								camp_id:
									update_response?.learning_sessions_tracker
										?.camp_id,
							},
						});
					} else {
					}
				}

				break;
		}
	}

	public async getSessionsListByCampId(id: any, request: any, response: any) {
		console.log("-----------------");
		
		let query = `query MyQuery {
            learning_lesson_plans_master(order_by: {ordering: asc}){
              ordering
              id
							title
							cms_lesson_id
							academic_year_id
							program_id
              session_tracks(where:{camp_id:{_eq:${id}}}){
								id
                learning_lesson_plan_id
                lesson_plan_complete_feedback
                lesson_plan_incomplete_feedback
                created_at
                updated_at
								camp_id
								status
								created_by
								updated_by
              }
            }
          }
          
          `;
		  console.log( "====================",query);
		  

		const res = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		if (res?.data) {
			return response.json({
				status: 200,
				success: true,
				message: 'Successfully retrieved data',
				data: res?.data,
			});
		} else {
			return response.json({
				status: 500,
				success: false,
				message: 'Error retrieving data',
				data: [],
			});
		}
	}

	public async getDetailData(body) {
		let whereArr = [];

		if (body.id) {
			whereArr = [...whereArr, `{id:{_eq:${body?.id}}}`];
		}

		if (body.ordering) {
			whereArr = [...whereArr, `{ordering:{_eq:${body?.ordering}}}`];
		}

		let query = `query MyQuery {
			learning_lesson_plans_master(where: { _and: [${whereArr.join(',')}] }) {
				ordering
				id
				title
				cms_lesson_id
				academic_year_id
				program_id
				session_tracks(where: {camp_id: {_eq:${body?.camp_id}}}) {
					id
					learning_lesson_plan_id
					lesson_plan_complete_feedback
					lesson_plan_incomplete_feedback
					created_at
					updated_at
					camp_id
					status
					created_by
					updated_by
				}
			}
		}`;

		return await this.hasuraServiceFromServices.getData({ query });
	}

	public async getSessionDetailsById(
		id: any,
		bodyData: any,
		request: any,
		response: any,
	) {
		const { id: sid, ...body } = bodyData || {};
		const result = await this.getDetailData({
			...body,
			id: id,
		});
		const currentData =
			result?.data?.learning_lesson_plans_master?.[0] || {};
		let data = [currentData];

		if (!currentData?.ordering) {
			data = [];
		} else if (currentData?.ordering === 1) {
			const resultN = await this.getDetailData({
				...body,
				ordering: 2,
			});

			const dataN = resultN.data?.learning_lesson_plans_master?.[0];
			data = [...data, dataN];
		} else if (currentData?.ordering > 1) {
			const resultP = await this.getDetailData({
				...body,
				ordering: currentData?.ordering - 1,
			});
			const dataP = resultP.data?.learning_lesson_plans_master?.[0];
			const sessionData = dataP?.session_tracks?.[0];
			if (
				(sessionData.status === 'complete' &&
					sessionData.updated_at &&
					moment(sessionData.updated_at).format('YYYY-MM-DD') ===
						moment().format('YYYY-MM-DD')) ||
				sessionData.status === 'incomplete'
			) {
				data = [dataP, ...data];
			} else {
				const resultP = await this.getDetailData({
					...body,
					ordering: currentData?.ordering + 1,
				});
				const dataP = resultP.data?.learning_lesson_plans_master?.[0];
				data = [...data, dataP];
			}
		}

		if (result?.data) {
			return response.json({
				status: 200,
				success: true,
				message: 'Successfully retrieved data',
				data: data,
			});
		} else {
			return response.json({
				status: 500,
				success: false,
				message: 'Error retrieving data',
				data: [],
			});
		}
	}

	public async getSessionDetailsByIdGetOne(
		id: any,
		bodyData: any,
		request: any,
		response: any,
	) {
		const { id: sid, ...body } = bodyData || {};
		const result = await this.getDetailData({
			...body,
			id: id,
		});
		const currentData =
			result?.data?.learning_lesson_plans_master?.[0] || {};
		if (result?.data) {
			return response.json({
				status: 200,
				success: true,
				message: 'Successfully retrieved data',
				data: currentData,
			});
		} else {
			return response.json({
				status: 500,
				success: false,
				message: 'Error retrieving data',
				data: {},
			});
		}
	}
}
