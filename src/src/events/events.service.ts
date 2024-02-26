import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { UserService } from 'src/user/user.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
const moment = require('moment');

@Injectable()
export class EventsService {
	public table = 'events';
	public fillable = [
		'context',
		'context_id',
		'created_by',
		'end_date',
		'end_time',
		'location',
		'location_type',
		'start_date',
		'start_time',
		'updated_by',
		'user_id',
	];

	public returnFields = [
		'id',
		'name',
		'context',
		'context_id',
		'created_by',
		'end_date',
		'end_time',
		'type',
		'location',
		'master_trainer',
		'location_type',
		'start_date',
		'start_time',
		'updated_by',
		'user_id',
		'reminders',
		'academic_year_id',
		'program_id',
		'params',
	];

	public attendanceReturnFields = [
		'id',
		'user_id',
		'context_id',
		'created_by',
		'context',
		'status',
		'lat',
		'long',
		'rsvp',
		'photo_1',
		'photo_2',
		'date_time',
		'updated_by',
	];

	constructor(
		private readonly httpService: HttpService,
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private readonly userService: UserService,
	) {}

	public async create(req, header, response) {
		let user_id_arr = req.attendees;
		let program_id = header?.mw_program_id;
		let academic_year_id = header?.mw_academic_year_id;
		const userDetail = await this.userService.ipUserInfo(header);
		let user_id = userDetail.data.id;
		//get do_id for event exam master data
		let eventExamData = {
			query: `query MyQuery {
				event_exams_master(where: {academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq: ${program_id}}, event_type: {_eq: "${req.type}"}}){
					id
					do_id
					event_type
				}
			}`,
		};

		const getExamId = await this.hasuraServiceFromServices.getData(
			eventExamData,
		);

		let doIds = getExamId?.data?.event_exams_master?.map(
			(exam) => exam.do_id,
		);
		let paramId = null;

		if (doIds && doIds.length > 0) {
			paramId = {
				attendance_type: 'day',
				do_id: doIds,
			};
		}
		let optional = {};
		if (req?.location && req?.location_type && req?.reminders) {
			optional['location'] = req.location;
			optional['reminders'] = JSON.stringify(req.reminders).replace(
				/"/g,
				'\\"',
			);
			optional['location_type'] = req.location_type;
		}

		let obj = {
			...(req?.context_id && { context_id: req?.context_id }),
			...(req?.context && { context: req?.context }),
			user_id: req.user_id ? req.user_id : user_id,
			name: req.name,
			master_trainer: req.master_trainer,
			created_by: user_id,
			end_date: req.end_date,
			end_time: req.end_time,
			start_date: req.start_date,
			start_time: req.start_time,
			updated_by: user_id,
			type: req.type,
			program_id: program_id,
			academic_year_id: academic_year_id,
			params: paramId, //set  params to null if no param id found in the database
			...optional, //set optional for remainders,location,location_type
		};
		// Check duration
		const daysDiff = moment(req.start_date).diff(
			moment(req.end_date),
			'days',
		);
		// Check if the number of attendees falls within the configured limits
		let errorMessage = '';
		const numAttendees = req.attendees.length;
		const minParticipants = 0; // Example: Minimum number of participants allowed
		const maxParticipants = 50; // Example: Maximum number of participants allowed

		if (numAttendees < minParticipants || numAttendees > maxParticipants) {
			errorMessage += `Number of attendees must be between ${minParticipants} and ${maxParticipants}`;
		} else if (daysDiff < 1 || daysDiff > 5) {
			errorMessage += 'Event duration must be between 1 and 5 days.';
		}
		if (errorMessage) {
			return response.status(200).send({
				success: false,
				message: errorMessage,
				data: {},
			});
		}

		//checking the event already created
		let data = {
			query: `query MyQuery {
			events_aggregate(where: {start_date: {_gte: "${req.start_date}", _lte: "${req.start_date}"}, end_date: {_gte: "${req.end_date}", _lte: "${req.end_date}"}, program_id: {_eq: ${program_id}}, academic_year_id: {_eq: ${academic_year_id}}, master_trainer: {_eq: "${req.master_trainer}"}, start_time: {_eq: "${req.start_time}"}, type: {_eq: "${req.type}"}, user_id: {_eq: ${user_id}}, name: {_eq: "${req.name}"}}) {
				aggregate {
					count
				}
			}
		}
		`,
		};

		const geteventData = await this.hasuraServiceFromServices.getData(data);

		const count = geteventData?.data?.events_aggregate?.aggregate?.count;
		//if event created show this message
		if (count > 0) {
			return response.status(200).send({
				success: true,
				message: 'Event Already created!',
				data: {},
			});
		} else {
			const eventResult = await this.hasuraService.createWithVariable(
				this.table,
				obj,
				this.returnFields,
				[],
				[{ key: 'params', type: 'json' }],
			);
			if (eventResult) {
				const promises = [];
				const query = [];
				for (const iterator of user_id_arr) {
					let obj = {
						user_id: iterator,
						created_by: user_id,
						context_id: eventResult.events.id,
						context: 'events',
						updated_by: user_id,
					};
					query.push(obj);
				}
				for (const iterator of query) {
					promises.push(
						this.hasuraService.create(
							'attendance',
							iterator,
							this.attendanceReturnFields,
						),
					);
				}
				const createAttendees = await Promise.all(promises);
				let mappedData = createAttendees.map((data) => data.attendance);
				if (createAttendees) {
					return response.status(200).send({
						success: true,
						message: 'Event created successfully!',
						data: {
							events: eventResult.events,
							attendance: mappedData,
						},
					});
				} else {
					return response.status(500).send({
						success: false,
						message: 'Unable to create Event!',
						data: {},
					});
				}
			} else {
				return response.status(500).send({
					success: false,
					message: 'Unable to create Event!',
					data: {},
				});
			}
		}
	}

