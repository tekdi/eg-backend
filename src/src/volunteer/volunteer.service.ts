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
		const onlyfilter = [
			'id',
			'first_name',
			'middle_name',
			'last_name',
			'mobile',
			'email_id',
			'dob',
			'state',
			'gender',
			'pincode',
		];
		body.filters = {
			...(body.filter || {}),
			core: `user_roles:{role_slug:{_eq:"volunteer"}}`,
		};

		const hasura_response = await this.hasuraServiceFromServices.getAll(
			'users',
			[
				'id',
				'first_name',
				'middle_name',
				'last_name',
				'mobile',
				'email_id',
				'dob',
				'state',
				'gender',
				'pincode',
				' qualifications {id qualification_master_id qualification_master {name } }',
				'user_roles{status role_slug user_id id}',
			],
			{ ...body, onlyfilter: [...onlyfilter, 'core'] },
		);
		// Return success response
		response.status(200).json({
			success: true,
			message: 'List Of Volunteer Fetch Successfully',
			...(hasura_response || {}),
		});
	}

	public async getVolunteerDetails(req: any, resp: any, id: any) {
		//Validate user role
		const user_role = req?.mw_roles;
		if (!user_role.includes('volunteer_admin')) {
			return resp.status(403).json({
				success: false,
				message: 'Permission denied. Only Volunteer Admin can See.',
			});
		}
		const user_id = id;
		try {
			const data = {
				query: `query MyQuery {
          users(where: {id: {_eq: ${user_id}},user_roles:{role_slug:{_eq:"volunteer"}}}) {
            id
            first_name
            middle_name
            last_name
            mobile
            gender
            dob
            state
            qualifications {
              id
              qualification_master_id
              qualification_master {
                name
              }
            }
            user_roles {
              id
              user_id
              status
              role_slug
            }
          }
        }
        
			`,
			};

			const response = await this.hasuraServiceFromServices.getData(data);

			const volunteer = response?.data?.users || [];

			if (volunteer.length === 0) {
				return resp.status(422).send({
					success: false,
					message: 'volunteer Details Not found!',
					data: volunteer,
				});
			} else {
				return resp.status(200).send({
					success: true,
					message: 'volunteer Details found successfully!',
					data: volunteer?.[0],
				});
			}
		} catch (error) {
			console.error('Error fetching volunteer:', error);
			return resp.status(422).send({
				success: false,
				message: 'An error occurred while fetching volunteer',
				data: {},
			});
		}
	}
}
