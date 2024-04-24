import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { UserService } from 'src/user/user.service';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';

@Injectable()
export class AclHelper {
	constructor(
		@Inject(CACHE_MANAGER) private cacheService: Cache,
		private hasuraServiceFromService: HasuraServiceFromServices,
		private userService: UserService,
	) {}

	private async getRoleActionsMapping() {
		let roleActions = {};

		// 1. Check if data is in cache
		const cachedRoleToActionMapping = await this.cacheService.get(
			'aclRoleToActionMapping',
		);

		if (cachedRoleToActionMapping) {
			roleActions = cachedRoleToActionMapping;
			console.log(
				'### Using Cache for roleActions: ' +
					JSON.stringify(roleActions),
			);
		} else {
			// Get roles, actions from DB
			let query = {
				query: `query GetRolesAndActions {
					roles {
						id
						slug
						actions
					}
				}`,
			};

			const rolesResult = await this.hasuraServiceFromService.postData(
				query,
			);

			// Convert into following format
			/*
			{
				"program_owner": [
				  {"entity": "beneficiary", "actions": ["read", "export.csv"] },
				  {"entity": "camp", "actions": ["read"] },
				  {"entity": "facilitator", "actions": ["read"] }
				],
				"staff": [
				  {"entity": "beneficiary", "actions": [ "create", "edit.own", "edit.status.own", "edit.enrollement.own", "export.csv.own", "read.own", "reassign.own"]},
				  {"entity": "camp", "actions": ["create", "edit.own", "read.own"]},
				  {"entity": "facilitator", "actions": ["create", "edit.own", "edit.status.own", "read.own"]}
				],
				"facilitator": [
				  {"entity": "beneficiary", "actions": ["create", "edit.own", "edit.status.own", "read.own"]},
				  { "entity": "camp", "actions": ["create", "edit.own", "read.own"]}
				]
			  }
			*/

			rolesResult.data.roles.forEach((role) => {
				if (role.actions) {
					roleActions[role.slug] = role.actions;
				}
			});

			console.log(JSON.stringify(roleActions));

			// 2. Add aclRoleToActionMapping into cache
			await this.cacheService.set(
				'aclRoleToActionMapping',
				roleActions,
				process.env.CACHE_ACCESS_CONTROL_TTL,
			);
		}

		return roleActions;
	}

	private async getAllowedActionsByEntityAndRoles(entity, roles) {
		// Get role->actions mapping
		const roleActions = await this.getRoleActionsMapping();
		const actions = new Set();

		roles.forEach((role) => {
			const entityActions = roleActions[role]?.find(
				(item) => item.entity === entity,
			)?.actions;

			if (entityActions) {
				entityActions.forEach((action) => actions.add(action));
			}
		});

		return Array.from(actions);
	}

	private async getAllowedActionsListFromRequiredActions(
		permissionsRequired,
		allowedActions,
	) {
		return allowedActions.filter((action) => {
			// Check for exact matches and prefix matches (e.g., "read.own")
			return permissionsRequired.some((requiredAction) => {
				return action === requiredAction;
			});
		});
	}

	private async checkIfAllActionsContainOwn(actions) {
		return actions.every((action) => action.includes('.own'));
	}

