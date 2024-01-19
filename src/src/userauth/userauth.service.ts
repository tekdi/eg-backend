import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserHelperService } from 'src/helper/userHelper.service';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { KeycloakService } from 'src/services/keycloak/keycloak.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class UserauthService {
	public smsKey = this.configService.get<string>('SMS_KEY');
	public keycloak_admin_cli_client_secret = this.configService.get<string>(
		'KEYCLOAK_ADMIN_CLI_CLIENT_SECRET',
	);
	constructor(
		private configService: ConfigService,
		private readonly keycloakService: KeycloakService,
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private readonly userHelperService: UserHelperService,
		private authService: AuthService,
	) {}

	public async userAuthRegister(body, response, role) {
		let misssingFieldsFlag = false;
		if (role === 'facilitator') {
			let isMobileExist = await this.hasuraService.findAll('users', {
				mobile: body?.mobile,
			});
			let userExist = isMobileExist?.data?.users;

			if (userExist.length > 0) {
				return response.status(422).send({
					success: false,
					message: 'Mobile Number Already Exist',
					data: {},
				});
			}

			// Validate role specific fields
			if (
				!body.role_fields.parent_ip ||
				!body.role_fields.program_id ||
				!body.role_fields.academic_year_id
			) {
				misssingFieldsFlag = true;
			}
		} else {
			misssingFieldsFlag = true;
		}
		if (misssingFieldsFlag) {
			throw new BadRequestException({
				success: false,
				message: 'Invalid parameters',
			});
		}

		// Generate random password
		const password = `@${this.userHelperService.generateRandomPassword()}`;

		// Generate username
		let username = `${body.first_name}`;
		if (body?.last_name) {
			username += `${body.last_name.charAt(0)}`;
		}
		username += `${body.mobile}`;
		username = username.toLowerCase();

		// Role to group mapping
		let group = role;

		if (role == 'facilitator') {
			group = `facilitators`;
		}

		let data_to_create_user = {
			enabled: 'true',
			firstName: body?.first_name,
			lastName: body?.last_name,
			username: username,
			credentials: [
				{
					type: 'password',
					value: password,
					temporary: false,
				},
			],
			groups: [`${group}`],
		};

		const token = await this.keycloakService.getAdminKeycloakToken();

		if (token?.access_token) {
			const findUsername = await this.keycloakService.findUser(
				username,
				token?.access_token,
			);

			const registerUserRes = await this.keycloakService.registerUser(
				data_to_create_user,
				token.access_token,
			);

			if (registerUserRes.error) {
				if (
					registerUserRes.error.message ==
					'Request failed with status code 409'
				) {
					return response.status(200).json({
						success: false,
						message: 'User already exists!',
						data: {},
					});
				} else {
					return response.status(200).json({
						success: false,
						message: registerUserRes.error.message,
						data: {},
					});
				}
			} else if (registerUserRes.headers.location) {
				const split = registerUserRes.headers.location.split('/');
				const keycloak_id = split[split.length - 1];
				body.keycloak_id = keycloak_id;
				body.username = data_to_create_user.username;
				body.password = password;

				if (body.role_fields.parent_ip) {
					body.parent_ip = body.role_fields.parent_ip;
				}
				if (body.role_fields.program_id) {
					body.program_id = body.role_fields.program_id;
				}
				if (body.role_fields.academic_year_id) {
					body.academic_year_id = body.role_fields.academic_year_id;
				}
				if (body.role_fields.facilitator_id) {
					body.facilitator_id = body.role_fields.facilitator_id;
				}
				if (role === 'facilitator' && body.hasOwnProperty('dob')) {
					delete body.dob;
				}
				body.role = role;

				const result = await this.authService.newCreate(body);

				// Send login details SMS
				// नमस्कार, प्रगति प्लेटफॉर्म पर आपका अकाउंट बनाया गया है। आपका उपयोगकर्ता नाम <arg1> है और पासवर्ड <arg2> है। FEGG
				if (body.role === 'facilitator') {
					const message = `%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%95%E0%A4%BE%E0%A4%B0,%20%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%97%E0%A4%A4%E0%A4%BF%20%E0%A4%AA%E0%A5%8D%E0%A4%B2%E0%A5%87%E0%A4%9F%E0%A4%AB%E0%A5%89%E0%A4%B0%E0%A5%8D%E0%A4%AE%20%E0%A4%AA%E0%A4%B0%20%E0%A4%86%E0%A4%AA%E0%A4%95%E0%A4%BE%20%E0%A4%85%E0%A4%95%E0%A4%BE%E0%A4%89%E0%A4%82%E0%A4%9F%20%E0%A4%AC%E0%A4%A8%E0%A4%BE%E0%A4%AF%E0%A4%BE%20%E0%A4%97%E0%A4%AF%E0%A4%BE%20%E0%A4%B9%E0%A5%88%E0%A5%A4%20%E0%A4%86%E0%A4%AA%E0%A4%95%E0%A4%BE%20%E0%A4%89%E0%A4%AA%E0%A4%AF%E0%A5%8B%E0%A4%97%E0%A4%95%E0%A4%B0%E0%A5%8D%E0%A4%A4%E0%A4%BE%20%E0%A4%A8%E0%A4%BE%E0%A4%AE%20%3Carg1%3E%20%E0%A4%B9%E0%A5%88%20%E0%A4%94%E0%A4%B0%20%E0%A4%AA%E0%A4%BE%E0%A4%B8%E0%A4%B5%E0%A4%B0%E0%A5%8D%E0%A4%A1%20%3Carg2%3E%20%E0%A4%B9%E0%A5%88%E0%A5%A4%20FEGG`;
					const args = `arg1:${body.username},arg2:${body.password}`;
					const otpRes = await this.authService.sendSMS(
						body.mobile,
						message,
						args,
					);
				}

				return response.status(200).send({
					success: true,
					message: 'User created successfully',
					data: {
						user: result?.data,
						keycloak_id: keycloak_id,
						username: data_to_create_user.username,
						password: password,
					},
				});
			} else {
				return response.status(200).json({
					success: false,
					message: 'Unable to create user in keycloak',
					data: {},
				});
			}
		} else {
			return response.status(200).json({
				success: false,
				message: 'Unable to get keycloak token',
				data: {},
			});
		}
	}

	public async userOnboarding(body: any, response: any, request: any) {
		//first check validations for all inputs

		let user_id = request?.mw_userid;

		let result = await this.processTable(body, user_id);

		if (result) {
			return response.status(200).json({
				success: true,
				message: 'Successfully updated data',
			});
		}
	}

	private async processTable(json: any, user_id: any) {
		let tableFields;
		let tableName;
		let set_update;
		let update_id;

		for (const key in json) {
			const value = json[key];

			if (typeof value === 'object') {
				tableName = key;
				tableFields = Object.keys(value);
			}

			if (Array.isArray(value)) {
				// Handle array
				tableName = key;

				await this.processJsonArray(value, tableName, user_id);
			}

			if (tableName != 'users' && tableName != 'references') {
				value.user_id = user_id;
				tableFields.push('user_id');
			}

			if (tableName == 'references') {
				value.context_id = user_id;
				tableFields.push('context_id');
			}

			let response = await this.findExisitingReccord(
				tableName,
				value,
				user_id,
			);

			set_update = response?.set_update;
			update_id = response?.id;

			await this.upsertRecords(
				set_update,
				tableName,
				tableFields,
				value,
				user_id,
				update_id,
			);
		}

		return true;
	}

	public async processJsonArray(values, tableName, user_id) {
		let set_update;
		let update_id;
		for (const obj of values) {
			const tableFields = Object.keys(obj);
			tableFields.push('user_id');
			obj.user_id = user_id;

			let response = await this.findExisitingReccord(
				tableName,
				obj,
				user_id,
			);
			set_update = response?.set_update;
			update_id = response?.id;

			await this.upsertRecords(
				set_update,
				tableName,
				tableFields,
				obj,
				user_id,
				update_id,
			);
		}
	}

	public async findExisitingReccord(tablename, value, user_id) {
		let query;
		let response;

		switch (tablename) {
			case 'users': {
				query = `query MyQuery {
					users(where: {mobile: {_eq:${value.mobile}}}){
						id,
						mobile
					}
				}`;

				response = await this.hasuraServiceFromServices.getData({
					query: query,
				});

				return {
					set_update: response?.data?.users?.length > 0 ? 1 : 0,
					id: response?.data?.users?.[0]?.id,
				};
			}
			case 'core_faciltators': {
				query = `query MyQuery {
					core_faciltators(where: {user_id: {_eq:${user_id}}}){
					  id
					}
				  }
				  `;
				response = await this.hasuraServiceFromServices.getData({
					query: query,
				});

				return {
					set_update:
						response?.data?.core_faciltators?.length > 0 ? 1 : 0,
					id: response?.data?.core_faciltators?.[0]?.id,
				};
			}
			case 'extended_users': {
				query = `query MyQuery {
					extended_users(where: {user_id: {_eq:${user_id}}}){
					  id
					}
				  }
				  
				  `;
				response = await this.hasuraServiceFromServices.getData({
					query: query,
				});

				return {
					set_update:
						response?.data?.extended_users?.length > 0 ? 1 : 0,
					id: response?.data?.extended_users?.[0]?.id,
				};
			}
			case 'program_faciltators': {
				query = `query MyQuery {
					program_faciltators(where: {user_id: {_eq:${user_id}},program_id:{_eq:${value?.program_id}},academic_year_id:{_eq:${value?.academic_year_id}}}){
					  id
					}
				  }
				  				  
				  `;
				response = await this.hasuraServiceFromServices.getData({
					query: query,
				});

				return {
					set_update:
						response?.data?.program_faciltators?.length > 0 ? 1 : 0,
					id: response?.data?.program_faciltators?.[0]?.id,
				};
			}
			case 'references': {
				query = `query MyQuery {
					references(where: {contact_number: {_eq:${value?.contact_number}},context_id:{_eq:${user_id}}}){
					  id
					}
				  }
				  
				  
				  `;
				response = await this.hasuraServiceFromServices.getData({
					query: query,
				});

				return {
					set_update: response?.data?.references?.length > 0 ? 1 : 0,
					id: response?.data?.references?.[0]?.id,
				};
			}
			case 'qualifications': {
				query = `query MyQuery {
					qualifications(where: {user_id: {_eq:${user_id}}}){
					  id
					}
				  }
				  `;
				response = await this.hasuraServiceFromServices.getData({
					query: query,
				});

				return {
					set_update:
						response?.data?.qualifications?.length > 0 ? 1 : 0,
					id: response?.data?.qualifications?.[0]?.id,
				};
			}
			case 'experience': {
				query = `query MyQuery {
					experience(where: {id: {_eq:${value?.id}}}){
					  id
					}
				  }
				  `;
				response = await this.hasuraServiceFromServices.getData({
					query: query,
				});

				return {
					set_update: response?.data?.experience?.length > 0 ? 1 : 0,
					id: response?.data?.experience?.[0]?.id,
				};
			}

			default:
				return undefined;
		}
	}

	public async upsertRecords(
		set_update,
		tableName,
		tableFields,
		value,
		user_id,
		id?,
	) {
		if (set_update == 1 && id) {
			await this.hasuraService.q(
				tableName,
				{
					...value,
					id: id,
				},
				tableFields,
				true,
				[tableFields],
			);
		} else {
			await this.hasuraService.q(
				tableName,
				{
					...value,
				},
				tableFields,
				false,
				[tableFields],
			);
		}
	}

	public async getUserInformation(response, request) {
		let user_id = request?.mw_userid;

		if (!user_id) {
			return response.status(200).json({
				success: false,
				message: 'Invalid user access',
				data: [],
			});
		}

		let query = `query MyQuery {
			users(where: {id: {_eq:${user_id}}}) {
			  id
			  mobile
			  email_id
			  gender
			  alternative_mobile_number
			  profile_photo_1
			  profile_photo_2
			  profile_photo_3
			  first_name
			  last_name
			  state
			  district
			  block
			  village
			  grampanchayat
			  pincode
			  core_faciltator {
				id
				user_id
				device_type
				device_ownership
			  }
			  experience {
				id
				organization
				role_title
				type
				experience_in_years
				related_to_teaching
				description
			  }
			  extended_users {
				marital_status
				designation
				social_category
			  }
			  program_faciltators {
				availability
				has_social_work_exp
				status
				program_id
				academic_year_id
			  }
			  references {
				name
				contact_number
				designation
			  }
			  qualifications {
				qualification_master_id
			  }
			}
		  }
		  `;
		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		if (result?.data?.users?.length > 0) {
			return response.status(200).json({
				sucess: true,
				message: 'Successfully retrieved data',
				data: result?.data?.users,
			});
		} else if (!result?.data?.users) {
			return response.status(500).json({
				sucess: false,
				message: 'Error retrieving data',
				data: [],
			});
		}
	}
}
