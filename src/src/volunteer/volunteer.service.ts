import { Injectable } from '@nestjs/common';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class VolunteerService {
	constructor(
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}

	public async getvolunteerList(body: any, request: any, response: any) {
		const user_role = request?.mw_roles;
		//Validate user role
		if (!user_role.includes('volunteer_admin')) {
			return response.status(403).json({
				success: false,
				message: 'Permission denied. Only Volunteer Admin can See.',
			});
		}
		const hasura_response = await this.hasuraServiceFromServices.getAll(
			'user_roles',
			[
				'user { id email_id dob district}',
				'status',
				'role_slug',
				'user_id',
				'id',
			],
			body,
		);

		// Return success response
		response.status(200).json({
			success: true,
			message: 'List Of Volunteer Fetch Successfully',
			...(hasura_response || {}),
		});
	}

	async update(id: any, body: any, request: any, resp: any) {
		try {
			const user_role = request?.mw_roles;
			//Validate user role
			if (!user_role.includes('volunteer_admin')) {
				return resp.status(403).json({
					success: false,
					message: 'Permission denied. Only Volunteer Admin can See.',
				});
			}
			// Check if id:volunteer and user role id is a valid ID
			if (!id || isNaN(id) || id === 'string' || id <= 0) {
				return resp.status(422).send({
					success: false,
					message: 'Invalid volunteer ID. Please provide a valid ID.',
					data: {},
				});
			}

			const usersFields = [
				'first_name',
				'last_name',
				'gender',
				'mobile',
				'email_id',
				'dob',
				'state',
				'pincode',
			];
			const userRoleUpdateFields = ['id', 'status'];
			let userResponse = {};
			let userRoleResponse = {};
			if (body?.user_roles) {
				const userRoleId = body.user_roles.id;
				userRoleResponse = await this.hasuraService.q(
					'user_roles',
					{ ...body.user_roles, id: userRoleId },
					userRoleUpdateFields,
					true,
					['id', 'status'],
				);
			}

			if (body?.users) {
				userResponse = await this.hasuraService.q(
					'users',
					{ ...body.users, id },
					usersFields,
					true,
					[
						'id',
						'first_name',
						'last_name',
						'gender',
						'mobile',
						'email_id',
						'dob',
						'state',
						'pincode',
					],
				);
			}

			return resp.status(200).json({
				success: true,
				message: 'Updated successfully!',
				data: { userResponse, userRoleResponse },
			});
		} catch (error) {
			return resp.status(422).json({
				success: false,
				message: "Couldn't update the Volunteer.",
				data: {},
			});
		}
	}
}