	public async getEventsList(header, response) {
		let program_id = header?.mw_program_id;
		let academic_year_id = header?.mw_academic_year_id;
		const userDetail: any = await this.userService.ipUserInfo(header);
		if (!userDetail?.data?.id) {
			return response.status(400).send({
				success: false,
				message: 'Invalid User',
				data: {},
			});
		}
		const data = {
			query: `query MyQuery {
				users(where: {program_users: {organisation_id: {_eq: "${userDetail?.data?.program_users[0]?.organisation_id}"}}}){
				  id
				}
			  }`,
		};

		const getIps = await this.hasuraServiceFromServices.getData(data);

		if (!getIps?.data?.users) {
			return response.status(500).send({
				success: false,
				message: 'Hasura Error!',
			});
		}

		const allIpList = getIps?.data?.users.map((curr) => curr.id);
		let getQuery = {
			query: `query MyQuery {
				events(where: {
					_or: [
						{
							created_by: {
								_in: ${JSON.stringify(allIpList)}
							}
						},
						{
							created_by: {
								_is_null: true
							}
						}
					],
					_and: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}
				}}) {
					id
					location
					location_type
					name
					context
					context_id
					master_trainer
					reminders
					end_date
					end_time
					start_date
					start_time
					type
					created_by
					updated_by
					user_id
					attendances {
						context
						context_id
						created_by
						date_time
						id
						lat
						long
						rsvp
						status
						updated_by
						user_id
						user {
							first_name
							id
							last_name
							middle_name
							profile_url
							aadhar_verified
							aadhaar_verification_mode
						}
					}
				}
			}`,
		};

		const eventsList = await this.hasuraService.postData(getQuery);
		if (eventsList?.data?.events?.length > 0) {
			return response.status(200).send({
				success: true,
				message: 'Events fetched successfully!',
				data: eventsList.data,
			});
		} else {
			return response.status(404).send({
				success: false,
				message: 'Events not found!',
				data: {},
			});
		}
	}

	public async findAll(request: any) {
		return this.hasuraService.findAll(this.table, request);
	}

