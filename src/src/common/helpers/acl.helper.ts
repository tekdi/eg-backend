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
				{
					program_id: request.mw_program_id,
					academic_year_id: request.mw_academic_year_id,
				},
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
									academic_year_id: {_eq: ${request.mw_academic_year_id}},
									program_id: {_eq: ${request.mw_program_id}},
									parent_ip: {_eq: "${parent_ip_id}"}
								}
							},
							academic_year_id: {_eq: ${request.mw_academic_year_id}},
							program_id: {_eq: ${request.mw_program_id}}
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
							program_id: {_eq: ${request.mw_program_id}},
							academic_year_id: {_eq: ${request.mw_academic_year_id}}
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
		console.log(gqlQuery);
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
		/*let gqlQuery = {
			query: `query MyQuery {
				program_facilitators (
					where: {
						user_id: {_eq: ${facilitatorId}},
						facilitator_id: {_eq: ${req.mw_userid}},
						program_id: {_eq: ${req.mw_program_id}},
						academic_year_id: {_eq: ${req.mw_academic_year_id}}
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

		// Fetch data
		const result = await this.hasuraServiceFromService.getData(gqlQuery);
		// console.log(gqlQuery); console.log(result);

		if (result?.data && result.data['program_beneficiaries'].length > 0) {
			console.log(result.data['program_beneficiaries']);
			return true;
		} else {
			return false;
		}*/

		// @TODO - update code above
		return true;
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

		if (req?.roles?.includes('program_owner')) {
			rolesQuery = ``;
		} else if (req?.roles?.includes('staff')) {
			const redultIP = await this.userService.getIpRoleUserById(user_id, {
				program_id,
				academic_year_id,
			});

			const parent_ip = redultIP?.program_users?.[0]?.organisation_id;
			rolesQuery = `user:{program_faciltators:{
					academic_year_id: {_eq: ${academic_year_id}},
					program_id: {_eq: ${program_id}},
					parent_ip:{_eq:"${parent_ip}"}
				}}`;
		}
		let query = `query MyQuery {
				camps_aggregate(where: {
					id: {_eq: ${camp_id}},
					group: {
						academic_year_id: {_eq: ${academic_year_id}},
						program_id: {_eq: ${program_id}}
					},
					group_users: {
						member_type: {_eq: ${member_type}},
						status: {_eq: ${status}},
						${rolesQuery}
					}
				}) {
				  aggregate {
					count
				  }
				}
			}`;
		const response = await this.hasuraServiceFromService.getData({
			query,
		});
		if (response?.data && response.data['camps_aggregate'].length > 0) {
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

			const result = await this.hasuraServiceFromService.getData(
				gqlQuery,
			);
			if (
				result?.data &&
				result.data.kit_materials_checklist_aggregate.aggregate.count >
					0
			) {
				return true;
			} else {
				return false;
			}
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
					references_aggregate(where: {context_id: {_eq: ${req.mw_userid}}, id: {_eq: ${entity_id}}}) {
					  aggregate {
						count
					  }
					}
				  }
				  `,
			};
			console.log(gqlquery.query);

			const result = await this.hasuraServiceFromService.getData(
				gqlquery,
			);
			if (
				result?.data &&
				result.data.references_aggregate.aggregate.count > 0
			) {
				return true;
			} else {
				return false;
			}
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

			case 'reference': {
				return await this.doIHaveReferenceAccess(request, entity_id);
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
}
