import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserHelperService } from 'src/helper/userHelper.service';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { KeycloakService } from 'src/services/keycloak/keycloak.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { Method } from '../common/method/method';
import { AcknowledgementService } from 'src/modules/acknowledgement/acknowledgement.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class UserauthService {
	public smsKey = this.configService.get<string>('SMS_KEY');
	public keycloak_admin_cli_client_secret = this.configService.get<string>(
		'KEYCLOAK_ADMIN_CLI_CLIENT_SECRET',
	);
	constructor(
		private configService: ConfigService,
		private readonly keycloakService: KeycloakService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private readonly hasuraService: HasuraService,
		private readonly userHelperService: UserHelperService,
		private authService: AuthService,
		private acknowledgementService: AcknowledgementService,
		private userService: UserService,
		private method: Method,
	) {}

	public async userAuthRegister(body, response, role) {
		let misssingFieldsFlag = false;
		if (role === 'facilitator') {
			//validation to check if the mobile exists for another facilitator

			let query = `query MyQuery {
				users(where: {mobile: {_eq: "${body?.mobile}"}}){
				  id
				  mobile
				  program_faciltators{
					id
					user_id
				  }
				}
			  }
			  `;
			const hasura_response =
				await this.hasuraServiceFromServices.getData({
					query: query,
				});

			let users = hasura_response?.data?.users;

			if (users?.length > 0) {
				let facilitator_data = users.filter(
					(user) => user.program_faciltators.length > 0,
				);

				if (facilitator_data.length > 0) {
					return response.status(422).send({
						success: false,
						message: 'Mobile Number Already Exist',
						data: {},
					});
				}
			}

			// Validate role specific fields
			if (
				!body.role_fields.parent_ip ||
				!body.role_fields.program_id ||
				!body.role_fields.academic_year_id
			) {
				misssingFieldsFlag = true;
			}
		} else if (role === 'beneficiary') {
			// Validate role specific fields
			if (
				!body.role_fields.facilitator_id ||
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
		} else if (role == 'beneficiary') {
			group = `beneficiaries`;
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

			if (findUsername.length > 0 && group === 'beneficiaries') {
				let lastUsername =
					findUsername[findUsername.length - 1].username;
				console.log('lastUsername', lastUsername);
				let count = findUsername.length;
				console.log('count', count);
				data_to_create_user.username =
					data_to_create_user.username + '_' + count;
			}

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
				if (
					role === 'beneficiary' &&
					result.data.program_beneficiaries
				) {
					await this.userService.addAuditLog(
						result?.data?.id,
						body.role_fields.facilitator_id,
						'program_beneficiaries.status',
						result?.data?.program_beneficiaries[0]?.id,
						{
							status: '',
							reason_for_status_update: '',
						},
						{
							status: result?.data?.program_beneficiaries[0]
								?.status,
							reason_for_status_update: 'new registration',
						},
						['status', 'reason_for_status_update'],
					);
				}

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

				let user_id = result?.data?.id;

				if (user_id && role === 'facilitator') {
					// Set the timezone to Indian Standard Time (Asia/Kolkata)
					const formattedISTTime = this.method.getFormattedISTTime();

					// Format the time as per datetime

					let acknowledgement_create_body = {
						user_id: user_id,
						academic_year_id: body?.role_fields?.academic_year_id,
						program_id: body?.role_fields?.program_id,
						date_time: formattedISTTime,
						doc_version: 1,
						doc_id: 1,
						context: 'facilitator.profile',
						context_id: user_id,
						accepted: true,
					};

					//add acknowledgment details
					await this.acknowledgementService.createAcknowledgement(
						acknowledgement_create_body,
					);
				}

				if (role === 'beneficiary' && body?.career_aspiration) {
					let core_beneficiary_body = {
						career_aspiration: body?.career_aspiration,
						career_aspiration_details:
							body?.career_aspiration_details,
						user_id: user_id,
					};
					await this.hasuraService.q(
						'core_beneficiaries',
						{
							...core_beneficiary_body,
						},
						[],
						false,
						['id'],
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

	public async isUserExists(body, response) {
		let { first_name, dob, mobile } = body;
		let filterQueryArray = [];

		filterQueryArray.push(
			`first_name = '${first_name}'  AND dob = '${dob}'`,
		);

		if (body?.last_name) {
			filterQueryArray.push(`last_name = '${body.last_name}'`);
		}

		if (body?.middle_name) {
			filterQueryArray.push(`middle_name = '${body.middle_name}'`);
		}

		const filterQuery = `SELECT mobile,id FROM users WHERE ${filterQueryArray.join(
			' AND ',
		)}`;

		const users_data = (
			await this.hasuraServiceFromServices.executeRawSql(filterQuery)
		)?.result;

		if (users_data == undefined && !users_data) {
			return response.status(200).json({
				message: 'No Data found',
				status: 'success',
				is_mobile_found: false,
			});
		}

		let result =
			this.hasuraServiceFromServices.getFormattedData(users_data);

		// Check if the mobile number sent in the body is present in the result array
		const mobileFound = result.some((user) => user.mobile === mobile);

		if (mobileFound) {
			return response.status(200).json({
				message: 'Data found successfully',
				status: 'success',
				is_mobile_found: true,
				is_data_found: true,
			});
		} else {
			return response.status(200).json({
				message:
					result?.length > 0
						? 'Data found successfully'
						: 'Data not found',
				status: 'success',
				is_mobile_found: false,
				is_data_found: result?.length > 0 ? true : false,
			});
		}
	}
}
