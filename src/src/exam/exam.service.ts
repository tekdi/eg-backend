import { Injectable } from '@nestjs/common';

import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
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
}
