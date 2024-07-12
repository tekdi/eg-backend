import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { EnumService } from '../enum/enum.service';
import { CampService } from 'src/camp/camp.service';
const moment = require('moment');

@Injectable()
export class SessionsService {
	constructor(
		private userService: UserService,
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private enumService: EnumService,
		private campService: CampService,
	) {}

	async createSession(body: any, request: any, response: any) {
		const program_id = request.mw_program_id;
		const academic_year_id = request.mw_academic_year_id;
		const camp_id = body?.camp_id;
		// Step 1: Retrieve the camp details to check the camp_type
		let campQuery = `query GetCampType {
			camps(where: {id: {_eq: ${body?.camp_id}}}) {
					id
					type
			}
			learning_lesson_plans_master_by_pk(id: ${body.learning_lesson_plan_id}) {
				ordering
		}
	}`;

		const campRes = await this.hasuraServiceFromServices.getData({
			query: campQuery,
		});

		const campData = campRes?.data?.camps?.[0];
		const camp_type = campRes?.data?.camps?.[0]?.type;
		const session_number =
			campRes?.data?.learning_lesson_plans_master_by_pk.ordering;

		if (!campData || !session_number) {
			return response.status(404).json({
				success: false,
				message: `${
					!campData ? 'Camp' : !session_number ? 'Session number' : ''
				} not found`,
			});
		}

		// Step 2: If camp_type is "PCR", check the baseline assessment for all learners
		if (
			camp_type === 'pcr' &&
			(!body.warning || body.warning != 'accepted')
		) {
			let assessment_name = '';

			if (session_number >= 1 && session_number <= 6) {
				assessment_name = `base-line`;
			} else if (session_number >= 7 && session_number <= 13) {
				assessment_name = `fa1`;
			} else if (session_number >= 14 && session_number <= 19) {
				assessment_name = `fa2`;
			} else if (session_number >= 20) {
				assessment_name = `end-line`;
			}

			const data = await this.checkPcr(
				program_id,
				camp_id,
				assessment_name,
			);
			if (!data.success) {
				return response.status(data.status).json(data.response);
			}
		} else if (!body.warning || body.warning != 'accepted') {
			let assessment_name = `end-line`;
			const data = await this.checkPcr(
				program_id,
				camp_id,
				assessment_name,
			);
			if (!data.success) {
				return response.status(data.status).json(data.response);
			}
		}

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
			return response.status(200).json({
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

		let fillbale = [
			'learning_lesson_plan_id',
			'status',
			'camp_id',
			'lesson_plan_incomplete_feedback',
			'lesson_plan_complete_feedback',
			'created_by',
			'updated_by',
			'created_at',
			'updated_at',
		];
		let createSessionResponse = await this.hasuraService.q(
			'learning_sessions_tracker',
			{
				...body,
				updated_at: body?.updated_at || new Date().toISOString(),
				created_by: request?.mw_userid,
				updated_by: request?.mw_userid,
			},
			fillbale,
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
		const program_id = request.mw_program_id;
		const academic_year_id = request.mw_academic_year_id;
		// Step 1: Retrieve session details
		let sessionQuery = `query GetSessionDetails {
			learning_lesson_plans_master(where:{session_tracks:{id:{_eq:${id}}}}) {
				id
					title
        ordering
				session_tracks(where:{id:{_eq:${id}}}){
					id
					camp_id
				}
					
			}
	}`;

		const sessionRes = await this.hasuraServiceFromServices.getData({
			query: sessionQuery,
		});

		const session_number =
			sessionRes?.data?.learning_lesson_plans_master?.[0]?.ordering;
		const camp_id =
			sessionRes?.data?.learning_lesson_plans_master?.[0]
				?.session_tracks?.[0]?.camp_id;

		const sessionData =
			sessionRes?.data?.learning_lesson_plans_master?.[0]
				?.session_tracks?.[0]?.id;

		if (!sessionData) {
			return response.status(404).json({
				success: false,
				message: 'Session not found',
			});
		}

		// Step 2: Validate learners' assessment completion based on session number
		let learnerQuery = '';
		let validationMessage = '';
		// Step 2: Retrieve the camp details to check the camp_type
		let campQuery = `query GetCampType {
				camps(where: {id: {_eq: ${camp_id}}}) {
						id
						type
				}
		}`;

		const campRes = await this.hasuraServiceFromServices.getData({
			query: campQuery,
		});

		const campData = campRes?.data?.camps?.[0];
		const camp_type = campData?.type;

		if (!campData) {
			return response.status(404).json({
				status: 404,
				success: false,
				message: 'Camp not found',
			});
		}

		if (
			camp_type === 'pcr' &&
			(!body.warning || body.warning != 'accepted')
		) {
			let assessment_name = '';

			if (session_number >= 1 && session_number <= 6) {
				assessment_name = `base-line`;
			} else if (session_number >= 7 && session_number <= 13) {
				assessment_name = `fa1`;
			} else if (session_number >= 14 && session_number <= 19) {
				assessment_name = `fa2`;
			} else if (session_number >= 20) {
				assessment_name = `end-line`;
			}

			const data = await this.checkPcr(
				program_id,
				camp_id,
				assessment_name,
			);
			if (!data.success) {
				return response.status(data.status).json(data.response);
			}
		} else if (!body.warning || body.warning != 'accepted') {
			let assessment_name = `end-line`;
			const data = await this.checkPcr(
				program_id,
				camp_id,
				assessment_name,
			);
			if (!data.success) {
				return response.status(data.status).json(data.response);
			}
		}

		//main code
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
					}
				}

				break;
		}
	}

