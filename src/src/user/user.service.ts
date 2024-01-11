import { HttpService } from '@nestjs/axios';
import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
} from '@nestjs/common';
import { Response } from 'express';
import jwt_decode from 'jwt-decode';
import { lastValueFrom, map } from 'rxjs';
import { HasuraService } from '../hasura/hasura.service';
import { UserHelperService } from '../helper/userHelper.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { KeycloakService } from '../services/keycloak/keycloak.service';

@Injectable()
export class UserService {
	public url = process.env.HASURA_BASE_URL;
	constructor(
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private readonly httpService: HttpService,
		private helper: UserHelperService,
		private hasuraService: HasuraService,
		private readonly keycloakService: KeycloakService,
	) {}

	public async update(
		userId: string,
		body: any,
		req: any,
		tableName: String,
	) {
		try {
			const academic_year_id = req.mw_academic_year_id;

			const user: any = await this.hasuraService.getOne(
				parseInt(userId),
				'program_faciltators',
				['id', 'user_id', 'status'],
			);
			const oldStatus = user?.program_faciltators?.status;
			const statusArray = [
				'shortlisted_for_orientation',
				'selected_for_training',
				'pragati_mobilizer',
				'selected_for_onboarding',
				'selected_prerak',
			];
			const validationStatusArray = ['rusticate', 'quit', 'rejected'];
			const axios = require('axios');
			const userDataSchema = body;
			let userData = body;
			let query = '';
			Object.keys(userData).forEach((e) => {
				if (
					userData[e] &&
					userData[e] != '' &&
					Object.keys(userDataSchema).includes(e)
				) {
					if (
						e === 'status' &&
						userData[e] === 'on_hold' &&
						statusArray.includes(oldStatus)
					) {
						return;
					}
					query += `${e}: "${userData[e]}", `;
				}
			});

			// validation to check if the facilitator is present in the camp

			let validation_query = `query MyQuery {
				users(where: {group_users: {user_id: {_eq:${userId}}, member_type: {_eq: "owner"}, status: {_eq: "active"}}, program_faciltators: {academic_year_id: {_eq:${academic_year_id}}}}) {
				  id
				}
			  }

			  `;

			const validation_data =
				await this.hasuraServiceFromServices.getData({
					query: validation_query,
				});

			let user_result = validation_data?.data?.users;

			if (
				user_result?.length > 0 &&
				validationStatusArray.includes(body?.status)
			) {
				return {
					statusCode: 401,
					message: `CAMP_REGISTERED_USER_ACCESS_DENIED !`,
					data: {},
				};
			}

			var data = {
				query: `mutation update($id:Int) {
			  update_${tableName}(where: {id: {_eq: $id}}, _set: {${query}}) {
				affected_rows
			}
		}`,
				variables: {
					id: userId,
				},
			};

			var config = {
				method: 'post',
				url: this.url,
				headers: {
					'Content-Type': 'application/json',
					'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
				},
				data: data,
			};

			const response = await axios(config);
			const result = response.data.data;
			if (response.data.data) {
				return {
					statusCode: response.status,
					message: `${tableName} details updated !`,
					data: result,
				};
			} else {
				return {
					statusCode: 400,
					message: `Erorr while updating ${tableName} !`,
					data: response.data,
				};
			}
		} catch (error) {
			throw new HttpException(
				{
					status: HttpStatus.FORBIDDEN,
					error: `Erorr while updating ${tableName} !`,
				},
				HttpStatus.FORBIDDEN,
				{
					cause: error,
				},
			);
		}
	}

	public async login(username: string, password: string, response: Response) {
		const axios = require('axios');
		var loginData = {
			username: username,
			password: password,
			grant_type: 'password',
			client_id: 'hasura',
		};
		var configData = {
			method: 'post',
			url: `${process.env.KEYCLOAK_URL}/realms/eg-sso/protocol/openid-connect/token`,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			data: loginData,
		};
		try {
			const res = await axios(configData);
			if (res) {
				return response.status(200).send({
					success: true,
					status: 'Authenticated',
					message: 'LOGGEDIN_SUCCESSFULLY',
					data: res.data,
				});
			} else {
				console.log('inside else');
			}
		} catch (err) {
			console.log('login api err', err);
			return response.status(401).send({
				success: false,
				status: 'Unauthorized',
				message: 'INVALID_USERNAME_PASSWORD_MESSAGE',
				data: null,
			});
		}
	}

