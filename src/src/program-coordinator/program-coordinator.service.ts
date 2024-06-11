import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserHelperService } from 'src/helper/userHelper.service';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { KeycloakService } from 'src/services/keycloak/keycloak.service';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class ProgramCoordinatorService {
	constructor(
		private readonly keycloakService: KeycloakService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private readonly hasuraService: HasuraService,
		private readonly userHelperService: UserHelperService,
		private authService: AuthService,
	) {}

	public async programCoordinatorRegister(body, request, response, role) {
		let ip_id = request?.mw_userid;
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let query;
		let hasura_response;

		query = `query MyQuery {
            program_users(where: {academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq:${program_id}}, user_id: {_eq:${ip_id}},role_slug:{_eq:"staff"}}){
              id
              organisation_id
            }
          }
          `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_users_data = hasura_response?.data?.program_users;

		if (program_users_data?.length == 0) {
			return response.status(422).send({
				success: false,
				message: 'Not a valid Ip user',
				data: {},
			});
		}

		if (role === 'program_coordinator') {
			//validation to check if the mobile exists for another facilitator

			query = `query MyQuery {
                users(where: {mobile: {_eq: "${body?.mobile}"}}) {
                  id
                  mobile
                }
              }
      
			  `;
			hasura_response = await this.hasuraServiceFromServices.getData({
				query: query,
			});

			let users = hasura_response?.data?.users;

			if (users?.length > 0) {
				return response.status(422).send({
					success: false,
					message: 'Mobile Number Already Exist',
					data: {},
				});
			}

			//get organisation details for ip
			query = `query MyQuery {
                program_users(where: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}, user_id: {_eq:${ip_id}}}){
                  id
                  organisation_id
                }
              }
              
			  `;
			hasura_response = await this.hasuraServiceFromServices.getData({
				query: query,
			});

			let org_id =
				hasura_response?.data?.program_users?.[0]?.organisation_id;

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

			if (role == 'program_coordinator') {
				group = `program_coordinator`;
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
					let role_id;

					body.role = role;

					const result = await this.authService.newCreate(body);

					let user_id = result?.data?.id;
					if (body?.qualification) {
						// get datafrom qulification name get id
						const data = {
							query: `query MyQuery {
								qualification_masters(where: {name: {_eq: "${body?.qualification}"}}) {
									id
								}
							}`,
						};

						const hasura_response =
							await this.hasuraServiceFromServices.getData(data);

						const qualification_master_id =
							hasura_response?.data?.qualification_masters?.[0]
								?.id; // Access first element's id

						await this.hasuraService.q(
							`qualifications`,
							{
								user_id,
								qualification_master_id,
							},
							['user_id', 'qualification_master_id'],
						);
					}
					if (role === 'program_coordinator') {
						const data = {
							query: `query MyQuery {
								roles(where: { slug: {_eq: "program_coordinator"}}) {
									id
								}
							}`,
						};
						const hasura_response =
							await this.hasuraServiceFromServices.getData(data);
						role_id = hasura_response?.data?.roles?.[0]?.id;

						await this.hasuraService.q(
							`user_roles`,
							{
								user_id,
								status: 'active',
								role_id: role_id,
								role_slug: 'program_coordinator',
								program_id: program_id,
								academic_year_id: academic_year_id,
							},
							[
								'user_id',
								'status',
								'role_id',
								'role_slug',
								'program_id',
								'academic_year_id',
							],
						);

						await this.hasuraService.q(
							`program_users`,
							{
								user_id: user_id,
								status: 'pragati_coordinator',
								role_id: role_id,
								role_slug: 'program_coordinator',
								program_id: program_id,
								academic_year_id: academic_year_id,
								created_by: ip_id,
								updated_by: ip_id,
								organisation_id: org_id,
								ip_user_id: ip_id,
							},
							[
								'user_id',
								'status',
								'role_id',
								'role_slug',
								'program_id',
								'academic_year_id',
								'created_by',
								'updated_by',
								'organisation_id',
								'ip_user_id',
							],
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

	public async getProgramCoordinatorDetails(
		id: any,
		body: any,
		request: any,
		response: any,
	) {
		let query;
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let ip_id = request?.mw_userid;
		let hasura_response;
		let program_facilitators = [];

		//validation for ip

		query = `query MyQuery {
            program_users(where: {academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq:${program_id}}, user_id: {_eq:${ip_id}},role_slug:{_eq:"staff"}}){
              id
              organisation_id
            }
          }
          `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_users_data = hasura_response?.data?.program_users;

		if (program_users_data?.length == 0) {
			return response.status(422).send({
				success: false,
				message: 'Not a valid Ip user',
				data: {},
			});
		}

		//query to get program coordinator details

		query = `query MyQuery {
            users(where: {id: {_eq: ${id}}, program_users: {ip_user_id: {_eq:${ip_id}}}}) {
              user_id: id
			  first_name
			  middle_name
			  last_name
              address
              state
              district
              village
              block
              grampanchayat
              mobile
              program_users(where: {ip_user_id: {_eq:${ip_id}}, program_facilitators: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}}) {
                program_facilitators {
                  facilitator_id: id
                  status
                  user {
                    first_name
                    last_name
                    district
                    aadhar_verified
                    mobile
                    gender
                  }
                }
              }
            }
          }
          `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_coordinator_data = hasura_response?.data;

		// Extract users and program facilitators
		let users = [];
		let facilitators = [];

		if (program_coordinator_data?.users) {
			program_coordinator_data.users.forEach((user) => {
				users.push({
					user_id: user.user_id,
					address: user.address,
					state: user.state,
					district: user.district,
					village: user.village,
					block: user.block,
					grampanchayat: user.grampanchayat,
					mobile: user.mobile,
				});

				if (user.program_users) {
					user.program_users.forEach((program_user) => {
						if (program_user.program_facilitators) {
							program_user.program_facilitators.forEach(
								(facilitator) => {
									facilitators.push({
										facilitator_id:
											facilitator.facilitator_id,
										status: facilitator.status,
										user: {
											first_name:
												facilitator.user.first_name,
											last_name:
												facilitator.user.last_name,
											district: facilitator.user.district,
											aadhar_verified:
												facilitator.user
													.aadhar_verified,
											mobile: facilitator.user.mobile,
											gender: facilitator.user.gender,
										},
									});
								},
							);
						}
					});
				}
			});
		}

		return response.status(200).send({
			success: true,
			data: {
				users: users,
				facilitators: facilitators,
				preraks_assigned: facilitators?.length,
			},
		});
	}

	public async getProgramCoodinatorList(body, request, response) {
		let ip_id = request?.mw_userid;
		let program_id = request?.mw_program_id;
		let academic_year_id = request?.mw_academic_year_id;
		let query;
		let hasura_response;
		let filter = [`ip_user_id: {_eq:${ip_id}}`];

		// validation to check
		query = `query MyQuery {
	        program_users(where: {academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq:${program_id}}, user_id: {_eq:${ip_id}},role_slug:{_eq:"staff"}}){
	          id
	          organisation_id
	        }
	      }
	      `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_users_data = hasura_response?.data?.program_users;

		if (program_users_data?.length == 0) {
			return response.status(422).send({
				success: false,
				message: 'Not a valid Ip user',
				data: {},
			});
		}

		// query to get the program coordinator data under the given ip user

		if (body?.search) {
			if (body?.search?.first_name && !body?.search?.last_name) {
				filter.push(
					`users:{first_name:{_eq:"${body?.search?.first_name}"}}`,
				);
			}
			if (body?.search?.last_name && !body?.search?.first_name) {
				filter.push(
					`users:{last_name:{_eq:"${body?.search?.last_name}"}}`,
				);
			}

			if (body?.search?.last_name && body?.search?.first_name) {
				filter.push(
					`users:{last_name:{_eq:"${body?.search?.last_name}"},first_name:{_eq:"${body?.search?.first_name}"}}`,
				);
			}
		}

		query = `query MyQuery {
			program_users(where:{${filter}}){
			  users{
				user_id:id
				first_name
				last_name
				middle_name
				mobile
				email_id
				state
				district
					  
			  }
			}
		  }
		  
	      `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_coordinator_data = hasura_response?.data?.program_users;

		if (program_coordinator_data?.length == 0) {
			return response.status(422).json({
				success: false,
				message: 'Data not found',
				data: [],
			});
		} else {
			// Extract user data from each object
			const userData = program_coordinator_data?.map((obj) => obj?.users);
			return response.status(200).json({
				success: true,
				message: 'Data retrieved successfully',
				data: userData,
			});
		}
	}

	public async getAvailableFacilitatorList(id, body, request, response) {
		let query;
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let ip_id = request?.mw_userid;
		let hasura_response;
		let program_facilitators = [];

		//validation for ip

		query = `query MyQuery {
            program_users(where: {academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq:${program_id}}, user_id: {_eq:${ip_id}},role_slug:{_eq:"staff"}}){
              id
              organisation_id
            }
          }
          `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_users_data = hasura_response?.data?.program_users;

		if (program_users_data?.length == 0) {
			return response.status(422).send({
				success: false,
				message: 'Not a valid Ip user',
				data: {},
			});
		}

		//query to get program coordinator details

		query = `query MyQuery {
            users(where: {id: {_eq: ${id}}, program_users: {ip_user_id: {_eq:${ip_id}}}}) {
              user_id: id
			  first_name
			  middle_name
			  last_name
              address
              state
              district
              village
              block
              grampanchayat
              mobile
             }
          }
          `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		console.log('query-->.', query);

		let program_coordinator_data = hasura_response?.data?.users;

		//get organisation id for the IP for the selected cohort.

		//get organisation details for ip
		query = `query MyQuery {
			program_users(where: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}, user_id: {_eq:${ip_id}}}){
			  id
			  organisation_id
			}
		  }
		  
		  `;
		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let org_id = hasura_response?.data?.program_users?.[0]?.organisation_id;

		//get list of available prerak list for given cohort.

		query = `query MyQuery {
		program_faciltators(where: {parent_ip: {_eq: "${org_id}"}, program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}, pc_id: {_is_null: true}}) {
		  user_id
		  pc_id
		  parent_ip
		  academic_year_id
		  program_id
		  status
		  user {
			id
			first_name
			middle_name
			last_name
			state
			district
			gender
			aadhar_verified
			mobile
		  }
		}
	  }
	  `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_facilitator_data =
			hasura_response?.data?.program_faciltators;

		if (program_coordinator_data?.length == 0) {
			return response.status(422).json({
				message: 'Data not found',
				data: {
					program_coordinator_data: [],
					program_facilitator_data: [],
				},
			});
		}

		return response.status(200).json({
			message: 'Data retrieved12 successfully',
			data: {
				program_coordinator_data: program_coordinator_data,
				program_facilitator_data: program_facilitator_data,
			},
		});
	}

	public async updateProgramCoordinatorToFacilitator(
		id: any,
		body: any,
		request: any,
		response: any,
	) {
		let ip_id = request?.mw_userid;
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let facilitator_id = body?.facilitator_id;
		let edit_action = body?.edit_action;
		let pc_id = id;
		let query;
		let hasura_response;

		//validation to check if the IP is valid

		query = `query MyQuery {
			users(where: {id: {_eq:${ip_id}}, program_users: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}}) {
			  id
			}
		  }`;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let users_data = hasura_response?.data?.users;

		if (users_data?.length == 0) {
			return response.status(422).send({
				success: false,
				message: 'Not a valid Ip user',
				data: {},
			});
		}

		//get organisation details for ip
		query = `query MyQuery {
			program_users(where: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}, user_id: {_eq:${ip_id}}}){
			  id
			  organisation_id
			}
		  }
		  
		  `;
		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let org_id = hasura_response?.data?.program_users?.[0]?.organisation_id;

		// validation to check if the Facilitator_ids belong to same IP

		query = `query MyQuery2 {
			program_faciltators_aggregate(where: {parent_ip: {_eq: "${org_id}"}, program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}, user_id: {_in:[${facilitator_id}]}}) {
			  aggregate {
				count
			  }
			}
		  }`;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let facilitator_count =
			hasura_response?.data?.program_faciltators_aggregate?.aggregate
				?.count;

		if (facilitator_count != facilitator_id?.length) {
			return response.status(422).send({
				success: false,
				message: 'Please provide valid facilitator data',
				data: {},
			});
		}

		if (edit_action == 'add_facilitator') {
			facilitator_id?.forEach(async (facilitator) => {
				let validation_query = `query MyQuery3{
					program_faciltators(where: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}, user_id: {_eq:${facilitator}}}){
					  id
					  user_id
					}
				  }`;

				hasura_response = await this.hasuraServiceFromServices.getData({
					query: validation_query,
				});

				let id = hasura_response?.data?.program_faciltators?.[0]?.id;

				//assign prerak to program coordinator

				await this.hasuraService.q(
					`program_faciltators`,
					{
						pc_id: pc_id,
						id: id,
					},

					['pc_id'],
					true,
					['id', 'pc_id'],
				);
			});
		} else if (edit_action == 'remove_facilitator') {
			facilitator_id?.forEach(async (facilitator) => {
				let validation_query = `query MyQuery3{
					program_faciltators(where: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}, user_id: {_eq:${facilitator}}}){
					  id
					  user_id
					}
				  }`;

				hasura_response = await this.hasuraServiceFromServices.getData({
					query: validation_query,
				});

				let id = hasura_response?.data?.program_faciltators?.[0]?.id;

				//assign prerak to program coordinator

				await this.hasuraService.q(
					`program_faciltators`,
					{
						pc_id: null,
						id: id,
					},

					['pc_id'],
					true,
					['id', 'pc_id'],
				);
			});
		}

		return response.status(200).json({
			message: 'Successfully updated data',
			data: facilitator_id,
		});
	}
}
