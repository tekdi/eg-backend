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
			message: 'List Of Volunteer Fetch Successfully.',
			...(hasura_response || {}),
		});
	}
}