	public async getSessionsListByCampId(id: any, request: any, response: any) {
		// Query to get the camp type
		let campTypeQuery = {
			query: `query GetCampType {
				camps_by_pk(id: ${id}) {
						type
				}
		}`,
		};

		// Fetch the camp type
		const campTypeRes = await this.hasuraServiceFromServices.getData(
			campTypeQuery,
		);
		// Check if the camp type query returned valid data
		if (!campTypeRes?.data || !campTypeRes.data.camps_by_pk) {
			return response.status(422).json({
				success: false,
				message: 'Error retrieving camp type data',
				data: [],
			});
		}
		const type = campTypeRes?.data?.camps_by_pk?.type;

		let query = `query MyQuery {
			learning_lesson_plans_master(order_by: {ordering: asc}, where: {type: {_eq: "${type}"}}){
			  ordering
			  id
							title
							cms_lesson_id
							academic_year_id
							program_id
							type
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
	public jsonParse(str, returnObject = {}) {
		try {
			return JSON.parse(str);
		} catch (e) {
			return returnObject;
		}
	}

	public checkAssessmentData(data, assessmentType) {
		if (!data) return {};

		const { learners, subjects_name } = data;
		let result = {};

		if (!learners || !subjects_name) return result;

		learners.forEach((learner) => {
			const subjectIds = this.jsonParse(
				learner?.program_beneficiaries?.[0]?.subjects,
				[],
			);

			if (!subjectIds || subjectIds.length === 0) return;

			const eligibleSubjects = subjects_name.filter((subject) =>
				subjectIds.includes(`${subject?.id}`),
			);

			if (eligibleSubjects.length === 0) return;

			const eligibleSubjectIds = eligibleSubjects.map(
				(subject) => `${subject.id}`,
			);

			let learnerAssessment = {
				id: learner.id,
				assessment_type: [],
			};

			if (
				!assessmentType ||
				[
					'base_line',
					'base-line',
					'fa1',
					'fa2',
					'end_line',
					'end-line',
				].includes(assessmentType)
			) {
				// Check base_line
				if (
					!learner.pcr_scores?.some(
						(score) => score.baseline_learning_level,
					)
				) {
					result['base_line'] = result['base_line'] || [];
					result['base_line'].push(learner);
					learnerAssessment.assessment_type.push('base_line');
				}
			}

			if (
				!assessmentType ||
				['fa1', 'fa2', 'end_line', 'end-line'].includes(assessmentType)
			) {
				// Check fa1
				const fa1Assessments = learner.pcr_formative_assesments?.filter(
					(assessment) =>
						assessment.formative_assessment_first_learning_level &&
						eligibleSubjectIds.includes(
							`${assessment?.subject_id}`,
						),
				);

				if (
					!fa1Assessments ||
					fa1Assessments?.length < eligibleSubjects.length
				) {
					result['fa1'] = result['fa1'] || [];
					result['fa1'].push(learner);
					learnerAssessment.assessment_type.push('fa1');
				}
			}

			if (
				!assessmentType ||
				['fa2', 'end_line', 'end-line'].includes(assessmentType)
			) {
				// Check fa2
				const fa2Assessments = learner.pcr_formative_assesments?.filter(
					(assessment) =>
						assessment.formative_assessment_second_learning_level &&
						eligibleSubjectIds.includes(
							`${assessment?.subject_id}`,
						),
				);
				if (
					!fa2Assessments ||
					fa2Assessments?.length < eligibleSubjects.length
				) {
					result['fa2'] = result['fa2'] || [];
					result['fa2'].push(learner);
					learnerAssessment.assessment_type.push('fa2');
				}
			}

			if (
				!assessmentType ||
				['end_line', 'end-line'].includes(assessmentType)
			) {
				// Check end_line
				if (
					!learner.pcr_scores?.some(
						(score) => score.endline_learning_level,
					)
				) {
					result['end_line'] = result['end_line'] || [];
					result['end_line'].push(learner);
					learnerAssessment.assessment_type.push('end_line');
				}
			}

			if (learnerAssessment.assessment_type.length > 0) {
				result['learners'] = result['learners'] || [];
				result['learners'].push(learnerAssessment);
			}
		});

		return result;
	}

	public async checkPcr(
		program_id: number,
		camp_id: number,
		assessment_name: string,
	) {
		let validationMessage;

		// base-line fa1 fa2 end-line
		const { data } = await this.campService.getLearnersBaseline(
			{ camp_id, assessment_type: assessment_name },
			{ mw_program_id: program_id },
			{},
		);

		const learnersWithoutAssessment = this.checkAssessmentData(
			data,
			assessment_name,
		);

		if (learnersWithoutAssessment?.['base_line']?.length > 0) {
			validationMessage =
				'CAMP_SESSION_INCOMPLETE_UNTIL_ALL_BASELINE_ASSESSMENTS_COMPLETED';
		}
		if (learnersWithoutAssessment?.['fa1']?.length > 0) {
			validationMessage =
				'CAMP_SESSION_INCOMPLETE_UNTIL_ALL_RAPID_ASSESSMENTS_1_COMPLETED';
		}
		if (learnersWithoutAssessment?.['fa2']?.length > 0) {
			validationMessage =
				'CAMP_SESSION_INCOMPLETE_UNTIL_ALL_RAPID_ASSESSMENTS_2_COMPLETED';
		}
		if (learnersWithoutAssessment?.['end_line']?.length > 0) {
			validationMessage =
				'CAMP_SESSION_INCOMPLETE_UNTIL_ALL_ENDLINE_ASSESSMENTS_COMPLETED';
		}

		if (validationMessage) {
			return {
				success: false,
				status: 422,
				response: {
					assessment_name,
					success: false,
					key: 'ID',
					message: validationMessage,
					data: learnersWithoutAssessment?.['learners'] || {},
				},
			};
		}

		return { success: true };
	}
}