	public async ipUserInfo(request: any, role: any = '') {
		let userData = null;
		let bearerToken = null;
		let bearerTokenTemp = null;

		// Get userid from  auth/login jwt token
		const authToken = request?.headers?.authorization;
		const authTokenTemp = request?.headers?.authorization.split(' ');

		// If Bearer word not found in auth header value
		if (authTokenTemp[0] !== 'Bearer') {
			return userData;
		}
		// Get trimmed Bearer token value by skipping Bearer value
		else {
			bearerToken = authToken.trim().substr(7, authToken.length).trim();
		}

		// If Bearer token value is not passed
		if (!bearerToken) {
			return userData;
		}
		// Lets split token by dot (.)
		else {
			bearerTokenTemp = bearerToken.split('.');
		}

		// Since JWT has three parts - seperated by dots(.), lets split token
		if (bearerTokenTemp.length < 3) {
			return userData;
		}

		const decoded: any = jwt_decode(authToken);
		let keycloak_id = decoded.sub;

		const axios = require('axios');
		// Set query for getting data info
		var queryData = {
			query: `
		query GetUserDetails($keycloak_id:uuid) {
		  users(where: {keycloak_id: {_eq: $keycloak_id}}) {
			id
		  }
		}
	  `,
			variables: { keycloak_id: keycloak_id },
		};
		// Initialize config
		var configData = {
			method: 'post',
			url: this.url,
			headers: {
				'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
				'Content-Type': 'application/json',
			},
			data: queryData,
		};

		const response = await axios(configData);

		if (response?.data?.data?.users[0]) {
			if (role === 'staff') {
				userData = await this.getIpRoleUserById(
					+response?.data?.data?.users[0]?.id,
				);
			} else {
				userData = (
					await this.userById(+response?.data?.data?.users[0]?.id)
				).data;
			}
		}

		return {
			status: response?.status,
			data: userData,
		};
	}

	public async getIpRoleUserById(id: any) {
		const data = await this.hasuraServiceFromServices.getOne(id, 'users', [
			'id',
			'program_users{organisation_id}',
			'first_name',
		]);
		return data?.users;
	}

