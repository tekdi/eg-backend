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
		let userFilter = [];

		if (body?.search) {
			if (body.search) {
				let first_name = body.search.split(' ')[0];
				let last_name = body.search.split(' ')[1] || '';

				if (last_name?.length > 0) {
					userFilter.push(`
				first_name: { _ilike: "%${first_name}%" }, 
			  last_name: { _ilike: "%${last_name}%" } 
				  `);
				} else {
					userFilter.push(
						`first_name: { _ilike: "%${first_name}%" }`,
					);
				}
			}

			if (body.district) {
				userFilter.push(`district: {_eq: "${body.district}"}`);
			}
			if (body.block) {
				userFilter.push(`block: {_eq: "${body.block}"}`);
			}
		}
		let filter = [];
		if (userFilter.length > 0) {
			filter.push(`user: {${userFilter.join(', ')}}`);
		}

		let filterQuery = filter.join(', ');

		// Pagination parameters
		const limit = body.limit || 10;
		const page = body.page || 1;
		const offset = (page - 1) * limit;
		//query to get program coordinator details

		query = `
		query MyQuery {
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
						email_id
						program_users(where: {ip_user_id: {_eq:${ip_id}}, program_facilitators: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}}) {
								program_facilitators(where: {${filterQuery}}, limit: ${limit}, offset: ${offset})  {
										facilitator_id: id
										status
										user {
												first_name
												middle_name
												last_name
												district
												aadhar_verified
												mobile
												gender
												email_id
										}
								}
						}
				}
				users_aggregate(where: {id: {_eq: ${id}}, program_users: {ip_user_id: {_eq:${ip_id}}}}) {
						aggregate {
								count
						}
				}
				program_faciltators_aggregate(where:{pc_id:{_eq:${id}}}){
					aggregate{
						count
					}
		}
	}
`;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const preraks_assigned =
			hasura_response?.data?.program_faciltators_aggregate?.aggregate
				?.count;

		let program_coordinator_data = hasura_response?.data;
		if (
			!program_coordinator_data ||
			!program_coordinator_data.users ||
			program_coordinator_data.users.length === 0
		) {
			return response.status(422).json({
				success: false,
				message: 'Data not found',
				data: {},
			});
		}
		// Extract users and program facilitators
		let users = [];
		let facilitators = [];
		let total_count =
			hasura_response?.data?.users_aggregate?.aggregate?.count || 0;
		const totalPages = Math.ceil(total_count / limit);
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
					email_id: user.email_id,
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
											email_id: facilitator.user.email_id,
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
				preraks_assigned: preraks_assigned,
				total_count: preraks_assigned,
				limit: limit,
				totalPages: totalPages,
				currentPage: page,
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
		let userFilter = [];

		if (body?.search) {
			if (body.search) {
				let first_name = body.search.split(' ')[0];
				let last_name = body.search.split(' ')[1] || '';

				if (last_name?.length > 0) {
					userFilter.push(`
				first_name: { _ilike: "%${first_name}%" }, 
			  last_name: { _ilike: "%${last_name}%" } 
				  `);
				} else {
					userFilter.push(
						`first_name: { _ilike: "%${first_name}%" }`,
					);
				}
			}

			if (body.district) {
				userFilter.push(`district: {_eq: "${body.district}"}`);
			}
			if (body.block) {
				userFilter.push(`block: {_eq: "${body.block}"}`);
			}
		}

		if (userFilter.length > 0) {
			filter.push(`users: {${userFilter.join(', ')}}`);
		}

		let filterQuery = filter.join(', ');
		// Pagination parameters
		const limit = body.limit || 10;
		const page = body.page || 1;
		const offset = (page - 1) * limit;

		query = ` query MyQuery {
			program_users_aggregate(where: {${filterQuery}}) {
					aggregate {
							count
					}
			}
			program_users(where: {${filterQuery}}, limit: ${limit}, offset: ${offset}) {
			  users{
				user_id:id
				first_name
				last_name
				middle_name
				mobile
				email_id
				state
				district
				block
			  }
			}
		  }

		    `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_coordinator_data = hasura_response?.data?.program_users;
		let total_count =
			hasura_response?.data?.program_users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(total_count / limit);
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
				total_count: total_count,
				limit: limit,
				totalPages: totalPages,
				currentPage: page,
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
			  email_id
             }
          }
          `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

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
		let userFilter = [];

		if (body?.search) {
			if (body.search) {
				let first_name = body.search.split(' ')[0];
				let last_name = body.search.split(' ')[1] || '';

				if (last_name?.length > 0) {
					userFilter.push(`
                    first_name: { _ilike: "%${first_name}%" }, 
                    last_name: { _ilike: "%${last_name}%" } 
                `);
				} else {
					userFilter.push(
						`first_name: { _ilike: "%${first_name}%" }`,
					);
				}
			}
		}
		if (body.district) {
			userFilter.push(`district: { _eq: "${body.district}" }`);
		}

		if (body.block) {
			userFilter.push(`block: { _eq: "${body.block}" }`);
		}

		let filterQuery =
			userFilter.length > 0 ? `, user: { ${userFilter.join(', ')} }` : '';

		// Pagination parameters
		const limit = body.limit || 10;
		const page = body.page || 1;
		const offset = (page - 1) * limit;

		query = `query MyQuery {
		program_faciltators(where: {parent_ip: {_eq: "${org_id}"}, program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}, pc_id: {_is_null: true}${filterQuery}},limit: ${limit}, offset: ${offset}) {
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
			email_id
		  }
		}
		program_faciltators_aggregate(
			where: {
					parent_ip: {_eq: "${org_id}"},
					program_id: {_eq:${program_id}},
					academic_year_id: {_eq:${academic_year_id}},
					pc_id: {_is_null: true}${filterQuery}
			}
	) {
			aggregate {
					count
			}
	}
	  }
	  `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_facilitator_data =
			hasura_response?.data?.program_faciltators;
		let total_count =
			hasura_response?.data?.program_faciltators_aggregate?.aggregate
				?.count;

		const totalPages = Math.ceil(total_count / limit);
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
			message: 'Data retrieved successfully',
			data: {
				program_coordinator_data: program_coordinator_data,
				program_facilitator_data: program_facilitator_data,
				preraks_assigned: program_facilitator_data?.length,
				total_count: total_count,
				limit: limit,
				totalPages: totalPages,
				currentPage: page,
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

	public async getFacilitatorsListForProgramCoordinator(
		body: any,
		request: any,
		response: any,
	) {
		let query;
		let pc_id = request?.mw_userid;

		let hasura_response;

		let userFilter = [];

		//filters

		userFilter.push(`pc_id:{_eq:${pc_id}}`);

		let filterQuery = userFilter.join(', ');

		// Pagination parameters
		const limit = body?.limit || 10;
		const page = body?.page || 1;
		const offset = (page - 1) * limit;
		//query to get program coordinator details

		query = `
		query MyQuery {
			program_faciltators(where: {${filterQuery}},limit:${limit},offset:${offset}) {
				user_id
				academic_year_id
				academic_year{
				  name
				}
				program_id
				program {
				  name
				}
				status
				user {
				  first_name
				  middle_name
				  last_name
				}
			}
			program_faciltators_aggregate(where: {${filterQuery}}) {
				aggregate {
				  count
				}
			  }
		  }
		  