	public async findOne(id: number, resp: any) {
		var data = {
			query: `query searchById {
	  events_by_pk(id: ${id}) {
		reminders
		name
		master_trainer
		end_date
		created_by
		context_id
		context
		end_time
		id
		params
		location
		location_type
		start_date
		start_time
		type
		updated_by
		user_id
		attendances(order_by: {
		  created_at: asc
		  }) {
		  created_by
		  created_at
		  context
		  context_id
		  date_time
		  id
		  lat
		  user_id
		  updated_by
		  status
		  long
		  rsvp
		  fa_is_processed
		  fa_similarity_percentage
		  user{
			first_name
			id
			last_name
			middle_name
			profile_url
			aadhar_verified
			aadhaar_verification_mode
			program_faciltators{
			documents_status
			  }
		  }
		}

	  }
	}
	`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.events_by_pk;
		if (!result) {
			return resp.status(404).send({
				success: false,
				status: 'Not Found',
				message: 'Event Not Found',
				data: {},
			});
		} else {
			return resp.status(200).json({
				success: true,
				message: 'Event found successfully!',
				data: { event: result },
			});
		}
	}

	public async update(id: number, header: any, req: any, resp: any) {
		try {
			const userDetail = await this.userService.ipUserInfo(header);
			let user_id = userDetail.data.id;
			let attendees = req.attendees;
			if (attendees && attendees.length > 0) {
				const data = {
					query: `query MyQuery {
		  events(where: {id: {_eq: ${id}}}){
			id
			user_id
			name
			created_by
			updated_by
			attendances{
			  id
			  user_id
			}
		  }
		}`,
				};
				const response = await this.hasuraServiceFromServices.getData(
					data,
				);
				let eventDetails = response?.data.events[0];
				let mappedData = response?.data.events.map(
					(data) => data.attendances,
				);
				if (response) {
					//remove attendees in current event
					const deletePromise = [];
					const deleteAttendees = mappedData[0].filter(
						(data) => !req.attendees.includes(data.user_id),
					);
					if (deleteAttendees && deleteAttendees.length > 0) {
						for (const iterator of deleteAttendees) {
							deletePromise.push(
								this.hasuraService.delete('attendance', {
									id: +iterator.id,
								}),
							);
						}
						const removeAttendees = await Promise.all(
							deletePromise,
						);
					}

					//add new attendees in current event
					const tempArray = mappedData[0].map((data) => data.user_id);
					const addAttendees = req.attendees.filter(
						(data) => !tempArray.includes(data),
					);
					if (addAttendees && addAttendees.length > 0) {
						const promises = [];
						const query = [];
						for (const iterator of addAttendees) {
							let obj = {
								user_id: iterator,
								created_by: eventDetails.created_by,
								context_id: id,
								context: 'events',
								updated_by: user_id,
							};
							query.push(obj);
						}
						for (const iterator of query) {
							promises.push(
								this.hasuraService.create(
									'attendance',
									iterator,
									this.attendanceReturnFields,
								),
							);
						}
						const createAttendees = await Promise.all(promises);
					}
				}
			}
			//update events fields
			const newRequest = {
				...req,
				...(req.reminders && {
					reminders: JSON.stringify(req.reminders).replace(
						/"/g,
						'\\"',
					),
				}),
			};

			const updatedResult = await this.hasuraService.update(
				+id,
				this.table,
				newRequest,
				this.returnFields,
			);
			return resp.status(200).send({
				success: true,
				message: 'Event Updated Successfully',
				data: { events: updatedResult.events },
			});
		} catch (error) {
			return resp.status(500).send({
				success: false,
				message: error.message,
				data: {},
			});
		}
	}

	public async updateEventAcceptDetail(id: number, req: any, response: any) {
		const tableName = 'attendance';
		let result = await this.hasuraService.update(
			+id,
			tableName,
			req,
			this.attendanceReturnFields,
		);
		if (result.attendance) {
			return response.status(200).send({
				success: true,
				message: 'Attendance Updated successfully!',
				data: { attendance: result.attendance },
			});
		} else {
			return response.status(500).send({
				success: false,
				message: 'Unable to Update Attendance!',
				data: {},
			});
		}
	}
	public checkStrings(strings) {
		let message = [];
		for (let str in strings) {
			if (strings[str] === undefined || strings[str] === '') {
				message.push(`please send ${str} `);
			}
		}
		let respObject: any = {};
		if (message.length > 0) {
			respObject.success = false;
			respObject.errors = message;
		} else {
			respObject.success = true;
		}
		return respObject;
	}

	public async updateAttendanceDetail(id: number, req: any, response: any) {
		const tableName = 'attendance';
		if (req?.status == 'present') {
			let checkStringResult = this.checkStrings({});

			if (!checkStringResult.success) {
				return response.status(400).send({
					success: false,
					message: checkStringResult.errors,
					data: {},
				});
			}
		}
		try {
			let result = await this.hasuraService.update(
				+id,
				tableName,
				req,
				this.attendanceReturnFields,
			);
			if (result.attendance) {
				return response.status(200).send({
					success: true,
					message: 'Attendance Updated successfully!',
					data: { attendance: result.attendance },
				});
			}
		} catch (error) {
			return response.status(500).send({
				success: false,
				message: error.message,
				data: {},
			});
		}
	}

	async remove(id: number, header, resp: any) {
		const userDetail = await this.userService.ipUserInfo(header);
		const organizationId =
			userDetail?.data?.program_users[0]?.organisation_id;
		try {
			const data = {
				query: `query MyQuery {
				events(where: {id: {_eq: ${id}}}){
				id
				user_id
				name
				created_by
				updated_by
				attendances{
				id
				user_id
				}
			}
			}`,
			};

			const response = await this.hasuraServiceFromServices.getData(data);

			let eventDetails = response?.data?.events[0];
			//get organization id of event created user
			const EventUserdata = {
				query: `query MyQuery {
				  users_by_pk(id: ${eventDetails?.user_id}){
				  program_users{
					organisation_id
				  }
				}
			  }`,
			};
			const eventcreatedUserResponse =
				await this.hasuraServiceFromServices.getData(EventUserdata);
			const eventUserOrganizationId =
				eventcreatedUserResponse?.data?.users_by_pk?.program_users[0]
					?.organisation_id;
			//if logged user and event created user organization id is same then only perform delete operation
			if (organizationId == eventUserOrganizationId) {
				const deletePromise = [];
				if (
					eventDetails?.attendances &&
					eventDetails.attendances.length > 0
				) {
					for (const iterator of eventDetails.attendances) {
						deletePromise.push(
							this.hasuraService.delete('attendance', {
								id: +iterator.id,
							}),
						);
					}
					const removedAttendees = await Promise.all(deletePromise);
				}
				const deleteEvent = await this.hasuraService.delete(
					this.table,
					{ id: +id },
				);
				return resp.status(200).send({
					success: true,
					message: 'Event Deleted Successfully',
					data: { events: deleteEvent?.events },
				});
			} else {
				//if organization not matched
				return resp.status(401).send({
					success: true,
					message: 'Unauthorized To Delete Event',
					data: {},
				});
			}
		} catch (error) {
			return resp.status(500).send({
				success: false,
				message: error.message,
				data: {},
			});
		}
	}
	async getParticipants(req, id, body, res) {
		const auth_users = await this.userService.ipUserInfo(req, 'staff');

		const page = isNaN(body?.page) ? 1 : parseInt(body?.page);
		const limit = isNaN(body?.limit) ? 6 : parseInt(body?.limit);
		const offset = page > 1 ? limit * (page - 1) : 0;
		let facilitator_id;
		let searchQuery = '';

		if (body.search && !isNaN(body.search)) {
			facilitator_id = parseInt(body.search);
			searchQuery = `id: {_eq: ${facilitator_id}}`;
		} else if (body.search) {
			if (body.search && body.search !== '') {
				let first_name = body.search.split(' ')[0];
				let last_name = body.search.split(' ')[1] || '';

				if (last_name?.length > 0) {
					searchQuery = `_and:[{first_name: { _ilike: "%${first_name}%" }}, {last_name: { _ilike: "%${last_name}%" }}],`;
				} else {
					searchQuery = `_or:[{first_name: { _ilike: "%${first_name}%" }}, {last_name: { _ilike: "%${first_name}%" }}],`;
				}
			}
		}

		let order_by = '';
		if (body?.order_by) {
			const order = JSON.stringify(body?.order_by).replace(/"/g, '');
			order_by = `, order_by:${order}`;
		}

		const data = {
			query: `query MyQuery($limit: Int, $offset: Int) {
				users_aggregate(where: {program_faciltators: {id: {_is_null: false}, parent_ip: {_eq: "${auth_users?.data?.program_users[0]?.organisation_id}"}},attendances: {context: {_eq: "events"}, context_id: {_eq: ${id}}}}) {
					aggregate {
						count
					}
				}
				users(where: {${searchQuery}program_faciltators: {id: {_is_null: false}, parent_ip: {_eq: "${auth_users?.data?.program_users[0]?.organisation_id}"}}, attendances: {context: {_eq: "events"}, context_id: {_eq: ${id}}}}, limit: $limit,
				offset: $offset${order_by}) {
				  id
				  first_name
				  middle_name
				  last_name
				  profile_url
				  aadhar_verified
				  aadhaar_verification_mode
				  program_faciltators {
					documents_status
					status
				  }
				  attendances(where: {context: {_eq: "events"}, context_id: {_eq: ${id}}}) {
					id
					context
					context_id
					status
					user_id
					created_at
					date_time
					lat
					long
					rsvp
				}
				lms_test_trackings(where: {context: {_eq:"events"},context_id:{_eq:${id}}}) {
					context
					context_id
					status
					created_at
					updated_at
					id
					test_id
					score
					user_id
					certificate_status
				}
			}
		}
	`,
			variables: {
				limit: limit,
				offset: offset,
			},
		};
		const result = await this.hasuraServiceFromServices.getData(data);
		const count = result?.data?.users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);

		if (result?.data) {
			return res.status(200).send({
				success: true,
				message: 'Data found Successfully',
				data: result?.data?.users,
				totalPages: totalPages,
				currentPage: page,
				totalCount: count,
				limit,
			});
		} else {
			return res.status(401).send({
				success: true,
				message: 'Data not found',
				data: [],
				error: result,
			});
		}
	}

	public async createEventAttendance(body: any, req: any, res: any) {
		(body.status = body?.status || null),
			(body.context = body?.context || 'events'),
			(body.created_by = req?.mw_userid),
			(body.updated_by = req?.mw_userid);

		let response = await this.hasuraService.q(
			'attendance',
			{
				...body,
			},
			[],
			false,
			[
				'id',
				'context',
				'context_id',
				'user_id',
				'created_by',
				'updated_by',
				'lat',
				'long',
				'photo_1',
			],
		);

		if (response?.attendance?.id) {
			return res.json({
				status: 200,
				success: true,
				message: 'EVENT_ATTENDANCE_SUCCESS',
				data: response,
			});
		} else {
			return res.json({
				status: 500,
				success: false,
				message: 'EVENT_ATTENDANCE_ERROR',
				data: {},
			});
		}
	}

	async getEventsListByUserId(req, id, body, res) {
		let academic_year_id = req?.mw_academic_year_id;
		let program_id = req?.mw_program_id;
		const page = isNaN(body?.page) ? 1 : parseInt(body?.page);
		const limit = isNaN(body?.limit) ? 6 : parseInt(body?.limit);
		const offset = page > 1 ? limit * (page - 1) : 0;
		const context = body?.context || 'events';
		const todayDate = moment().format('YYYY-MM-DD');

		const data = {
			query: `query MyQuery($limit: Int, $offset: Int) {
				events_aggregate(where: {end_date:{_gte:"${todayDate}"},academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}},attendances: {context: {_eq: ${context}}, user_id: {_eq: ${id}}}}) {
					aggregate {
						count
					}
				}
				events(where: {end_date:{_gte:"${todayDate}"},academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}},attendances: {context: {_eq: ${context}}, user_id: {_eq: ${id}}}}, limit: $limit, offset: $offset) {
					id
					user_id
					context
					context_id
					created_by
					updated_by
					created_at
					updated_at
					start_date
					start_time
					end_date
					end_time
					name
					location
					location_type
					type
					params
					master_trainer
					lms_test_tracking(where: {user_id: {_eq: ${id}},context:{_eq:${context}}}) {
						context
						context_id
						status
						created_at
						updated_at
						id
						test_id
						score
						user_id
						certificate_status
					}
				}

			}`,
			variables: {
				limit: limit,
				offset: offset,
			},
		};

		const result = await this.hasuraServiceFromServices.getData(data);
		const count = result?.data?.events_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);

		if (result?.data) {
			return res.status(200).send({
				success: true,
				message: 'Data found Successfully',
				data: result.data.events,
				totalPages: totalPages,
				currentPage: page,
				limit,
			});
		} else {
			return res.status(400).send({
				success: false,
				message: 'Data not found',
				data: [],
				error: result,
			});
		}
	}

	public async campQuestionList(body: any, request: any, response: any) {
		try {
			const data = await lastValueFrom(
				this.httpService
					.post(
						'https://sunbirdsaas.com/api/question/v1/list',
						body,
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			);
			return response.status(200).json(data);
		} catch (e) {
			return response.status(400).json({ message: e.message });
		}
	}

	public async campParamsCross(
		id: any,
		body: any,
		request: any,
		response: any,
	) {
		try {
			const data = await lastValueFrom(
				this.httpService
					.get(
						`https://sunbirdsaas.com/learner/questionset/v1/hierarchy/${id}`,
						{
							params: body,
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			);

			return response.status(200).json(data);
		} catch (e) {
			console.log(e);
			return response.status(400).json({ message: e.message });
		}
	}
}