	private async doIHaveBeneficiaryAccess(
		request: any,
		beneficiary_id: number,
	): Promise<boolean> {
		let gqlQuery;

		const user_roles = request.mw_roles;
		const academic_year_id = request.mw_academic_year_id;
		const program_id = request.mw_program_id;
		let filter;
		if (academic_year_id && program_id) {
			filter = {
				program_id: program_id,
				academic_year_id: academic_year_id,
			};
		}
		console.log('### Use roles: ' + user_roles);

		// Validate for PO role
		if (user_roles.includes('program_owners')) {
			return true;
		}

		// Validate for IP role
		if (user_roles.includes('staff')) {
			// 2.1 Validate if this learner is added by Prerak from my IP
			const parent_ip_data = await this.userService.getIpRoleUserById(
				request.mw_userid,
				filter,
			);

			const parent_ip_id =
				parent_ip_data?.program_users?.[0]?.organisation_id;
			gqlQuery = {
				query: `query MyQuery {
					program_beneficiaries (
						where: {
							user_id: {_eq: ${beneficiary_id}},
							facilitator_user: {
								program_faciltators: {
									${
										request.academic_year_id
											? `academic_year_id: {_eq: ${request.mw_academic_year_id}}`
											: ``
									},
									${request.program_id ? `program_id: {_eq: ${request.mw_program_id}}` : ``},
									parent_ip: {_eq: "${parent_ip_id}"}
								}
							},
							${
								request.academic_year_id
									? `academic_year_id: {_eq: ${request.mw_academic_year_id}}`
									: ``
							},
									${request.program_id ? `program_id: {_eq: ${request.mw_program_id}}` : ``}
						}
					) {
						id
						user_id
						academic_year_id
						program_id
					}
				}`,
			};
		}

		// Validate for Faciliator role
		if (user_roles.includes('facilitator')) {
			gqlQuery = {
				query: `query MyQuery {
					program_beneficiaries (
						where: {
							user_id: {_eq: ${beneficiary_id}},
							facilitator_id: {_eq: ${request.mw_userid}},
							${request.mw_program_id ? `program_id: {_eq: ${request.mw_program_id}}` : ``},
							${
								request.academic_year_id
									? `academic_year_id: {_eq: ${request.mw_academic_year_id}}`
									: ``
							}
						}
					){
						id
						user_id
						facilitator_id
						program_id
						academic_year_id
					}
				}`,
			};
		}

		// Fetch data
		console.log(gqlQuery.query);
		const result = await this.hasuraServiceFromService.getData(gqlQuery);

		if (result?.data && result.data['program_beneficiaries'].length > 0) {
			console.log('I have access: true');
			return true;
		} else {
			console.log('I have access: false');
			return false;
		}
	}