`;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const facilitator_data = hasura_response?.data?.program_faciltators;
		const total_count =
			hasura_response?.data?.program_faciltators_aggregate?.aggregate
				?.count || 0;

		if (facilitator_data?.length === 0) {
			return response.status(422).json({
				success: false,
				message: 'Data not found',
				data: {},
			});
		}

		const totalPages = Math.ceil(total_count / limit);

		return response.status(200).send({
			success: true,
			data: {
				facilitator_data: facilitator_data,
				total_count: total_count,
				limit: limit,
				totalPages: totalPages,
				currentPage: page,
			},
		});
	}

	public async getLearnerListDetailsForProgramCoordinator(
		body,
		request,
		response,
	) {
		let pc_id = request?.mw_userid;
		let query;
		let hasura_response;
		let pc_string = '';
		const limit = body?.limit || 10;
		const page = body?.page || 1;
		const offset = (page - 1) * limit;
		let learner_data;
		let learner_info;

		let userFilter = [];

		// filters
		userFilter.push(`pc_id:{_eq:${pc_id}}`);

		let filterQuery = userFilter.join(', ');

		let pc_facilitator_list = body?.facilitator_list
			? body?.facilitator_list
			: [];

		if (pc_facilitator_list?.length == 0) {
			query = `
        query MyQuery {
            program_faciltators(where: {${filterQuery}}, limit:${limit}, offset:${offset}) {
                user_id
                academic_year_id
                academic_year {
                  name
                }
                program_id
                program {
                  name
                }
                status
                user {
                  first_name
                  middle_name
                  last_name
                }
            }
            program_faciltators_aggregate(where: {${filterQuery}}) {
                aggregate {
                  count
                }
              }
          }
        `;

			hasura_response = await this.hasuraServiceFromServices.getData({
				query: query,
			});
			pc_facilitator_list = hasura_response?.data?.program_faciltators;
		}

		if (pc_facilitator_list && pc_facilitator_list.length > 0) {
			for (let i = 0; i < pc_facilitator_list.length; i++) {
				let temp_prerak_list = pc_facilitator_list[i];
				if (i == 0) {
					pc_string =
						pc_string +
						`'${temp_prerak_list?.user_id} ${temp_prerak_list?.academic_year_id} ${temp_prerak_list?.program_id}'`;
				} else {
					pc_string =
						pc_string +
						`,'${temp_prerak_list?.user_id} ${temp_prerak_list?.academic_year_id} ${temp_prerak_list?.program_id}'`;
				}
			}
		}

		if (pc_string != null || pc_string != undefined) {
			let search = body?.search;
			let status = body?.status;
			let sort = body?.sort ? body?.sort : 'ASC';
			let additionalFilters = '';

			if (search) {
				additionalFilters += `AND (u.first_name LIKE '%${search}%' OR u.last_name LIKE '%${search}%' OR CAST(pb.user_id AS VARCHAR) = '${search}') `;
			}

			if (status) {
				additionalFilters += `AND pb.status = '${status}' `;
			}

			let sql = `
        SELECT pb.user_id, pb.facilitator_id, pb.program_id, pb.academic_year_id, pb.status, pb.enrollment_number, u.first_name, u.last_name,f.first_name AS facilitator_first_name, f.last_name AS facilitator_last_name,pf.academic_year_id as facilitator_academic_id,pf.program_id as facilitator_program_id
        FROM program_beneficiaries pb
        INNER JOIN users u ON pb.user_id = u.id
		INNER JOIN program_faciltators pf ON pb.facilitator_id = pf.user_id
		INNER JOIN users f ON pf.user_id = f.id
        WHERE
            concat(pb.facilitator_id, ' ', pb.academic_year_id, ' ', pb.program_id) IN (${pc_string})
            ${additionalFilters}
        ORDER BY pb.user_id ${sort}
        LIMIT ${limit} OFFSET ${offset}
        `;

			learner_data = (
				await this.hasuraServiceFromServices.executeRawSql(sql)
			)?.result;

			if (learner_data == undefined) {
				return response.status(404).json({
					message: 'Data not found',
					data: [],
				});
			}

			learner_info =
				this.hasuraServiceFromServices.getFormattedData(learner_data);
		}

		return response.status(200).json({
			message: 'Data retrieved successfully',
			data: learner_info,
		});
	}

	//daily activities
	public async activitiesCreate(request: any, body: any, resp: any) {
		try {
			let user_id = request.mw_userid;
			let context = 'pc_users';
			let context_id = request.mw_userid;
			let created_by = request.mw_userid;
			let updated_by = request.mw_userid;
			let academic_year_id = request.mw_academic_year_id;
			let program_id = request.mw_program_id;

			const response = await this.hasuraService.create(
				'activities',
				{
					...body,
					user_id: user_id,
					context: context,
					context_id: context_id,
					created_by: created_by,
					updated_by: updated_by,
					academic_year_id: academic_year_id,
					program_id: program_id,
				},
				[
					'id',
					'user_id',
					'type',
					'activity_data',
					'context',
					'context_id',
					'date',
					'created_by',
					'updated_by',
					'academic_year_id',
					'program_id',
					'description',
					'hours',
					'minutes',
					'village',
				],
			);

			if (response) {
				return resp.status(200).json({
					message: 'Activity created Successfully',
					data: response,
				});
			}
		} catch (error) {
			return resp.json({
				status: 500,
				message: 'Internal server error',
				data: [],
			});
		}
	}
	public async activitiesUpdate(request: any, body: any, resp: any, id: any) {
		try {
			body.updated_by = request.mw_userid;

			const response = await this.hasuraService.q(
				'activities',
				{
					...body,
					id: id,
				},
				[
					'type',
					'date',
					'updated_by',
					'description',
					'hours',
					'minutes',
					'village',
				],
				true,
				[
					'id',
					'user_id',
					'type',
					'activity_data',
					'context',
					'context_id',
					'date',
					'created_by',
					'updated_by',
					'academic_year_id',
					'program_id',
					'description',
					'hours',
					'minutes',
					'village',
				],
			);

			if (response) {
				return resp.status(200).json({
					message: 'Activity Updated Successfully',
					data: response,
				});
			}
		} catch (error) {
			return resp.json({
				status: 500,
				message: 'Internal server error',
				data: [],
			});
		}
	}
	async activitiesDelete(request: any, resp: any, id: any) {
		let user_id = request?.mw_userid;

		if (!id) {
			return resp.status(422).json({
				message: 'Please provide a valid get id',
				data: null,
			});
		}

		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let query = `mutation MyMutation {
            delete_activities_by_pk(id:${id}) {
				id
				user_id
				type
				date
				activity_data
				academic_year_id
				program_id
				context
				context_id
				created_by
				updated_by
            }
          }
                      
          `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.delete_activities_by_pk;

		if (newQdata) {
			return resp.status(200).json({
				success: true,
				message: 'Data deleted successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}
	public async activitiesList(body: any, req: any, resp: any) {
		try {
			const program_id = req.mw_program_id;
			const academic_year_id = req.mw_academic_year_id;
			let context_id = req.mw_userid;
			let context = 'pc_users';
			const page = isNaN(body?.page) ? 1 : parseInt(body?.page);
			const limit = isNaN(body?.limit) ? 15 : parseInt(body?.limit);
			let offset = page > 1 ? limit * (page - 1) : 0;

			const { type, date } = body;
			let filterConditions = '';

			if (type) {
				filterConditions += `, type: {_eq: "${type}"}`;
			}

			if (date) {
				const dateString = date.split('T')[0]; // Extracting only the date part

				filterConditions += `, date: {
				_gte: "${dateString}",
				_lt: "${dateString} 24:00:00"
				}`;
			}

			let query = `query MyQuery {
			activities_aggregate(
				where: {
					context : {_eq:${context}},
					context_id: {_eq: ${context_id}},
					program_id: {_eq: ${program_id}},
					academic_year_id: {_eq: ${academic_year_id}}${filterConditions}
				}
			) {
				aggregate {
					count
				}
			}
			activities(
				where: {
					context_id: {_eq: ${context_id}},
					program_id: {_eq: ${program_id}},
					academic_year_id: {_eq: ${academic_year_id}}${filterConditions}
				}, limit: ${limit}, offset: ${offset},

			) {
				id
				user_id
				type
				date
				activity_data
				academic_year_id
				program_id
				context
				context_id
				created_by
				updated_by
			}
		}`;

			const response = await this.hasuraServiceFromServices.getData({
				query: query,
			});

			const count =
				response?.data?.activities_aggregate?.aggregate?.count;

			const totalPages = Math.ceil(count / limit);
			const newQdata = response?.data?.activities;

			if (newQdata && newQdata.length > 0) {
				return resp.status(200).json({
					success: true,
					message: 'Data found successfully!',
					data: { activities: newQdata },
					totalCount: count,
					limit,
					currentPage: page,
					totalPages: `${totalPages}`,
				});
			} else {
				return resp.status(400).json({
					success: false,
					message: 'Data Not Found',
					data: {},
				});
			}
		} catch (error) {
			console.log('error', error);
			return resp.status(500).json({
				success: false,
				message: 'Internal server error',
				data: {},
			});
		}
	}
}
