import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserHelperService } from 'src/helper/userHelper.service';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { KeycloakService } from 'src/services/keycloak/keycloak.service';
import { AuthService } from 'src/modules/auth/auth.service';

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
}