	private async doIHavefacilitatorAccess(
		req: any,
		facilitatorId: number,
	): Promise<boolean> {
		let filter;
		if (req.mw_academic_year_id && req.mw_program_id) {
			filter = {
				program_id: req.mw_program_id,
				academic_year_id: req.mw_academic_year_id,
			};
		}
		const parent_ip = await this.userService.getIpRoleUserById(
			req.mw_userid,
			filter,
		);
		const parent_ip_id = parent_ip.program_users[0].organisation_id;
		let gqlQuery = {
			query: `query MyQuery {
				program_faciltators_aggregate (
					where: {
						user_id: {_eq: ${facilitatorId}},
						program_id: {_eq: ${req.mw_program_id}},
						academic_year_id: {_eq: ${req.mw_academic_year_id}},
						parent_ip: {_eq: "${parent_ip_id}"}
					}
				){
					aggregate{
						count
					}
				}
			}`,
		};

		// Fetch data
		const result = await this.hasuraServiceFromService.getData(gqlQuery);
		console.log(gqlQuery.query);

		if (
			result?.data &&
			result.data.program_faciltators_aggregate.aggregate.count > 0
		) {
			return true;
		} else {
			return false;
		}
	}
	private async doIHaveCampAccess(req: any, camp_id: number) {
		const user_roles = req.mw_roles;

		// 1 - PO
		if (user_roles.includes('program_owners')) {
			return true;
		}
		const member_type = 'owner';
		const status = 'active';
		const user_id = req.mw_userid;
		let rolesQuery = `user_id: {_eq: ${user_id}}`;
		const academic_year_id = req.mw_academic_year_id;
		const program_id = req.mw_program_id;
		let filter;
		if (academic_year_id && program_id) {
			filter = {
				program_id: program_id,
				academic_year_id: academic_year_id,
			};
		}
		const redultIP = await this.userService.getIpRoleUserById(
			user_id,
			filter,
		);

		const parent_ip = redultIP?.program_users?.[0]?.organisation_id;

		if (user_roles?.includes('program_owner')) {
			return true;
		} else if (user_roles?.includes('staff')) {
			rolesQuery = `user:{program_faciltators:{
				${academic_year_id ? `academic_year_id: {_eq: ${academic_year_id}}` : ``},
				${program_id ? `program_id: {_eq: ${program_id}}` : ``},
					parent_ip:{_eq:"${parent_ip}"}
				}}`;
		} else if (user_roles.includes('facilitator')) {
			rolesQuery = `user: {groups: {${
				academic_year_id
					? `academic_year_id: {_eq: ${academic_year_id}}`
					: ``
			},
			${
				program_id ? `program_id: {_eq: ${program_id}}` : ``
			}}, group_users: {member_type: {_eq: "${member_type}"}, status: {_eq: "${status}"}, user_id: {_eq: ${user_id}}}}`;
		}

		let query = `query MyQuery {
			camps_aggregate(where: {id: {_eq: ${camp_id}}, group_users: {member_type: {_eq: "${member_type}"}, status: {_eq: "${status}"}}, ${rolesQuery}}) {
			  aggregate{
				count
			  }
			}
		  }`;
		console.log(query);
		const response = await this.hasuraServiceFromService.getData({
			query,
		});
		if (
			response?.data &&
			response.data['camps_aggregate'].aggregate.count > 0
		) {
			console.log(response.data['camps_aggregate']);
			return true;
		} else {
			return false;
		}
	}
	private async doIHaveKitMaterialAccess(req, camp_id) {
		const user_roles = req.mw_roles;
		let gqlQuery;
		if (user_roles.includes('program_owners')) {
			return true;
		}
		if (user_roles.includes('facilitator')) {
			gqlQuery = {
				query: `query MyQuery {
					kit_materials_checklist_aggregate(where: {camp_id: {_eq: ${camp_id}}, user_id: {_eq: ${req.mw_userid}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
			console.log(gqlQuery.query);
		}
		const result = await this.hasuraServiceFromService.getData(gqlQuery);
		if (
			result?.data &&
			result.data.kit_materials_checklist_aggregate.aggregate.count > 0
		) {
			return true;
		} else {
			return false;
		}
	}
	private async doIHaveReferenceAccess(req: any, entity_id: any) {
		const user_roles = req.mw_roles;
		let gqlquery;
		if (user_roles.includes('program_owner')) {
			return true;
		}
		if (
			user_roles.includes('facilitator') ||
			user_roles.includes('staff')
		) {
			gqlquery = {
				query: `query MyQuery {
					references_aggregate(where: {context_id: {_eq: ${req.mw_userid}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
			console.log(gqlquery.query);
		}
		const result = await this.hasuraServiceFromService.getData(gqlquery);
		if (
			result?.data &&
			result.data.references_aggregate.aggregate.count > 0
		) {
			return true;
		} else {
			return false;
		}
	}

	private async doIHavePcrScoreAccess(request, entity, entity_id) {
		const user_roles = request.mw_roles;
		let gqlQuery;

		if (user_roles.includes('program_owner')) {
			return true;
		}
		let filterQuery;
		if (entity.hasOwnProperty('user_id')) {
			filterQuery = `user_id: {_eq: ${entity_id}},`;
		} else if (entity.hasOwnProperty('id')) {
			filterQuery = `id: {_eq: ${entity_id}},`;
		} else {
			filterQuery = ``;
		}

		if (user_roles.includes('facilitator')) {
			gqlQuery = {
				query: `query MyQuery {
					pcr_scores_aggregate(where: {${filterQuery} updated_by: {_eq: ${request.mw_userid}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
			console.log(gqlQuery.query);
		}
		const result = await this.hasuraServiceFromService.getData(gqlQuery);
		if (
			result?.data &&
			result.data.pcr_scores_aggregate.aggregate.count > 0
		) {
			return true;
		} else {
			return false;
		}
	}

	private async doIHaveSessionAccess(request, entity_id) {
		const user_roles = request.mw_roles;
		let gqlquery;

		let filter_query = ``;
		if (request.url.includes('/sessions/list/')) {
			filter_query = `, camp_id : {_eq : ${entity_id}}`;
		} else if (request.url.includes('/sessions/details/')) {
			filter_query = `, learning_lesson_plan_id: {_eq: ${entity_id}} `;
		} else {
			filter_query = `, id : {_eq:${entity_id}}`;
		}

		if (user_roles.includes('program_owner')) {
			return true;
		}
		console.log(request.params);

		if (user_roles.includes('facilitator')) {
			gqlquery = {
				query: `query MyQuery {
					learning_sessions_tracker_aggregate(where: {created_by:{_eq : ${request.mw_userid}} ${filter_query}}) {
					  aggregate {
						count
					  }
					}
				  }
				  
				  `,
			};
		}
		console.log(gqlquery.query);

		const result = await this.hasuraServiceFromService.getData(gqlquery);
		if (
			result?.data &&
			result.data.learning_sessions_tracker_aggregate.aggregate.count > 0
		) {
			return true;
		} else {
			return false;
		}
	}

	private async doIHaveUploadFileAccess(request, entity_id) {
		const user_roles = request.mw_roles;
		let gqlquery;

		if (user_roles.includes('program_owner')) {
			return true;
		}
		if (
			user_roles.includes('staff') ||
			user_roles.includes('facilitator')
		) {
			gqlquery = {
				query: `query MyQuery {
					documents_aggregate(where: {user_id: {_eq: ${request.mw_userid}}, id: {_eq: ${entity_id}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
		}
		console.log(gqlquery.query);

		const result = await this.hasuraServiceFromService.getData(gqlquery);
		if (
			result?.data &&
			result.data.documents_aggregate.aggregate.count > 0
		) {
			return true;
		} else {
			return false;
		}
	}

	private async doIHaveEditRequestAccess(request, entity_id) {
		const user_roles = request.mw_roles;
		let gqlquery;

		if (user_roles.includes('program_owner')) {
			return true;
		}
		if (user_roles.includes('staff')) {
			gqlquery = {
				query: `query MyQuery {
					edit_requests_aggregate(where: {id: {_eq: ${entity_id}}, edit_req_approved_by: {_eq: ${request.mw_userid}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
		} else if (user_roles.includes('facilitator')) {
			gqlquery = {
				query: `query MyQuery {
					edit_requests_aggregate(where: {id: {_eq: ${entity_id}}, edit_req_by: {_eq: ${request.mw_userid}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
		}

		console.log('query ->', gqlquery.query);

		const result = await this.hasuraServiceFromService.getData(gqlquery);
		if (
			result?.data &&
			result.data.edit_requests_aggregate.aggregate.count > 0
		) {
			return true;
		} else {
			return false;
		}
	}
	async doIHaveEventAccess(req: any, entity_id: any) {
		const user_roles = req.mw_roles;
		let gqlQuery;
		const academic_year_id = req.academic_year_id;
		const program_id = req.mw_program_id;
		if (user_roles.includes('program_owners')) {
			return true;
		}
		let filter_query;
		if (academic_year_id && program_id) {
			filter_query = `academic_year_id: {_eq: ${
				academic_year_id ? academic_year_id : ``
			}}}, program_id: {_eq: ${program_id ? program_id : ``}},`;
		} else {
			filter_query = ``;
		}
		// Validate for IP role
		if (user_roles.includes('staff')) {
			// 2.1 Validate if this event is added by staff
			gqlQuery = {
				query: `query MyQuery {
					events_aggregate(where: {id:{_eq:${entity_id}} ${filter_query} user_id: {_eq: ${req.mw_userid}}}) {
					  aggregate {
						count
					  }
					}
				  }`,
			};
		}
		console.log(gqlQuery.query);

		// Fetch data
		const result = await this.hasuraServiceFromService.getData(gqlQuery);
		if (result?.data && result.data.events_aggregate.aggregate.count > 0) {
			console.log('I have access: true');
			return true;
		} else {
			console.log('I have access: false');
			return false;
		}
	}
	async doIHaveUserAccess(request, entity_id) {
		const user_roles = request.mw_roles;

		//finding out the entity name
		let roles_query = {
			query: `query MyQuery {
				prerak: program_faciltators_aggregate(where: {user_id: {_eq: ${entity_id}}}) {
				  aggregate {
					count
				  }
				}
				learner: program_beneficiaries_aggregate(where: {user_id: {_eq: ${entity_id}}}) {
				  aggregate {
					count
				  }
				}
				staff: program_users(where: {user_id: {_eq: ${entity_id}}}) {
				  organisation_id
				}
			  }
			  `,
		};
		console.log('roles_query', roles_query.query);

		const roles_result = await this.hasuraServiceFromService.getData(
			roles_query,
		);
		let entityBeingAccessed;
		if (roles_result?.data) {
			if (roles_result.data.prerak.aggregate.count > 0) {
				entityBeingAccessed = 'program_faciltators';
			} else if (roles_result.data.learner.aggregate.count > 0) {
				entityBeingAccessed = 'program_beneficiaries';
			} else if (roles_result.data.staff.aggregate.count > 0) {
				entityBeingAccessed = 'program_users';
			}
		}
		console.log('entityBeingAccessed ', entityBeingAccessed);

		let gqlquery;
		if (user_roles.includes('program_owner')) {
			return true;
		}
		if (user_roles.includes('staff')) {
			//finding out organisation_id
			const parent_ip_query = {
				query: `query MyQuery {
				program_users(where: {user_id: {_eq: ${request.mw_userid}}}) {
				  organisation_id
				}
			  }
			  `,
			};
			const parent_ip_result =
				await this.hasuraServiceFromService.getData(parent_ip_query);
			let parent_ip;
			if (parent_ip_result?.data) {
				parent_ip =
					parent_ip_result.data.program_users[0].organisation_id;
			}

			if (entityBeingAccessed == 'program_faciltators') {
				gqlquery = {
					query: `query MyQuery {
						program_faciltators_aggregate(where: {user_id: {_eq: ${entity_id}}, parent_ip: {_eq: "${parent_ip}"}}) {
						  aggregate {
							count
						  }
						}
					  }`,
				};
			} else if (entityBeingAccessed == 'program_beneficiaries') {
				gqlquery = {
					query: `query MyQuery {
						program_beneficiaries_aggregate(where: {user_id: {_eq: ${entity_id}}, facilitator_user: {program_faciltators: {parent_ip: {_eq: "${parent_ip}"}}}}) {
						  aggregate {
							count
						  }
						}
					  }
					  `,
				};
			}
		}
		if (user_roles.includes('facilitator')) {
			gqlquery = {
				query: `query MyQuery {
					program_beneficiaries_aggregate(where: {user_id: {_eq: ${entity_id}}, facilitator_id: {_eq: ${request.mw_userid}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
		}
		console.log(gqlquery.query);

		const result = await this.hasuraServiceFromService.getData(gqlquery);

		const tableName = entityBeingAccessed + '_aggregate';

		if (result?.data && result.data[tableName].aggregate.count > 0) {
			return true;
		} else {
			return false;
		}
	}

	async doIHaveConsentAccess(request, camp_id) {
		const user_roles = request.mw_roles;
		let gqlquery;
		if (user_roles.includes('program_owner')) {
			return true;
		} else if (
			user_roles.includes('staff') ||
			user_roles.includes('facilitator')
		) {
			gqlquery = {
				query: `query MyQuery {
					consents_aggregate(where: {facilitator_id: {_eq: ${request.mw_userid}},camp_id: {_eq:${camp_id}}, status: {_eq: "active"}, academic_year_id: {_eq: ${request.mw_academic_year_id}}, program_id: {_eq: ${request.mw_program_id}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
		}
		console.log(gqlquery.query);

		const result = await this.hasuraServiceFromService.getData(gqlquery);
		if (
			result?.data &&
			result.data.consents_aggregate.aggregate.count > 0
		) {
			return true;
		} else {
			return false;
		}
	}
	private async doIHaveAttendanceAccess(request, entity_id) {
		const user_roles = request.mw_roles;
		let gqlquery;
		if (user_roles.includes('program_owner')) {
			return true;
		} else if (
			user_roles.includes('staff') ||
			user_roles.includes('facilitator')
		) {
			gqlquery = {
				query: `query MyQuery {
					attendance_aggregate(where: {id: {_eq: ${entity_id}}, created_by: {_eq: ${request.mw_userid}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
		}
		console.log(gqlquery.query);
		const result = await this.hasuraServiceFromService.getData(gqlquery);
		if (
			result?.data &&
			result.data.attendance_aggregate.aggregate.count > 0
		) {
			return true;
		} else {
			return false;
		}
	}

	public async doIHaveAccess(
		request: any,
		entity: string,
		entity_id: number,
	): Promise<boolean> {
		switch (entity) {
			case 'beneficiary': {
				return await this.doIHaveBeneficiaryAccess(request, entity_id);
			}

			case 'facilitator': {
				return await this.doIHavefacilitatorAccess(request, entity_id);
			}

			case 'camp': {
				return await this.doIHaveCampAccess(request, entity_id);
			}
			case 'kit-material': {
				return await this.doIHaveKitMaterialAccess(request, entity_id);
			}
			case 'pcrscore': {
				return await this.doIHavePcrScoreAccess(
					request,
					request?.params,
					entity_id,
				);
			}

			case 'reference': {
				return await this.doIHaveReferenceAccess(request, entity_id);
			}
			case 'session': {
				return await this.doIHaveSessionAccess(request, entity_id);
			}
			case 'upload-file': {
				return await this.doIHaveUploadFileAccess(request, entity_id);
			}
			case 'edit-request': {
				return await this.doIHaveEditRequestAccess(request, entity_id);
			}
			case 'event': {
				return await this.doIHaveEventAccess(request, entity_id);
			}
			case 'user': {
				return await this.doIHaveUserAccess(request, entity_id);
			}
			case 'consent': {
				return await this.doIHaveConsentAccess(
					request,
					request?.body?.camp_id,
				);
			}
			case 'attendance': {
				return await this.doIHaveAttendanceAccess(request, entity_id);
			}
			default:
				return false;
		}
	}

	public async validateAccess(
		request: any,
		entity: string,
		permissionsRequired: string[],
	): Promise<boolean> {
		const userRoles = request.mw_roles;
		const userId = request.mw_userid;
		const entity_id = request?.params?.id;

		console.log('### Req Roles       : ', userRoles);
		console.log('### Req userId      : ', userId);
		console.log('### Req entity_id    : ', entity_id);

		// 1 - Get allowed permissions for given entity for logged in user's role
		const allowedActionsForThisEntity =
			await this.getAllowedActionsByEntityAndRoles(entity, userRoles);
		console.log('### Allowed actions : ', allowedActionsForThisEntity);

		// 2 - Validate of user has one of the permission from permissionsRequired for this action
		console.log('### Required Actions: ', permissionsRequired);
		const allowedActionsListFromRequiredActions =
			await this.getAllowedActionsListFromRequiredActions(
				permissionsRequired,
				allowedActionsForThisEntity,
			);
		console.log(
			'### All required actions : ',
			allowedActionsListFromRequiredActions,
		);

		// 2.1 - User is not allowed even one of the actions that are required
		if (!allowedActionsListFromRequiredActions.length) {
			return false;
		}

		// 3 - Validate of all allowed actions need ownership check (read.own or edit.own)
		const ownershipCheckRequired = await this.checkIfAllActionsContainOwn(
			allowedActionsListFromRequiredActions,
		);
		console.log('### Ownership check required: ', ownershipCheckRequired);

		// 3.1 - If ownership check not required return true
		if (!ownershipCheckRequired) {
			return true;
		}

		if (entity_id) {
			// 4 - Validate ownership
			const iHaveAccess = await this.doIHaveAccess(
				request,
				entity,
				entity_id,
			);
			console.log('### iHaveAccess: ', iHaveAccess);

			// 4.1 - If I do have ownership access return false
			if (!iHaveAccess) {
				return false;
			}
		}

		return true;
	}

	/*public async validateOwnershipAndThrowError(
		request: any,
		response: any,
		entity: string,
		entity_id: number,
	) {
		if (!(await this.doIHaveAccess(request, entity, entity_id))) {
			return response.status(403).json({
				success: false,
				message: 'FORBIDDEN',
				data: {},
			});
		}
	}*/

	async getOwnershipQueryConditionsForBeneficiaries(req) {
		let queryWhereConditions = {};
		let user_roles = req.mw_roles;
		if (user_roles.includes('facilitator')) {
			queryWhereConditions[
				'program_faciltators'
			] = `user_id:{_eq: ${req.mw_userid}}`;
		} else if (user_roles.includes('staff')) {
			let filter;

			// Get parent ip
			if (req.mw_academic_year_id && req.mw_program_id) {
				filter = {
					academic_year_id: req.mw_academic_year_id,
					program_id: req.mw_program_id,
				};
			} else {
				filter = {};
			}

			const parent_ip_data = await this.userService.getIpRoleUserById(
				req.mw_userid,
				filter,
			);
			const parent_ip = parent_ip_data.program_users[0].organisation_id;

			queryWhereConditions[
				'program_users'
			] = `parent_ip:{_eq: "${parent_ip}"}`;
		}

		return queryWhereConditions;
	}
	async getOwnershipQueryConditionsForFacilitator(req) {
		let queryWhereConditions = {};
		const user_roles = req.mw_roles;
		if (user_roles.includes('facilitator')) {
			queryWhereConditions[
				'program_faciltators'
			] = `user_id:{_eq: ${req.mw_userid}}`;
		} else if (user_roles.includes('staff')) {
			let filter;

			// Get parent ip
			if (req.mw_academic_year_id && req.mw_program_id) {
				filter = {
					academic_year_id: req.mw_academic_year_id,
					program_id: req.mw_program_id,
				};
			} else {
				filter = {};
			}

			const parent_ip_data = await this.userService.getIpRoleUserById(
				req.mw_userid,
				filter,
			);
			const parent_ip = parent_ip_data.program_users[0].organisation_id;

			queryWhereConditions[
				'program_users'
			] = `parent_ip:{_eq: "${parent_ip}"}`;
		}

		return queryWhereConditions;
	}
	async getOwnershipQueryConditionsForCamp(req) {
		let queryWhereConditions = {};
		const user_roles = req.mw_roles;
		if (user_roles.includes('facilitator')) {
			queryWhereConditions[
				'program_faciltators'
			] = `, user_id: {_eq:${req.mw_userid}}`;
		} else if (user_roles.includes('staff')) {
			let filter;

			// Get parent ip
			if (req.mw_academic_year_id && req.mw_program_id) {
				filter = {
					academic_year_id: req.mw_academic_year_id,
					program_id: req.mw_program_id,
				};
			} else {
				filter = {};
			}

			const parent_ip_data = await this.userService.getIpRoleUserById(
				req.mw_userid,
				filter,
			);
			const parent_ip = parent_ip_data.program_users[0].organisation_id;

			queryWhereConditions[
				'program_users'
			] = `user:{program_faciltators:{parent_ip:{_eq:"${parent_ip}"}}}`;
		}

		return queryWhereConditions;
	}
}
