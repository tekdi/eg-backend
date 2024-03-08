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

	public async getUserInfoDetails(request, response) {
		let user_id = request.mw_userid; //get user id from token
		let program_id = request?.mw_program_id; // get program_id from token
		let academic_year_id = request?.mw_academic_year_id; // get academic_year_id from token

		//query to get user details information

		let query = `query MyQuery {
			users_by_pk(id:${user_id}) {
			  first_name
			  middle_name
			  last_name
			  dob
			  aadhar_no
			  mobile
			  alternative_mobile_number
			  email_id
			  state
			  district
			  block
			  grampanchayat
			  village
			  pincode
			  gender
			  username
			  mobile_no_verified
			  long
			  lat
			  keycloak_id
			  is_deactivated
			  is_duplicate
			  email_verified
			  duplicate_reason
			  aadhar_verified
			  aadhar_token
			  aadhaar_verification_mode
			  profile_photo_1
			  profile_photo_1_documents: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
				name
				doument_type
				document_sub_type
				document_id: id
				path
			  }
			  profile_photo_2
			  profile_photo_2_documents: documents(where: {document_sub_type: {_eq: "profile_photo_2"}}) {
				name
				doument_type
				document_sub_type
				document_id: id
				path
			  }
			  profile_photo_3
			  profile_photo_3_documents: documents(where: {document_sub_type: {_eq: "profile_photo_3"}}) {
				name
				doument_type
				document_sub_type
				document_id: id
				path
			  }
			  core_faciltator {
				device_type
				device_ownership
				has_diploma
				diploma_details
				pan_no
				sourcing_channel
			  }
			  extended_users {
				marital_status
				social_category
				designation
				qualification_id
			  }
			  references(where: {context: {_eq: "users"}}) {
				name
				designation
				contact_number
				context
			  }
			  program_faciltators(where: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}) {
				id
				parent_ip
				documents_status
				has_social_work_exp
                police_verification_done
				social_background_verified_by_neighbours
				village_knowledge_test
				status
				form_step_number 
				availability
				qualification_ids
			  }
			  experience(where: {type: {_eq: "experience"}}) {
				id
				type
				role_title
				organization
				description
				experience_in_years
				related_to_teaching
				references(where: {context: {_eq: "experience"}}) {
			      id
				  name
				  contact_number
				  type_of_document
				  document_id
				  document_reference {
					document_id: id
					name
					document_sub_type
					doument_type
					path
					provider
					context
					context_id
				  }
				}
			  }
			  qualifications{
				id
				end_year
				institution
				start_year
				qualification_master_id
				qualification_reference_document_id
				document_reference{
				  document_id:id
				  name
				  path
				  provider
				  context
				  context_id
				}
			    qualification_master{
				context
				context_id
				created_by
				id
				name
				type
				updated_by
			  }
			}
		}
		  }
		  `;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let user_data = hasura_response?.data;

		// get profile photo document details
		let profilePhoto1Documents =
			user_data?.users_by_pk?.profile_photo_1_documents;

		let profilePhoto2Documents =
			user_data?.users_by_pk?.profile_photo_2_documents;

		let profilePhoto3Documents =
			user_data?.users_by_pk?.profile_photo_3_documents;

		//  modifiy individual profile photo document details as required

		let profile_photo_1_info = {
			name: user_data?.users_by_pk?.profile_photo_1,
			documents: {
				base64: null,
				document_id: profilePhoto1Documents?.[0].document_id,
				name: profilePhoto1Documents?.[0].name,
				document_type: profilePhoto1Documents?.[0].doument_type,
				document_sub_type:
					profilePhoto1Documents?.[0].document_sub_type,
			},
		};

		let profile_photo_2_info = {
			name: user_data?.users_by_pk?.profile_photo_1,
			documents: {
				base64: null,
				document_id: profilePhoto2Documents?.[0].document_id,
				name: profilePhoto2Documents?.[0].name,
				document_type: profilePhoto2Documents?.[0].doument_type,
				document_sub_type:
					profilePhoto2Documents?.[0].document_sub_type,
			},
		};

		let profile_photo_3_info = {
			name: user_data?.users_by_pk?.profile_photo_1,
			documents: {
				base64: null,
				document_id: profilePhoto3Documents?.[0].document_id,
				name: profilePhoto3Documents?.[0].name,
				document_type: profilePhoto3Documents?.[0].doument_type || null,
				document_sub_type:
					profilePhoto3Documents?.[0].document_sub_type,
			},
		};

		if (!user_data?.users_by_pk) {
			user_data.users_by_pk = {}; // Initialize as an empty object if it doesn't exist
		}
		// Replacing profile_photo_documents with profile_photo for all details
		user_data.users_by_pk.profile_photo_1 = profile_photo_1_info;
		user_data.users_by_pk.profile_photo_2 = profile_photo_2_info;
		user_data.users_by_pk.profile_photo_3 = profile_photo_3_info;

		// Removing profile_photo_documents object
		delete user_data.users_by_pk.profile_photo_1_documents;
		delete user_data.users_by_pk.profile_photo_2_documents;
		delete user_data.users_by_pk.profile_photo_3_documents;

		// Iterate through the experience array and update references document_reference to documents
		user_data?.users_by_pk?.experience?.forEach((exp) => {
			exp.references = exp?.references?.reduce((acc, ref) => {
				const documents = ref?.document_reference
					? {
							base64: null,
							document_id: ref?.document_reference?.document_id,
							name: ref?.document_reference?.name,
							document_sub_type:
								ref?.document_reference?.document_sub_type,
							document_type:
								ref?.document_reference?.doument_type,
					  }
					: {};

				delete ref?.document_reference; // Remove document_reference

				return { ...acc, ...ref, documents };
			}, {});
		});

		user_data.users_by_pk.qualifications =
			user_data?.users_by_pk?.qualifications?.reduce((acc, q) => {
				const documents = q.document_reference
					? {
							base64: q?.document_reference?.base64,
							document_id: q?.document_reference?.document_id,
							name: q?.document_reference?.name,
					  }
					: {};

				delete q.document_reference; // Remove document_reference

				return { ...acc, ...q, documents };
			}, {});

		user_data.users_by_pk.program_faciltators =
			user_data?.users_by_pk?.program_faciltators?.reduce((acc, pf) => {
				pf ? pf : {};

				return { ...acc, ...pf };
			}, {});

		user_data.users_by_pk.references =
			user_data?.users_by_pk?.references?.reduce((acc, rf) => {
				rf ? rf : {};

				return { ...acc, ...rf };
			}, {});

		const {
			first_name,
			middle_name,
			last_name,
			dob,
			aadhar_no,
			mobile,
			alternative_mobile_number,
			email_id,
			district,
			block,
			grampanchayat,
			village,
			pincode,
			gender,
			profile_photo_1,
			profile_photo_2,
			profile_photo_3,
		} = user_data?.users_by_pk || {};

		const formattedData = {
			users: {
				first_name,
				middle_name,
				last_name,
				dob,
				aadhar_no,
				mobile,
				alternative_mobile_number,
				email_id,
				district,
				block,
				grampanchayat,
				village,
				pincode,
				gender,
				profile_photo_1,
				profile_photo_2,
				profile_photo_3,
			},
			core_faciltator: user_data?.users_by_pk?.core_faciltator,
			extended_users: user_data?.users_by_pk?.extended_users,
			references: user_data?.users_by_pk?.references,
			program_faciltators: user_data?.users_by_pk?.program_faciltators,
			experience: user_data?.users_by_pk?.experience,
			qualifications: user_data?.users_by_pk?.qualifications,
			qualification_master: user_data?.users_by_pk?.qualification_master,
		};

		if (user_data) {
			return response.status(200).json({
				message: 'Data retrieved successfully!',
				data: formattedData,
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
		let profile_photo_fields_1;
		let documents_fields_1;
		let profile_photo_fields_2;
		let documents_fields_2;
		let profile_photo_fields_3;
		let documents_fields_3;
		let profile_photo_1_value;
		let documents_values_1;
		let profile_photo_2_value;
		let documents_values_2;
		let profile_photo_3_value;
		let documents_values_3;
		let profile_documents_array = [];
		let qualification_document_data;

		for (const key in json) {
			const value = json[key];

			if (typeof value === 'object') {
				tableName = key;
				tableFields = Object.keys(value);
				for (const subKey in value) {
					const subValue = value[subKey];

					if (typeof subValue === 'object') {
						// Separate the subobjects of profile_photo_1 and documents
						if (subKey === 'profile_photo_1') {
							profile_photo_1_value = Object.values(subValue);

							documents_values_1 = Object.values(
								subValue.documents,
							);

							profile_documents_array.push({
								document_id: documents_values_1?.[1],
								name: documents_values_1?.[2],
								doument_type: documents_values_1?.[3],
								document_sub_type: documents_values_1?.[4],
							});

							// Add profile_photo_1 with its name value for inserting in users table
							value['profile_photo_1'] =
								profile_photo_1_value?.[0];
						}
						if (subKey === 'profile_photo_2') {
							profile_photo_2_value = Object.values(subValue);

							documents_values_2 = Object.values(
								subValue.documents,
							);

							profile_documents_array.push({
								document_id: documents_values_2?.[1],
								name: documents_values_2?.[2],
								doument_type: documents_values_2?.[3],
								document_sub_type: documents_values_2?.[4],
							});

							// Add profile_photo_2 with its name value for inserting in users table
							value['profile_photo_2'] =
								profile_photo_2_value?.[0];
						}
						if (subKey === 'profile_photo_3') {
							profile_photo_3_value = Object.values(subValue);

							documents_values_3 = Object.values(
								subValue.documents,
							);

							profile_documents_array.push({
								document_id: documents_values_3?.[1],
								name: documents_values_3?.[2],
								doument_type: documents_values_3?.[3],
								document_sub_type: documents_values_3?.[4],
							});

							// Add profile_photo_3 with its name value for inserting in users table
							value['profile_photo_3'] =
								profile_photo_3_value?.[0];
						}
					}
				}
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

			if (tableName == 'qualifications') {
				console.log('qualvalue-->', value);
				if (value?.documents) {
					qualification_document_data = {
						document_id: value?.documents?.document_id,
						name: value?.documents?.name,
						document_sub_type: 'qualifications',
						doument_type: 'qualifications',
						context: 'qualifications',
					};
				}
				tableFields = tableFields?.filter(
					(field) => field !== 'documents',
				);
				delete value?.documents;
				console.log('qualvalue123-->', value);
			}

			let response = await this.findExisitingReccord(
				tableName,
				value,
				user_id,
			);

			set_update = response?.set_update;
			update_id = response?.id;

			let upsert_records_result = await this.upsertRecords(
				set_update,
				tableName,
				tableFields,
				value,
				user_id,
				update_id,
			);

			console.log('upsert_records_result-->>', upsert_records_result);

			if (tableName == 'users' && profile_documents_array?.length > 0) {
				await this.upsertProfileDocuments(profile_documents_array);
			}

			if (tableName == 'qualifications' && qualification_document_data) {
				let result = await this.upsertRecords(
					1,
					'documents',
					[
						'name',
						'document_sub_type',
						'doument_type',
						'context',
						'context_id',
						'user_id',
					],
					qualification_document_data,
					user_id,
					qualification_document_data?.document_id,
				);

				console.log('result doc-->>.', result);
			}
		}

		return true;
	}

	public async processJsonArray(values, tableName, user_id) {
		let set_update;
		let update_id;
		let referenceFields;
		let referenceData;
		let documentFields;
		let documentData;
		let result;

		for (const obj of values) {
			let tableFields = Object.keys(obj);
			tableFields.push('user_id');
			obj.user_id = user_id;

			set_update = obj?.id ? 1 : 0;
			update_id = obj?.id;

			console.log('set->.', set_update);
			if (set_update == 1) {
				tableFields.push('id');
			}

			if (tableName == 'experience') {
				if ('references' in obj) {
					// Process 'references' array differently
					referenceFields = [
						'name',
						'contact_number',
						'type_of_document',
					];
					referenceData = {
						name: obj?.references.name,
						contact_number: obj?.references.contact_number,
						type_of_document: obj?.references.type_of_document,
						id: obj?.references?.id,
						context: 'experience',
					};

					if (set_update == 1) {
						referenceData.context_id = obj?.id;
					}
				}

				if ('documents' in obj.references) {
					documentFields = [
						'name',
						'document_sub_type',
						'doument_type',
						'context',
					];
					documentData = {
						name: obj?.references?.documents?.name,
						document_sub_type:
							obj?.references?.documents?.document_sub_type,
						doument_type: obj?.references?.documents?.document_type,
						id: obj?.references?.documents?.document_id,
						context: 'reference',
					};
				}

				// remove references object from the main object to process the experience object
				tableFields = tableFields?.filter(
					(field) => field !== 'references',
				);
				delete obj?.references;
			}

			result = await this.upsertRecords(
				set_update,
				tableName,
				tableFields,
				obj,
				user_id,
				update_id,
			);

			if (tableName == 'experience' && referenceData) {
				let update_id = referenceData?.id;
				set_update = update_id ? 1 : 0;
				if (!obj?.id) {
					referenceData.context_id = result?.experience?.id;
				}
				let result1 = await this.upsertRecords(
					set_update,
					'references',
					referenceFields,
					referenceData,
					user_id,
					update_id,
				);

				if (documentData) {
					let update_id = documentData?.id;
					let result2 = await this.upsertRecords(
						1,
						'documents',
						documentFields,
						documentData,
						user_id,
						update_id,
					);
				}
			}
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
		let result;
		if (set_update == 1 && id) {
			result = await this.hasuraService.q(
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
			result = await this.hasuraService.q(
				tableName,
				{
					...value,
				},
				tableFields,
				false,
				[tableFields],
			);
		}

		return result;
	}

	public async upsertProfileDocuments(profileDocumentArray) {
		for (const profileDocument of profileDocumentArray) {
			let result = await this.hasuraService.q(
				'documents',
				{
					...profileDocument,
					id: profileDocument.document_id,
				},
				['name', 'document_sub_type', 'doument_type', 'id'],
				true,
				['name', 'document_sub_type', 'doument_type', 'id'],
			);

			console.log('resuklt-->>', result);
		}
	}
}