	public async register(body: any, request: any) {
		const axios = require('axios');
		//const password = `@${this.helper.generateRandomPassword()}`;
		const password = body?.mobile;
		let username = `${body.first_name}`;
		if (body?.last_name) {
			username += `_${body.last_name.charAt(0)}`;
		}
		username += `_${body.mobile}`;
		const data_to_create_user = {
			enabled: 'true',
			firstName: body?.first_name,
			lastName: body?.last_name,
			username: username.toLowerCase(),
			email: body?.email_id,
			credentials: [
				{
					type: 'password',
					value: password,
					temporary: false,
				},
			],
			groups: ['facilitators'],
		};
		const adminResult = await this.helper.getAdminKeycloakToken();

		if (adminResult?.data?.access_token) {
			var config = {
				method: 'post',
				url: `${process.env.KEYCLOAK_URL}/admin/realms/eg-sso/users`,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${adminResult?.data?.access_token}`,
				},
				data: data_to_create_user,
			};

			try {
				const { headers, status } = await axios(config);
				if (headers.location) {
					const split = headers.location.split('/');
					const keycloak_id = split[split.length - 1];
					body.keycloak_id = keycloak_id;
					const result = await this.newCreate(body);

					return {
						status,
						message: 'User created successfully',
						data: {
							user: result?.data,
							keycloak_id: keycloak_id,
							username: username,
							password: password,
						},
					};
				} else {
					throw new BadRequestException(
						'Error while generating admin token !',
					);
				}
			} catch (e) {
				throw new HttpException(e.message, HttpStatus.CONFLICT, {
					cause: e,
				});
			}
		} else {
			throw new BadRequestException('Error while creating user !');
		}
	}

	async newCreate(req: any) {
		const tableName = 'users';
		const newR = await this.hasuraService.q(tableName, req, [
			'first_name',
			'last_name',
			'mobile',
			'email_id',
			'keycloak_id',
		]);
		const user_id = newR[tableName]?.id;
		if (user_id) {
			await this.hasuraService.q(
				`program_faciltators`,
				{ ...req, user_id },
				['parent_ip', 'user_id'],
			);
		}
		return await this.userById(user_id);
	}

	async create(req: any, update = false) {
		let i = 0,
			response = [];
		let objKey = Object.keys(req);
		const userArr = [
			'first_name',
			'last_name',
			'email_id',
			'gender',
			'dob',
			'address',
			'aadhar_token',
			'keycloak_id',
			'profile_url',
			'block',
			'district',
			'state',
			'village',
		];
		let user_id = req?.id ? req?.id : null;
		const keyExist = userArr.filter((e) => objKey.includes(e));
		if (keyExist.length > 0) {
			const tableName = 'users';
			const newR = await this.hasuraService.q(
				tableName,
				req,
				userArr,
				update,
			);
			user_id = newR[tableName]?.id ? newR[tableName]?.id : user_id;
			response[i++] = newR;
		}
		if (user_id) {
			const cFArr = [
				'pan_no',
				'device_type',
				'device_ownership',
				'sourcing_channel',
				'refreere',
				'user_id',
			];
			const cFkeyExist = cFArr.filter((e) => objKey.includes(e));
			if (cFkeyExist.length > 0) {
				response[i++] = await this.hasuraService.q(
					'core_faciltators',
					{
						...req,
						id: req?.core_faciltators?.id
							? req?.core_faciltators?.id
							: null,
						user_id,
					},
					cFArr,
					update,
				);
			}
			const pFArr = [
				'availability',
				'program_id',
				'parent_ip',
				'has_social_work_exp',
				'social_background_verified_by_neighbours',
				'village_knowledge_test',
				'police_verification_done',
				'user_id',
				'form_step_number',
				'status',
			];
			const pFkeyExist = pFArr.filter((e) => objKey.includes(e));
			if (pFkeyExist.length > 0) {
				response[i++] = await this.hasuraService.q(
					'program_faciltators',
					{
						...req,
						id: req?.program_faciltators?.id
							? req?.program_faciltators?.id
							: null,
						user_id: user_id,
					},
					pFArr,
					update,
				);
			}
			const fillKeys = ['qualification', 'degree'];
			const qkeyExist = fillKeys.filter((e) => objKey.includes(e));
			if (qkeyExist.length > 0) {
				await this.hasuraService.delete('qualifications', {
					user_id,
				});
				response[i++] = await Promise.all(
					fillKeys
						.map(async (e) =>
							req[e]
								? await this.hasuraService.q(
										'qualifications',
										{
											qualification_master_id: req[e],
											user_id,
										},
										['qualification_master_id', 'user_id'],
								  )
								: null,
						)
						.filter((e) => e),
				);
			}

			if (req['experience']) {
				await this.hasuraService.delete('experience', {
					user_id,
					type: 'experience',
				});
				await Promise.all(
					req['experience'].map(
						async (e: Object) =>
							this.hasuraService.q(
								'experience',
								{ ...e, type: 'experience', user_id },
								[
									'type',
									'description',
									'user_id',
									'role_title',
									'organization',
									'institution',
									'start_year',
									'end_year',
									'experience_in_years',
								],
							),
						update,
					),
				);
			}
			if (req['vo_experience']) {
				await this.hasuraService.delete('experience', {
					user_id,
					type: 'vo_experience',
				});
				await Promise.all(
					req['vo_experience'].map(
						async (e: Object) =>
							this.hasuraService.q(
								'experience',
								{ ...e, type: 'vo_experience', user_id },
								[
									'type',
									'description',
									'user_id',
									'role_title',
									'organization',
									'institution',
									'start_year',
									'end_year',
									'experience_in_years',
								],
							),
						update,
					),
				);
			}
		}
		return this.userById(user_id);
	}

	// organizationInfo
	async organizationInfo(id: any) {
		const data = {
			query: `query MyQuery {
		organisations_by_pk(id:"${id}") {
		  address
		  contact_person
		  gst_no
		  mobile
		  id
		  name
		}
	  }
	  `,
		};

		const response = await lastValueFrom(
			this.httpService
				.post(this.url, data, {
					headers: {
						'x-hasura-admin-secret':
							process.env.HASURA_ADMIN_SECRET,
						'Content-Type': 'application/json',
					},
				})
				.pipe(map((res) => res.data)),
		);
		let result = response?.data?.organisations_by_pk;
		const mappedResponse = result;
		return {
			statusCode: 200,
			message: 'Ok.',
			data: mappedResponse,
		};
	}
	async getAadhaarDetails(id: any, resp: any) {
		var data = {
			query: `query searchById {
		  users_by_pk(id: ${id}) {
		  id
			aadhaar_verification_mode
			aadhar_no
			aadhar_token
			aadhar_verified
		  aadhaar_front: documents(where: {document_sub_type: {_eq: "aadhaar_front"}}) {
						id
						name
						doument_type
						document_sub_type
						path
						}
			aadhaar_back: documents(where: {document_sub_type: {_eq: "aadhaar_back"}}) {
						id
						name
						doument_type
						document_sub_type
						path
						}
	  }
	}`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.users_by_pk;
		if (!result) {
			return resp.status(404).send({
				success: false,
				status: 'Not Found',
				message: 'Aadhaar Details Not Found',
				data: {},
			});
		} else {
			result.program_beneficiaries = result?.program_beneficiaries?.[0];
			//response mapping convert array to object
			for (const key of ['aadhaar_front', 'aadhaar_back']) {
				if (result?.[key] && result?.[key][0]) {
					result[key] = result[key][0];
				} else {
					result = { ...result, [key]: {} };
				}
			}
			return resp.status(200).json({
				success: true,
				message: 'Aadhaar Details found successfully!',
				data: { result: result },
			});
		}
	}

	async userById(id: any, resp?: any, req?: any) {
		const academic_year_id = req?.mw_academic_year_id;

		const filterQueryArray = req
			? `(where: {academic_year_id: {_eq: ${academic_year_id}}})`
			: ``;

		const data = {
			query: `query searchById {
		users_by_pk(id:${id}) {
		  aadhaar_verification_mode
		  aadhar_no
		  aadhar_token
		  aadhar_verified
		  address
		  address_line_1
		  address_line_2
		  alternative_mobile_number
		  block
		  block_id
		  block_village_id
		  created_at
		  created_by
		  district
		  district_id
		  dob
		  duplicate_reason
		  email_id
		  email_verified
		  first_name
		  gender
		  grampanchayat
		  id
		  is_duplicate
		  is_deactivated
		  keycloak_id
		  last_name
		  lat
		  long
		  middle_name
		  mobile
		  mobile_no_verified
		  pincode
		  profile_url
		  state
		  state_id
		  updated_at
		  updated_by
		  village
		  username
		  aadhaar_front: documents(where: {document_sub_type: {_eq: "aadhaar_front"}}) {
			id
			name
			doument_type
			document_sub_type
			path
		  }
		  aadhaar_back: documents(where: {document_sub_type: {_eq: "aadhaar_back"}}) {
			id
			name
			doument_type
			document_sub_type
			path
		  }
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
		  program_users {
			id
			organisation_id
			academic_year_id
			program_id
			role_id
			status
			user_id
		  }
		  extended_users{
			id
			user_id
			marital_status
			qualification_id
			designation
			social_category
			created_by
			updated_by
		  }
		  core_faciltator {
			created_by
			device_ownership
			device_type
			id
			pan_no
			refreere
			sourcing_channel
			updated_by
			user_id
		  }
		  experience {
			id
			description
			end_year
			experience_in_years
			institution
			start_year
			organization
			role_title
			user_id
			type
			related_to_teaching
			reference {
			  id
			  name
			  context
			  context_id
			  contact_number
			  document_id
			  type_of_document
			  designation
			  document_reference {
				id
				user_id
				name
				doument_type
				document_sub_type
				provider
				path
			  }
			}
		  }
		  program_faciltators ${filterQueryArray}{
			parent_ip
			documents_status
			availability
			has_social_work_exp
			id
			police_verification_done
			program_id
			social_background_verified_by_neighbours
			user_id
			village_knowledge_test
			status
			form_step_number
			created_by
			updated_by
			academic_year_id
			qualification_ids
			okyc_response
		  }
		  qualifications {
			created_by
			end_year
			id
			institution
			qualification_master_id
			start_year
			updated_by
			user_id
			qualification_reference_document_id
			qualification_master {
			  context
			  context_id
			  created_by
			  id
			  name
			  type
			  updated_by
			}
			document_reference {
			  id
			  user_id
			  name
			  context
			  context_id
			  doument_type
			  document_sub_type
			  provider
			  path
			}
		  }
		  interviews {
			id
			title
			user_id
			owner_user_id
			date
			start_time
			end_time
			interviewer_name
			status
			comment
			reminder
			rsvp
			location_type
			location
			created_at
			created_by
			updated_at
			updated_by
			owner {
			  first_name
			  last_name
			  id
			}
		  }
		  events {
			context
			context_id
			created_by
			end_date
			end_time
			id
			location
			location_type
			start_date
			start_time
			updated_by
			user_id
		  }
		  documents(order_by: {id: desc}) {
			id
			created_by
			path
			provider
			updated_by
			user_id
			name
			doument_type
			document_sub_type
			context
			context_id
		  }
		  references {
			id
			name
			contact_number
			designation
		  }
		}}`,
		};

		const response = await lastValueFrom(
			this.httpService
				.post(this.url, data, {
					headers: {
						'x-hasura-admin-secret':
							process.env.HASURA_ADMIN_SECRET,
						'Content-Type': 'application/json',
					},
				})
				.pipe(map((res) => res.data)),
		);
		let result = response?.data?.users_by_pk;

		for (const key of [
			'references',
			'qualifications',
			'program_faciltators',
			'profile_photo_1',
			'profile_photo_2',
			'profile_photo_3',
			'aadhaar_front',
			'aadhaar_back',
		]) {
			if (result?.[key] && result?.[key][0]) {
				result[key] = result[key][0];
			} else {
				result = { ...result, [key]: {} };
			}
		}

		let mappedResponse = result;

		if (result?.experience) {
			mappedResponse = {
				...mappedResponse,
				['experience']: result?.experience.filter(
					(e: any) => e.type == 'experience',
				),
			};

			mappedResponse = {
				...mappedResponse,
				['vo_experience']: result?.experience.filter(
					(e: any) => e.type == 'vo_experience',
				),
			};
		}

		if (mappedResponse.program_faciltators?.qualification_ids) {
			mappedResponse.program_faciltators.qualification_ids =
				mappedResponse.program_faciltators.qualification_ids.replace(
					/\"/g,
					'',
				);
		}

		if (resp && (req == null || req == undefined)) {
			if (!mappedResponse.username && mappedResponse.keycloak_id) {
				const keycloakresponse =
					await this.keycloakService.findUserByKeycloakId(
						mappedResponse.keycloak_id,
					);
				mappedResponse.username = keycloakresponse.username || null;
				if (mappedResponse.username) {
					await this.hasuraService.update(
						mappedResponse.id,
						'users',
						{ username: mappedResponse.username },
						['username'],
					);
				}
			}

			return resp.status(200).send({
				success: true,
				message: 'Data Fetched Successfully',
				data: {
					data: mappedResponse,
				},
			});
		} else {
			return {
				statusCode: 200,
				message: 'Ok.',
				data: mappedResponse,
			};
		}
	}

	async list(request: any, req: any) {
		const { filters } = request;
		const page = request.page ? request.page : '1';
		const limit = request?.limit ? request?.limit : '10';

		let offset = 0;
		if (page > 1 && limit) {
			offset = parseInt(limit) * (page - 1);
		}

		let query = '';
		if (filters) {
			Object.keys(filters).forEach((e) => {
				if (filters[e] && filters[e] != '') {
					query += `${e}:{_eq:"${filters[e]}"}`;
				}
			});
		}
		const user = await this.ipUserInfo(req);
		query += `program_faciltators: {id: {_is_null: false}, parent_ip: {_eq: "${user?.data?.program_users[0]?.organisation_id}"}}`;
		var data = {
			query: `query SearchAttendance($limit:Int, $offset:Int) {
		users_aggregate(where:{${query}}) {
		  aggregate {
			count
		  }
		}
		users(where:{${query}}, limit: $limit, offset: $offset, order_by: {created_at: desc}) {
		  first_name
		  id
		  last_name
		  dob
		  aadhar_token
		  address
		  block_id
		  block_village_id
		  created_by
		  district_id
		  email_id
		  gender
		  lat
		  long
		  mobile
		  state_id
		  updated_by
		  profile_url
		  program_users {
			id
			organisation_id
			academic_year_id
			program_id
			role_id
			status
			user_id
		  }
		  core_faciltator {
			created_by
			device_ownership
			device_type
			id
			pan_no
			refreere
			sourcing_channel
			updated_by
			user_id
		  }
		  experience {
			description
			end_year
			experience_in_years
			institution
			start_year
			organization
			role_title
			user_id
			type
		  }
		  program_faciltators {
			parent_ip
			availability
			has_social_work_exp
			id
			police_verification_done
			program_id
			social_background_verified_by_neighbours
			user_id
			village_knowledge_test
			status
			form_step_number
			created_by
			updated_by
		  }
		  qualifications {
			created_by
			end_year
			id
			institution
			qualification_master_id
			start_year
			updated_by
			user_id
			qualification_master {
			  context
			  context_id
			  created_by
			  id
			  name
			  type
			  updated_by
			}
		  }
		  interviews {
			id
			title
			user_id
			owner_user_id
			date
			start_time
			end_time
			interviewer_name
			status
			comment
			reminder
			rsvp
			location_type
			location
			created_at
			created_by
			updated_at
			updated_by
			owner {
			  first_name
			  last_name
			  id
			}
		  }
		  events {
			context
			context_id
			created_by
			end_date
			end_time
			id
			location
			location_type
			start_date
			start_time
			updated_by
			user_id
		  }
		  documents(order_by: {id: desc}){
			id
			user_id
			name
			doument_type
			document_sub_type
		  }
		}}`,
			variables: {
				limit: parseInt(limit),
				offset: offset,
			},
		};

		const response = await lastValueFrom(
			this.httpService
				.post(this.url, data, {
					headers: {
						'x-hasura-admin-secret':
							process.env.HASURA_ADMIN_SECRET,
						'Content-Type': 'application/json',
					},
				})
				.pipe(map((res) => res.data)),
		);

		let result = response?.data?.users;

		let mappedResponse = result;
		const count = response?.data?.users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);

		return {
			statusCode: 200,
			message: 'Ok.',
			totalCount: count,
			data: mappedResponse?.map((e) => ({
				...e,
				['program_faciltators']: e?.['program_faciltators']?.[0],
				['qualifications']: e?.['qualifications']?.[0],
			})),
			limit,
			currentPage: page,
			totalPages: `${totalPages}`,
		};
	}

	async isUserExist(req: any) {
		// Set User table name
		const tableName = 'users';

		// Calling hasura common method find all
		const data_exist = await this.hasuraService.findAll(tableName, req);
		let response = data_exist?.data?.users;

		// Check wheather user is exist or not based on response
		if (response && response.length > 0) {
			return {
				status: 422,
				message: 'User exist',
				isUserExist: true,
			};
		} else {
			return {
				status: 400,
				message: 'User not exist',
				isUserExist: false,
			};
		}
	}

	async addAuditLog(
		userId,
		mw_userid,
		context,
		context_id,
		oldData,
		newData,
		tempArray,
	) {
		let storeOld = {};
		let storeNew = {};

		for (let data of tempArray) {
			if (oldData[data] !== newData[data]) {
				storeOld[data] = oldData[data];
				storeNew[data] = newData[data];
			}
		}

		if (
			Object.keys(storeOld).length !== 0 &&
			Object.keys(storeNew).length !== 0
		) {
			const res = await this.hasuraService.create(
				'audit_logs',
				{
					new_data: JSON.stringify(storeNew).replace(/"/g, '\\"'),
					old_data: JSON.stringify(storeOld).replace(/"/g, '\\"'),
					user_id: userId,
					context: context,
					context_id: context_id,
					updated_by_user: mw_userid,
				},
				[
					'id',
					'user_id',
					'new_data',
					'old_data',
					'context',
					'context_id',
					'updated_at',
					'created_at',
					'updated_by_user',
					'action',
				],
			);
			return res;
		}
	}

	async addAuditLogAction(auditLogsObject) {
		const {
			userId,
			mw_userid,
			context,
			context_id,
			subject,
			subject_id,
			log_transaction_text,
			user_type,
			oldData,
			newData,
			tempArray,
			action,
		} = auditLogsObject;
		let storeOld = {};
		let storeNew = {};
		if (!action || action != 'create') {
			for (let data of tempArray) {
				if (oldData[data] !== newData[data]) {
					storeOld[data] = oldData[data];
					storeNew[data] = newData[data];
				}
			}
		} else {
			storeOld = oldData;
			storeNew = newData;
		}

		console.log('storeOld', storeOld);
		console.log('storeNew', storeNew);

		if (
			Object.keys(storeOld).length !== 0 &&
			Object.keys(storeNew).length !== 0
		) {
			const res = await this.hasuraService.create(
				'audit_logs',
				{
					new_data: JSON.stringify(storeNew).replace(/"/g, '\\"'),
					old_data: JSON.stringify(storeOld).replace(/"/g, '\\"'),
					user_id: userId,
					context: context,
					context_id: context_id,
					subject_id: subject_id,
					subject: subject,
					user_type: user_type,
					log_transaction_text: log_transaction_text,
					updated_by_user: mw_userid,
					action: action,
				},
				[
					'id',
					'user_id',
					'new_data',
					'old_data',
					'context',
					'context_id',
					'subject',
					'subject_id',
					'log_transaction_text',
					'user_type',
					'updated_at',
					'created_at',
					'updated_by_user',
					'action',
				],
			);
			return res;
		}
	}

	public async getAuditLogs(context_id, context, req: any, resp: any) {
		const data = {
			query: `query MyQuery {
				audit_logs(where: {_and:[{context_id: {_eq: ${context_id}}},{context:{_eq:"${context}"}}]},order_by: {created_at:desc}) {
				  context_id
				  context
				  created_at
				  id
				  new_data
				  old_data
				  updated_at
				  user_id
				  updated_by_user
				  user{
					id
					first_name
					last_name
					middle_name
				  }
				}
			  }`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let result: any = response?.data?.audit_logs;
		if (!result) {
			return resp.status(404).send({
				success: false,
				message: 'Audit Logs Not Found',
				data: {},
			});
		} else {
			return resp.status(200).json({
				success: true,
				message: 'Audit Logs found successfully!',
				data: result,
			});
		}
	}

	public async userCampExist(user_id: any, body: any, req: any, res: any) {
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;

		const user = await this.ipUserInfo(req);

		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return res.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}

		let parent_ip_id = user?.data?.program_users?.[0]?.organisation_id;

		// validation to check if user comes under specific IP

		let validation_query = `query MyQuery {
			users(where: {program_faciltators: {parent_ip: {_eq: "${parent_ip_id}"}, user_id: {_eq:${user_id}}, academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}}) {
			  id
			}
		  }
		  `;

		const validation_response =
			await this.hasuraServiceFromServices.getData({
				query: validation_query,
			});

		let user_validation_result = validation_response?.data?.users;

		if (user_validation_result?.length == 0) {
			return res.json({
				status: 401,
				message: 'IP_ACCESS_DENIED',
				data: [],
				success: false,
			});
		}

		//query to get camps list under specific user with respect to cohorts

		let query = `query MyQuery {
			users(where: {id:{_eq:${user_id}} ,program_faciltators: {program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}}}) {
			  facilitator_id: id
			  group_users(where: {member_type: {_eq: "owner"}, status: {_eq: "active"}, group: {program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}}}) {
				group {
				  camp_name: name
				  camp {
					camp_id: id
				  }
				}
			  }
			}
		  }
		  `;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let { group_users, ...user_result } =
			hasura_response?.data?.users[0] || {};

		return res.json({
			status: 200,
			data: group_users,
			success: true,
			message: 'USER_CAMP_DETAILS_SUCCESS',
		});
	}

	//get first_name and last_name from user_id
	public async getUserName(user_id) {
		const query = `query MyQuery {
			users(where: {id: {_eq: ${user_id}}}) {
					first_name
					middle_name
					last_name
				  }
			  }`;
		try {
			const data_list = (
				await this.hasuraServiceFromServices.getData({ query })
			)?.data?.users;
			return data_list || [];
		} catch (error) {
			console.log('getUserName:', error, error.stack);
			return [];
		}
	}

	public async getUserCohorts(type: any, req: any, res: any) {
		const user_id = req?.mw_userid;
		const cohort_type = type;

		const role = req?.mw_roles;

		let sql;
		let primary_table;
		let cohort_data;
		let program_organisation_condition;
		let cohort_academic_year_id;

		if (cohort_type == 'academic_year') {
			if (role.includes('staff')) {
				const user = await this.ipUserInfo(req);
				if (!user?.data?.program_users?.[0]?.organisation_id) {
					return res.status(404).send({
						success: false,
						message: 'Invalid Ip',
						data: {},
					});
				}

				primary_table = 'program_users';

				program_organisation_condition =
					'pu.organisation_id = po.organisation_id';
			}

			if (role.includes('facilitator')) {
				primary_table = 'program_faciltators';

				program_organisation_condition =
					'CAST(pu.parent_ip as Int) = po.organisation_id';
			}

			sql = `SELECT ay.id as academic_year_id, ay.name as academic_year_name
				   FROM ${primary_table} pu
				   LEFT JOIN academic_years ay ON pu.academic_year_id = ay.id
				   LEFT JOIN program_organisation po ON ${program_organisation_condition}
				   WHERE po.status = 'active'  AND pu.user_id = ${user_id}
				   GROUP BY ay.id
		`;

			cohort_data = (
				await this.hasuraServiceFromServices.executeRawSql(sql)
			)?.result;
		}

		if (cohort_type == 'program') {
			if (role.includes('staff')) {
				const user = await this.ipUserInfo(req);
				if (!user?.data?.program_users?.[0]?.organisation_id) {
					return res.status(404).send({
						success: false,
						message: 'Invalid Ip',
						data: {},
					});
				}

				primary_table = 'program_users';

				program_organisation_condition =
					'pu.organisation_id = po.organisation_id';
			}

			sql = `SELECT p.id as program_id, p.name as program_name,p.state_id,
				   (SELECT state_name from address where state_cd = p.state_id limit  1) AS state_name
				   FROM ${primary_table} pu
				   LEFT JOIN program_organisation po ON ${program_organisation_condition}
				   LEFT JOIN programs p ON po.program_id = p.id
	 			   WHERE po.status = 'active'  AND pu.user_id = ${user_id}
		 		   GROUP BY p.id
		`;

			cohort_data = (
				await this.hasuraServiceFromServices.executeRawSql(sql)
			)?.result;
		}
		if (cohort_type == 'program_academic_year_id') {
			if (role.includes('staff')) {
				const user = await this.ipUserInfo(req);
				if (!user?.data?.program_users?.[0]?.organisation_id) {
					return res.status(404).send({
						success: false,
						message: 'Invalid Ip',
						data: {},
					});
				}

				cohort_academic_year_id = req?.query?.cohort_academic_year_id;
				primary_table = 'program_users';

				program_organisation_condition =
					'pu.organisation_id = po.organisation_id';
			}

			sql = `SELECT p.id as program_id, p.name as program_name,p.state_id,
			(SELECT state_name from address where state_cd = p.state_id limit  1) AS state_name
			FROM ${primary_table} pu
			LEFT JOIN program_organisation po ON ${program_organisation_condition}
			LEFT JOIN programs p ON po.program_id = p.id
			 WHERE po.status = 'active' AND po.academic_year_id = ${cohort_academic_year_id}  AND pu.user_id = ${user_id}
			 GROUP BY p.id

			 
 `;

			cohort_data = (
				await this.hasuraServiceFromServices.executeRawSql(sql)
			)?.result;
		}
		if (cohort_data && cohort_data.length > 0) {
			return res.status(200).json({
				success: true,
				data: this.hasuraServiceFromServices.getFormattedData(
					cohort_data,
					[5],
				),
			});
		} else {
			return res.status(200).json({
				success: false,
				data: [],
			});
		}
	}

	public async validateOnBoardingLink(
		body: any,
		request: any,
		response: any,
	) {
		let { academic_year_id, program_id, organisation_id } = body;

		let query = `query MyQuery {
			program_organisation(where: {academic_year_id: {_eq:${academic_year_id}}, organisation_id: {_eq:${organisation_id}}, program_id: {_eq:${program_id}}, status: {_eq: "active"}}){
			  id
			}
		  }
		  `;

		const query_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		if (query_response?.data?.program_organisation?.length > 0) {
			return response.status(200).json({
				message: 'Onboarding link is valid.',
				isExist: true,
			});
		} else {
			return response.status(200).json({
				message: 'Onboarding link is invalid or does not exist',
				isExist: false,
			});
		}
	}

	/**************************************************************************/
	/******************************* V2 APIs **********************************/
	/**************************************************************************/
	public async checkUserExistsV2(role: any, body: any, response: any) {
		const hasura_response = await this.findUsersByFields(body);

		if (hasura_response && hasura_response.data.users.length > 0) {
			const users = hasura_response.data.users;

			const facilitators_data = users.flatMap(
				(user) => user.program_faciltators,
			);

			const beneficiaries_data = users.flatMap(
				(user) => user.program_beneficiaries,
			);

			let usersFound = false;
			if (facilitators_data.length > 0 || beneficiaries_data.length > 0) {
				usersFound = true;
			}

			return response.status(200).send({
				success: usersFound,
				data: {
					program_faciltators: facilitators_data,
					program_beneficiaries: beneficiaries_data,
				},
			});
		} else {
			return response.status(200).send({
				success: false,
				message: 'Matching users not found',
				data: [],
			});
		}
	}

	public async findUsersByFields(body) {
		const fields = [];
		for (const fieldName in body) {
			const fieldValue = body[fieldName];
			fields.push(fieldName, fieldValue);
		}

		const data = {
			query: `query MyQuery {
				users(where: {${fields[0]}: {_eq: "${fields[1]}"}}){
					program_faciltators {
						user_id
						academic_year_id
						program_id
					  }
					  program_beneficiaries{
						user_id
						academic_year_id
						program_id
					}
				}
			}`,
		};

		// Fetch data
		const hasura_response = await this.hasuraServiceFromServices.getData(
			data,
		);

		return hasura_response;
	}
}
