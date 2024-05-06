import { Injectable } from '@nestjs/common';

import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
//import * as pdfjsLib from 'pdfjs-dist';
const parse = require('pdf-parse');

@Injectable()
export class ExamService {
	constructor(private hasuraServiceFromServices: HasuraServiceFromServices) {}

	async getExamSchedule(id: any, resp: any, request: any) {
		let program_id = request?.mw_program_id;
		let academic_year_id = request?.mw_academic_year_id;
		let data;
		data = {
			query: `query MyQuery {
                subjects(where: {board_id: {_eq: ${id}}}) {
                  name
                  id
                  board
                  board_id
                  is_theory
                  is_practical
				  events(where: {context: {_eq: "subjects"}, program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}}){
                    context
                    context_id
                    program_id
                    academic_year_id
                    id
                    start_date
                    end_date
                    type
                    status
                  }
                }
              }
                 
              `,
		};
		let response = await this.hasuraServiceFromServices.queryWithVariable(
			data,
		);

		let newQdata = response?.data?.data?.subjects;

		if (newQdata?.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.status(422).json({
				success: true,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	async createExamSchedule(body, response, request) {
		let result = [];
		let user_id = request?.mw_userid;
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let validation_query;
		let validation_data;
		let validation_response;
		let event_id;

		for (const schedule of body) {
			validation_data = {
				query: `
					query MyQuery {
						events(where: {context: {_eq: "subjects"}, academic_year_id: {_eq:${academic_year_id}}, context_id: {_eq:${schedule?.subject_id}}, program_id: {_eq:${program_id}}, type: {_eq:"${schedule?.type}"}}) {
							id
						}
					}
				`,
			};

			validation_response =
				await this.hasuraServiceFromServices.queryWithVariable(
					validation_data,
				);

			event_id = validation_response?.data?.data?.events?.[0]?.id;

			let query;

			if (event_id) {
				query = `
					mutation UpdateEvent {
						update_events_by_pk(pk_columns: {id: ${event_id}}, _set: {
				`;
			} else {
				query = `
					mutation CreateEvent {
						insert_events_one(object: {
							context: "subjects",
							program_id: ${program_id},
							academic_year_id: ${academic_year_id},
							created_by:${user_id},
							updated_by:${user_id},
				`;
			}

			Object.keys(schedule).forEach((key) => {
				if (schedule[key] !== null && schedule[key] !== '') {
					if (key === 'subject_id') {
						query += `context_id: ${schedule[key]}, `;
					} else if (key === 'exam_date') {
						// Assuming exam_date is in the format 'YYYY-MM-DD'
						query += `start_date: "${schedule[key]}", `;
						query += `end_date: "${schedule[key]}", `;
					} else if (Array.isArray(schedule[key])) {
						query += `${key}: "${JSON.stringify(schedule[key])}", `;
					} else {
						query += `${key}: "${schedule[key]}", `;
					}
				}
			});

			query = query.slice(0, -2); // Remove trailing comma and space

			query += `
						}) {
							id
							context_id
							context
							start_date
							end_date
							program_id
							academic_year_id
							type
							status
							created_by
							updated_by
						}
					}
				`;

			let data = {
				query: `${query}`,
				variables: {},
			};

			const query_response =
				await this.hasuraServiceFromServices.queryWithVariable(data);
			const updatedOrCreatedEvent =
				query_response?.data?.data?.[
					event_id ? 'update_events_by_pk' : 'insert_events_one'
				];

			if (updatedOrCreatedEvent) {
				result.push(updatedOrCreatedEvent);
			}
		}

		if (result.length > 0) {
			return response.status(200).json({
				success: true,
				message: 'Exam schedule created or updated successfully!',
				data: result,
			});
		} else {
			return response.status(500).json({
				success: false,
				message: 'Unable to create or update exam schedule!',
				data: {},
			});
		}
	}

	async editExamSchedule(body, response, request) {
		let result = [];
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;

		// Loop through each input in the bulk request
		for (let input of body) {
			let event_validation_data;
			let event_validation_response;
			let event_id;

			let attendance_validation_data;
			let attendance_validation_response;
			let attendance_id;

			// Validate event
			event_validation_data = {
				query: `
					query MyQuery {
						events(where: {context: {_eq: "subjects"}, academic_year_id: {_eq:${academic_year_id}}, context_id: {_eq:${input?.subject_id}}, program_id: {_eq:${program_id}}, type: {_eq:"${input?.type}"}}) {
							id
						}
					}
				`,
			};

			event_validation_response =
				await this.hasuraServiceFromServices.queryWithVariable(
					event_validation_data,
				);

			event_id = event_validation_response?.data?.data?.events?.[0]?.id;

			// Validate attendance
			if (event_id) {
				attendance_validation_data = {
					query: `
						query MyQuery2 {
							attendance(where: {context_id: {_eq:${event_id}}}){
							id
							}
						}
					`,
				};

				attendance_validation_response =
					await this.hasuraServiceFromServices.queryWithVariable(
						attendance_validation_data,
					);

				attendance_id =
					attendance_validation_response?.data?.data?.attendance?.[0]
						?.id;
			}

			// Push result to the response array
			if (!event_id) {
				result.push({
					subject_id: input?.subject_id,
					is_editable: false,
					type: input?.type,
					message: 'Event doesnt exists',
				});
			} else if (attendance_id) {
				result.push({
					subject_id: input?.subject_id,
					is_editable: false,
					type: input?.type,
					message: 'Attendance for event subject exists',
				});
			} else {
				result.push({
					subject_id: input?.subject_id,
					is_editable: true,
					type: input?.type,
					message: 'Event can be edited',
				});
			}
		}

		// Return the response array
		return response.status(200).json(result);
	}

	async getExamScheduleByBoardIdAndDate(
		id: any,
		date: string,
		resp: any,
		request: any,
	) {
		let board_id = id;

		let data;
		let subject_id_data;

		subject_id_data = {
			query: `query MyQuery2 {
					subjects(where: {board_id: {_eq:${board_id}}}){
					  id
					}
				  }`,
		};

		let subject_id_response =
			await this.hasuraServiceFromServices.queryWithVariable(
				subject_id_data,
			);

		let subject_id_result = subject_id_response?.data?.data?.subjects;

		const ids = subject_id_result?.map((subject) => subject.id);

		data = {
			query: `query MyQuery {
				subjects(where: {board_id: {_eq:${board_id}}, events: {context_id: {_in:[${ids}]}, context: {_eq: "subjects"}, start_date: {_eq: "${date}"}}}) {
				  name
				  id
				  board
				  board_id
				  is_theory
				  is_practical
				  events(where: {start_date: {_eq: "${date}"}}) {
					context
					context_id
					program_id
					academic_year_id
					id
					start_date
					end_date
					type
					status
				  }
				}
			  }
			  `,
		};

		let response = await this.hasuraServiceFromServices.queryWithVariable(
			data,
		);

		let newQdata = response?.data?.data?.subjects;

		if (newQdata?.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.status(422).json({
				success: true,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	async getLearnerAttendanceBySubjectId(bodyArray, request, response) {
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let user_id = request?.mw_userid;
		let resultArray = [];

		for (let input of bodyArray) {
			let subject_data;
			let result;
			let learner_ids = [];
			let program_beneficiaries = [];
			let attendance_data;
			let attendance_result;
			let users_data;

			subject_data = {
				query: `query MyQuery2 {
					program_beneficiaries(where: {facilitator_id: {_eq:${user_id}}, academic_year_id:{_eq:${academic_year_id}}, program_id:{_eq:${program_id}}, subjects: {_ilike: "%${input?.subject_id}%"}}) {
						user_id
					}
				  }
			  `,
			};

			result = await this.hasuraServiceFromServices.queryWithVariable(
				subject_data,
			);

			program_beneficiaries = result?.data?.data?.program_beneficiaries;

			learner_ids = program_beneficiaries.map(
				(beneficiary) => beneficiary.user_id,
			);

			attendance_data = {
				query: `query MyQuery {
					users(where: {id: {_in: [${learner_ids}]}}) {
						user_id: id
						first_name
						middle_name
						last_name
						attendances(where: {context: {_eq: "events"}, context_id: {_eq:${input?.event_id}}}) {
							id
							context
							context_id
							status
						}
					}
				  }`,
			};

			attendance_result =
				await this.hasuraServiceFromServices.queryWithVariable(
					attendance_data,
				);

			users_data = attendance_result?.data?.data?.users;

			resultArray.push({
				subject_id: input?.subject_id,
				subject_name: input?.subject_name,
				event_id: input?.event_id,
				type: input?.type,
				data: users_data,
			});
		}

		return response.status(200).json({
			success: true,
			message: 'Retrieved data successfully!',
			data: resultArray,
		});
	}

	async addExamScheduleAttendance(body, response, request) {
		let result = [];
		let user_id = request?.mw_userid;
		let validation_data;
		let validation_response;
		let attendance_id;

		for (const schedule of body) {
			validation_data = {
				query: `
				query MyQuery {
					attendance(where: {context: {_eq: "events"}, context_id: {_eq:${schedule?.event_id}}, user_id: {_eq:${schedule?.user_id}}}){
					  id
					}
				  }
				  `,
			};

			validation_response =
				await this.hasuraServiceFromServices.queryWithVariable(
					validation_data,
				);

			attendance_id =
				validation_response?.data?.data?.attendance?.[0]?.id;

			let query;

			if (attendance_id) {
				query = `
					mutation UpdateAttendance {
						update_attendance_by_pk(pk_columns: {id: ${attendance_id}}, _set: {
				`;
			} else {
				query = `
					mutation CreateAttendance {
						insert_attendance_one(object: {
							context: "events",
							created_by:${user_id},
							updated_by:${user_id},
				`;
			}

			Object.keys(schedule).forEach((key) => {
				if (schedule[key] !== null && schedule[key] !== '') {
					if (key === 'event_id') {
						query += `context_id: ${schedule[key]}, `;
					} else if (key === 'attendance_date') {
						// Assuming date_time is in the format 'YYYY-MM-DD:HH-MM-SS'
						query += `date_time: "${schedule[key]}", `;
					} else if (Array.isArray(schedule[key])) {
						query += `${key}: "${JSON.stringify(schedule[key])}", `;
					} else {
						query += `${key}: "${schedule[key]}", `;
					}
				}
			});

			query = query.slice(0, -2); // Remove trailing comma and space

			query += `
						}) {
							id
							context_id
							context
							status
							date_time
							user_id
							created_by
							updated_by
							
						}
					}
				`;

			let data = {
				query: `${query}`,
				variables: {},
			};

			const query_response =
				await this.hasuraServiceFromServices.queryWithVariable(data);
			const updatedOrCreatedEvent =
				query_response?.data?.data?.[
					attendance_id
						? 'update_attendance_by_pk'
						: 'insert_attendance_one'
				];

			if (updatedOrCreatedEvent) {
				result.push(updatedOrCreatedEvent);
			}
		}

		if (result.length > 0) {
			return response.status(200).json({
				success: true,
				message: 'Attendance created or updated successfully!',
				data: result,
			});
		} else {
			return response.status(500).json({
				success: false,
				message: 'Unable to create or update attendance!',
				data: {},
			});
		}
	}

	async getAttendanceReport(body: any, request: any, response: any) {
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let user_id = request?.mw_userid;
		let data;
		let result;
		let validation_response;
		let sql;

		data = {
			query: `query MyQuery {
				program_beneficiaries(where: {academic_year_id: {_eq:${academic_year_id}}, status:{_eq:"registered_in_camp"},program_id: {_eq:${program_id}}, facilitator_id: {_eq:${user_id}}}){
				  id
				  subjects
				}
			  }
			  `,
		};

		validation_response =
			await this.hasuraServiceFromServices.queryWithVariable(data);

		result = validation_response?.data?.data?.program_beneficiaries;

		const subjects = new Set();
		result.forEach((beneficiary) => {
			if (beneficiary?.subjects !== null) {
				JSON.parse(beneficiary?.subjects).forEach((subject) => {
					// Parse subject as integer before adding to the set
					subjects.add(parseInt(subject));
				});
			}
		});

		// Convert set to array for easier manipulation
		const uniqueSubjects = Array.from(subjects);
		// Map each element in uniqueSubjects array to a string with parentheses

		const formattedSubjects = `(${uniqueSubjects.join(',')})`;
		console.log(formattedSubjects); // Output: (10,19)

		sql = ` SELECT 
		events.id AS eventid,
		context_id,
		context,
		start_date,
		su.id,
		su.name,
		bo.id AS boardid,
		bo.name AS boardname,
		(SELECT COUNT(id) FROM program_beneficiaries WHERE facilitator_id = ${user_id} AND EXISTS (SELECT 1 FROM json_array_elements_text(subjects::json) AS item WHERE item::text = CAST(su.id AS TEXT))) AS total_students,
		(SELECT COUNT(id) FROM attendance att WHERE att.context_id = events.id AND att.context = 'events' AND att.status = 'present') AS present,
		(SELECT COUNT(id) FROM attendance att WHERE att.context_id = events.id AND att.context = 'events' AND att.status = 'absent') AS absent
	FROM 
		events
	LEFT JOIN  
		subjects su ON events.context_id = su.id
	LEFT JOIN  
		boards bo ON su.board_id = bo.id
	WHERE 
		context = 'subjects' AND context_id IN ${formattedSubjects} AND academic_year_id = ${academic_year_id} AND events.program_id = ${program_id};`;

		const attendance_report_data = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		)?.result;

		if (attendance_report_data == undefined) {
			return response.status(404).json({
				status: false,
				message: 'Data not found',
				data: [],
			});
		}

		let attendance_report_result =
			this.hasuraServiceFromServices.getFormattedData(
				attendance_report_data,
			);

		// Calculate not_marked for each instance
		attendance_report_result.forEach((report) => {
			report.not_marked = (
				parseInt(report.total_students) -
				(parseInt(report.present) + parseInt(report.absent))
			)?.toString();
		});

		return response.status(200).json({
			status: true,
			message: 'Data retrieved successfully',
			data: attendance_report_result,
		});
	}

	async createExamResult(body: any, request: any, response: any) {
		let program_id = request?.mw_program_id;
		let academic_year_id = request?.mw_academic_year_id;
		let examResultBody = body;

		let examResult = await this.ExamResultUpsert(
			examResultBody,
			academic_year_id,
			program_id,
		);

		if (examResult) {
			return response.status(200).json({
				data: examResult,
			});
		} else {
			return response.status(500).json({
				data: [],
			});
		}
	}

	async ExamResultUpsert(examResultBody, academic_year_id, program_id) {
		let data;
		let vquery;
		let vresponse;
		let result: { subject?: any[] } = {}; // Define the type of result
		let subjects_response = [];

		let mutation_query;
		let set_update;
		let exam_result_subjects_id;
		let exam_result_response;

		const { subject, ...exam_result } = examResultBody;

		// Check for existing exam result data

		vquery = `
			query MyQuery {
				exam_results(where: {user_id: {_eq: ${exam_result?.user_id}}, academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}, board_id: {_eq:${exam_result?.board_id}}}){
					id
				}
			}
		`;

		vresponse = await this.hasuraServiceFromServices.getData({
			query: vquery,
		});

		let exam_result_id = vresponse?.data?.exam_results?.[0]?.id;

		set_update = exam_result_id ? 1 : 0; // Set the update flag

		if (set_update == 1) {
			mutation_query = `
				mutation UpdateExamResults {
					update_exam_results_by_pk(pk_columns: {id: ${exam_result_id}}, _set: {
			`;
		} else {
			mutation_query = `
				mutation CreateExamResults {
					insert_exam_results_one(object: {
						program_id: ${program_id},
						academic_year_id: ${academic_year_id},
			`;
		}

		Object.keys(exam_result).forEach((key) => {
			if (exam_result[key] !== null && exam_result[key] !== '') {
				if (
					key == 'user_id' ||
					key == 'board_id' ||
					key == 'total_marks'
				) {
					mutation_query += `${key}: ${exam_result[key]}, `;
				} else {
					mutation_query += `${key}: "${exam_result[key]}", `;
				}
			}
		});

		mutation_query = mutation_query.slice(0, -2); // Remove trailing comma and space

		mutation_query += `
					}) {
						id
						user_id
						board_id
						enrollment
						candidate
						father
						mother
						dob
						course_class
						exam_year
						total_marks
						final_result
					}
				}
			`;

		data = {
			query: `${mutation_query}`,
			variables: {},
		};

		const query_response =
			await this.hasuraServiceFromServices.queryWithVariable(data);

		exam_result_id =
			set_update == 1
				? query_response?.data?.data?.update_exam_results_by_pk?.id
				: query_response?.data?.data?.insert_exam_results_one?.id;

		exam_result_response =
			set_update == 1
				? query_response?.data?.data?.update_exam_results_by_pk
				: query_response?.data?.data?.insert_exam_results_one;

		result = { ...exam_result_response }; // Set exam result data directly

		// Process subjects array

		if (subject?.length > 0) {
			result.subject = []; // Initialize subject array

			for (const schedule of subject) {
				data = {
					query: `
						query MyQuery {
							exam_subject_results(where: {exam_results_id: {_eq:${exam_result_id}}, subject_code: {_eq:"${schedule?.subject_code}"}}) {
								id
							}
						}
					`,
				};

				vresponse =
					await this.hasuraServiceFromServices.queryWithVariable(
						data,
					);

				exam_result_subjects_id =
					vresponse?.data?.data?.exam_subject_results?.[0]?.id;

				let query;

				if (exam_result_subjects_id) {
					query = `
						mutation UpdateExamResultSubjects {
							update_exam_subject_results_by_pk(pk_columns: {id: ${exam_result_subjects_id}}, _set: {
					`;
				} else {
					query = `
						mutation CreateExamResultSubjects {
							insert_exam_subject_results_one(object: {
								exam_results_id:${exam_result_id},
					`;
				}

				Object.keys(schedule).forEach((key) => {
					if (schedule[key] !== null && schedule[key] !== '') {
						if (key == 'max_marks') {
							query += `${key}: ${schedule[key]}, `;
						} else {
							query += `${key}: "${schedule[key]}", `;
						}
					}
				});

				query = query.slice(0, -2); // Remove trailing comma and space

				query += `
							}) {
								id
								exam_results_id
								subject_name
								subject_code
								max_marks
								theory
								practical
								tma_internal_sessional
								total
								result
							}
						}
					`;

				data = {
					query: `${query}`,
					variables: {},
				};

				const query_response =
					await this.hasuraServiceFromServices.queryWithVariable(
						data,
					);

				const updatedOrCreatedEvent =
					query_response?.data?.data?.[
						exam_result_subjects_id
							? 'update_exam_subject_results_by_pk'
							: 'insert_exam_subject_results_one'
					];

				if (updatedOrCreatedEvent) {
					result.subject.push(updatedOrCreatedEvent); // Push subject data directly to result
				}
			}
		}

		return result; // Return the modified result object
	}

	async getCampRegisteredLearners(body, request, response) {
		let user_id = request?.mw_userid;
		let data;
		let validation_response;
		let result;
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let role = request?.mw_roles;
		let filter;
		let searchQuery = '';
		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;

		if (body.search && body.search !== '') {
			let first_name = body.search.split(' ')[0];
			let last_name = body.search.split(' ')[1] || '';

			if (last_name?.length > 0) {
				searchQuery = `
							first_name: { _ilike: "%${first_name}%" }, 
							last_name: { _ilike: "%${last_name}%" }
					`;
			} else {
				searchQuery = `first_name: { _ilike: "%${first_name}%" }`;
			}
		}
		if (role?.includes('facilitator')) {
			filter = `{facilitator_id: {_eq: ${user_id}}, program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}, status: {_eq: "registered_in_camp"}}`;
		} else if (role?.includes('staff')) {
			//get organisation_id of the IP
			let query = {
				query: `query MyQuery {
					program_users(where: {academic_year_id: {_eq: 1}, program_id: {_eq: 1}, user_id: {_eq:${user_id}}}) {
					  organisation_id
					}
				  }
				  `,
			};

			validation_response =
				await this.hasuraServiceFromServices.queryWithVariable(query);

			let parent_ip =
				validation_response?.data?.data?.program_users?.[0]
					?.organisation_id;

			filter = `{program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}, status: {_eq: "registered_in_camp"},facilitator_user:{program_faciltators:{parent_ip:{_eq:"${parent_ip}"},program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}}}},user:{${searchQuery}}}
				`;
		}

		data = {
			query: `query MyQuery($limit:Int, $offset:Int) {
				program_beneficiaries_aggregate(where: ${filter}) {
					aggregate{
						count
					}
				}
				program_beneficiaries(where: ${filter}, limit: $limit,
					offset: $offset) {
				  facilitator_id
				  facilitator_user{
					id
					first_name
					last_name
					middle_name
				   
				  }
				  enrollment_number
				  beneficiary_user:user {
				   beneficiary_id: id
					first_name
					middle_name
					last_name
					exam_results(where: {program_id: {_eq: 1}, academic_year_id: {_eq: 1}}) {
					  id
					  board_id
					  program_id
					  academic_year_id
					  board_id
					  enrollment
					  candidate
					  father
					  mother
					  dob
					  course_class
					  exam_year
					  total_marks
					  final_result
					  document_id
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

		validation_response =
			await this.hasuraServiceFromServices.queryWithVariable(data);

		result = validation_response?.data?.data?.program_beneficiaries;
		const count =
			validation_response?.data?.data?.program_beneficiaries_aggregate
				?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);

		if (result?.length > 0) {
			return response.status(200).json({
				message: 'Data Retrieved Successfully',
				limit,
				currentPage: page,
				totalPages,
				data: result,
			});
		} else if (result?.length == 0) {
			return response.status(404).json({
				message: 'Data Not found',
				data: [],
			});
		} else {
			return response.status(500).json({
				message: 'Error getting data',
				data: [],
			});
		}
	}

	async getExamResult(body: any, request: any, response: any) {
		let data;
		let validation_response;
		let program_id = request?.mw_program_id;
		let academic_year_id = request?.mw_academic_year_id;

		data = {
			query: `query MyQuery {
				exam_results(where: {user_id: {_eq:${body?.user_id}}, program_id: {_eq:${program_id}}, board_id:{_eq:${body?.board_id}},academic_year_id: {_eq:${academic_year_id}}, enrollment: {_eq: "${body?.enrollment}"}}) {
				  id
				  program_id
				  academic_year_id
				  board_id
				  enrollment
				  candidate
				  father
				  mother
				  dob
				  course_class
				  exam_year
				  total_marks
				  final_result
				  exam_subject_results {
					id
					exam_results_id
					subject_name
					subject_code
					max_marks
					theory
					practical
					tma_internal_sessional
					total
					result
				  }
				  document_id
				  document {
					id
					context
					context_id
					path
				  }
				}
			  }
			  
			  `,
		};

		validation_response =
			await this.hasuraServiceFromServices.queryWithVariable(data);

		let newQdata = validation_response?.data?.data?.exam_results;

		if (newQdata?.length > 0) {
			return response.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return response.status(404).json({
				success: true,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	public async resultUpload(file: any, response: any, request: any) {
		//first check validations for all inputs
		try {
			const result = await this.extractResultFromPDF(file);
			return response.status(200).json({
				success: true,
				extracted_data: {
					result,
				},
				pdf_data: result?.data,
			});
		} catch (error) {
			console.log('error', error);
			return response
				.status(200)
				.json({ success: false, error: 'Failed to read PDF file' });
		}
	}

	//extract result from pdf functions
	async extractResultFromPDF(file: any): Promise<any> {
		//console.log('file', file);
		const data = await parse(file.buffer); // Read data from uploaded PDF file buffer
		//console.log('data', data);
		//extract data from pdf
		const pdfText = data.text; // Assuming data is the provided object containing the extracted PDF text
		//console.log('pdfText', pdfText);

		//version 1 rsos pdf file
		let result = await this.parseResults_V1(pdfText);
		//console.log('result', result);
		if (result == null) {
			//version 2 rsos pdf file
			result = await this.parseResults_V2(pdfText);
			//console.log('result', result);
		}

		return result;
	}

	//version 1 extract for RSOS Board
	async parseResults_V1(content: string): Promise<any> {
		const regex =
			/Enrollment : (\d+)\s+Name of Candidate : (.+?)\s+Father's Name : (.+?)\s+Mother's Name : (.+?)\s+Date of Birth : (.+?)\s+Class : (\d+th)\s+/;
		const match = content.match(regex);

		if (match) {
			const [, enrollment, candidate, father, mother, dob, classGrade] =
				match;
			const subjects = await this.extractSubjects_V1(content);
			const totalResult = await this.extractTotalResult_V1(content);
			return {
				enrollment,
				candidate,
				father,
				mother,
				dob,
				classGrade,
				subjects,
				totalResult,
				data: content,
			};
		}

		return null;
	}

	async extractSubjects_V1(content: string): Promise<any[]> {
		const subjectRegex =
			/(\d+)\s+([\w\s]+?)\((\d+)\)\s+(\d+)\s+([\dAB]+)\s+([\dAB-]+)\s+([\dAB]+)\s+([\dAB]+)\s+([PSYCRWHX]+)/g;
		let match;
		const subjects = [];

		while ((match = subjectRegex.exec(content)) !== null) {
			const [
				,
				no,
				name,
				code,
				maxMarks,
				theory,
				practical,
				sessional,
				total,
				result,
			] = match;
			subjects.push({
				no,
				name,
				code,
				maxMarks,
				theory,
				practical,
				sessional,
				total,
				result,
			});
		}

		return subjects;
	}

	async extractTotalResult_V1(content: string): Promise<any> {
		const regex = /TOTAL(\d+)RESULT(\w+)/;
		const match = content.match(regex);

		if (match) {
			const totalMarks = match[1];
			const finalResult = match[2];
			return { totalMarks, finalResult };
		}

		return null;
	}

	//version 2 extract for RSOS Board
	async parseResults_V2(content: string): Promise<any> {
		const personalDetailsRegex =
			/Enrollment : (\d+)\nName of Candidate : (.+?)\nFather's Name : (.+?)\nMother's Name : (.+?)\nDate of Birth : (.+?)\nClass : (\d+)/;
		/*const subjectRegex =
			/(\d+)([A-Za-z ]+) \((\d+)\)(\d{2,3})([A-Z]+|[\d-]*)([\d-]*)([\d-]*)([\d-]+)([A-Z]+)/g;*/
		//working
		/*const subjectRegex =
			/(\d+)([A-Za-z ]+ \(\d+\))(\d+)([A-Z]+|[\d-]+) ?([\d-]*) ?(\d+)(\d+)([A-Z]+)/g;*/
		/*const subjectRegex =
			/(\d+)([A-Za-z ]+ \(\d+\))(\d+)([A-Z]+|[\d-]*)([\d-]*)([\d-]*)([\d-]+)([A-Z]+)/g;*/
		//new
		const subjectRegex =
			/(\d+)([A-Za-z ]+(?:\n\(Additional\))? \(\d+\))(\d{3})([A-Z]+|[\d-]*)([\d-]*)([\d-]*)([\d]+)([A-Z]+)/g;

		const totalRegex = /TOTAL(\d+)RESULT(\w+)/;

		const personalMatch = content.match(personalDetailsRegex);
		const totalMatch = content.match(totalRegex);

		if (personalMatch) {
			const personalDetails = personalMatch
				? {
						enrollment: personalMatch[1],
						name: personalMatch[2],
						fatherName: personalMatch[3],
						motherName: personalMatch[4],
						dob: personalMatch[5],
						class: personalMatch[6],
				  }
				: {};

			const subjects = [];

			let match: any;
			while ((match = subjectRegex.exec(content)) !== null) {
				subjects.push({
					subjectNo: match[1],
					subjectNameCode: match[2].trim().replace(/ \(\d+\)/, ''),
					subjectCode: match[2].match(/\((\d+)\)/)[1],
					maxMarks: match[3],
					marksTheory: match[4] === '-' ? '0' : match[4],
					marksPractical: match[5] === '-' ? '0' : match[5],
					marksSessional: match[6] === '-' ? '0' : match[6],
					totalMarks: match[7],
					result: match[8],
				});
			}

			const totalResult = totalMatch
				? {
						totalMarks: totalMatch[1],
						result: totalMatch[2],
				  }
				: {};

			return {
				personalDetails,
				subjects,
				totalResult,
			};
		}

		return null;
	}
	async getExamResultReport(body: any, request: any, response: any) {
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let user_id = request?.mw_userid;
		let data;
		let result;
		let validation_response;
		let sql;

		data = {
			query: `query MyQuery {
				program_beneficiaries(where: {facilitator_id: {_eq:${user_id}}, academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}, status: {_eq: "registered_in_camp"}}){
				  id
				  user_id
				}
			  }
			  		  
			  
			  `,
		};

		validation_response =
			await this.hasuraServiceFromServices.queryWithVariable(data);

		result = validation_response?.data?.data?.program_beneficiaries;

		let total_learners = result?.length;

		const ids = result.map((beneficiary) => beneficiary?.user_id);

		// Map each element in ids array to a string with parentheses

		const formattedIds = `(${ids.join(',')})`;
		console.log(formattedIds); // Output: (10,19)

		sql = ` SELECT 
    
		SUM(CASE WHEN er.final_result = '10th_passed' THEN 1 ELSE 0 END) AS "tenth_passed",
		SUM(CASE WHEN er.final_result = 'pragati_syc' THEN 1 ELSE 0 END) AS pragati_syc
		
	FROM 
		program_beneficiaries pb
	LEFT JOIN 
		exam_results er ON pb.user_id = er.user_id 
	WHERE 
		pb.facilitator_id = ${user_id} 
		AND pb.academic_year_id = ${academic_year_id}
		AND pb.program_id = ${program_id}
		AND er.user_id IN ${formattedIds}
	
		
	`;

		const result_report_data = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		)?.result;

		if (result_report_data == undefined) {
			return response.status(404).json({
				status: false,
				message: 'Data not found',
				data: [],
			});
		}

		let result_report_result =
			this.hasuraServiceFromServices.getFormattedData(result_report_data);

		// Calculate not_marked for each instance
		result_report_result.forEach((report) => {
			report.total_learners = total_learners?.toString();
			if (report.tenth_passed == 'NULL') {
				report.tenth_passed = 0;
			}
			if (report.pragati_syc == 'NULL') {
				report.pragati_syc = 0;
			}
			report.not_uploaded = (
				parseInt(total_learners) -
				(parseInt(
					report.tenth_passed !== 'NULL' ? report.tenth_passed : 0,
				) +
					parseInt(
						report.pragati_syc !== 'NULL' ? report.pragati_syc : 0,
					))
			)?.toString();
		});

		return response.status(200).json({
			status: true,
			message: 'Data retrieved successfully',
			data: result_report_result,
		});
	}

	async getExamResultSubject(body: any, request: any, response: any) {
		let data;
		let validation_response;
		let program_id = request?.mw_program_id;
		let academic_year_id = request?.mw_academic_year_id;
		let user_id = request?.mw_userid;
		let learner_id = body.learner_id;
		//validation to check user_id is under the  same program as learner_id or not
		data = {
			query: `query MyQuery6 {
				users(where: {id: {_eq: ${user_id}}}){
				 program_users(where: {academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq: ${program_id}}, user_id: {_eq: ${user_id}}}) {
					organisation_id
					academic_year_id
					program_id
					user_id
				} 
				}
			}
			  `,
		};
		validation_response =
			await this.hasuraServiceFromServices.queryWithVariable(data);

		const organisation_id =
			validation_response?.data?.data?.users?.[0]?.program_users?.[0]
				.organisation_id || '';
		data = {
			query: `query MyQuery {
				program_beneficiaries(where: {user_id:{_eq:${learner_id}},facilitator_user: {program_faciltators: {parent_ip: {_eq: "${organisation_id}"}, academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq: ${program_id}}}}}) {
					user_id
				}
				
			  }
			  `,
		};
		validation_response =
			await this.hasuraServiceFromServices.queryWithVariable(data);
		const user =
			validation_response?.data?.data?.program_beneficiaries?.[0]
				?.user_id;
		if (!user) {
			return response.status(422).json({
				success: true,
				message: 'Invalid IP!',
				data: {},
			});
		}
		//take subject id
		data = {
			query: `query MyQuery {
      program_beneficiaries(where: {user_id: {_eq: ${learner_id}}, academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq: ${program_id}}}) {
        subjects
				enrollment_number
				enrollment_first_name
    enrollment_last_name
    enrollment_middle_name
		enrollment_dob
    user{
      first_name
      middle_name
      last_name
			core_beneficiaries{
        father_first_name
        father_middle_name
        father_last_name
        mother_first_name
        mother_middle_name
        mother_last_name
      }
    }
      }
    } 
      `,
		};

		try {
			validation_response =
				await this.hasuraServiceFromServices.queryWithVariable(data);

			let newQdata =
				validation_response?.data?.data?.program_beneficiaries;

			let subjectsArray = [];

			if (newQdata) {
				for (newQdata of newQdata) {
					try {
						const subjects = JSON.parse(newQdata.subjects);
						//get subject data
						const subjectQuery = {
							query: `query SubjectQuery {
              subjects(where: {id: {_in: [${subjects}]}}) {
                id
                            name
                            is_theory
                            is_practical
                            board_id
                            boardById {
                                id
                                name
                            }
              }
            }`,
						};

						const subjectResponse =
							await this.hasuraServiceFromServices.queryWithVariable(
								subjectQuery,
							);

						if (subjectResponse?.data?.data?.subjects) {
							const learnerSubjectData =
								subjectResponse.data.data.subjects.map(
									(subject) => {
										return {
											...subject,
										};
									},
								);
							subjectsArray.push(...learnerSubjectData);
						} else {
							console.warn(
								'Failed to fetch subject details:',
								subjectResponse,
							);
						}
					} catch (error) {
						console.error(
							'Error parsing subjects JSON or fetching subject details:',
							error,
						);
					}
				}
			}

			if (subjectsArray.length > 0) {
				return response.status(200).json({
					success: true,
					message: 'Data found successfully!',
					data: {
						learner_id,
						enrollment_number: newQdata?.enrollment_number,
						enrollment_first_name: newQdata?.enrollment_first_name,
						enrollment_last_name: newQdata?.enrollment_last_name,
						enrollment_middle_name:
							newQdata?.enrollment_middle_name,
						enrollment_dob: newQdata?.enrollment_dob,
						user: newQdata?.user,

						subjectsArray,
					},
				});
			} else {
				return response.status(404).json({
					success: true,
					message: 'Data Not Found',
					data: {},
				});
			}
		} catch (error) {
			console.error('Error fetching exam result subjects:', error);
			return response.status(500).json({
				success: false,
				message: 'Internal Server Error',
			});
		}
	}
}
