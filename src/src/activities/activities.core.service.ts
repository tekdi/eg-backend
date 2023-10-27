import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { EnumService } from 'src/enum/enum.service';

@Injectable()
export class ActivitiesCoreService {
	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private enumService: EnumService,
	) {}
	allStatus = this.enumService.getEnumValue('LEARNING_ACTIVITIES').data;
	public table = 'activities';
	public fillable = [
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
	];
	public returnFields = [
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
	];

	public async create(
		body,
		user_id,
		facilitator_id,
		academic_year_id,
		program_id,
		created_by,
		updated_by,
	) {
		let response;
		let query = `
		  query CheckUserQuery {
			users(
			  where: {
				id: { _eq: ${user_id} },
				program_beneficiaries: {
				  facilitator_id: { _eq: ${facilitator_id} },
				  academic_year_id: { _eq: ${academic_year_id} },
				  program_id: { _eq: ${program_id} }
				}
			  }
			) {
			  id
			}
		  }
		`;
		try {
			const result = await this.hasuraServiceFromServices.getData({
				query,
			});

			const users = result?.data?.users?.[0]?.id;

			if (!users) {
				return {
					success: false,
					message: 'Beneficiary is not under this facilitator!',
					data: {},
				};
			}

			let query_update = `
			query GetActivitiesQuery {
			  activities(
				where: {
				  user_id: { _eq: ${user_id} },
				  academic_year_id: { _eq: ${academic_year_id} },
				  program_id: { _eq: ${program_id} },
				  created_by:{_eq:${created_by}},
				  updated_by:{_eq:${updated_by}}
				}
			  ) {
				id
				user_id
			  }
			}
		  `;

			const queryResult = await this.hasuraServiceFromServices.getData({
				query: query_update,
			});

			const activityId = queryResult?.data?.activities?.[0]?.id;

			let update_arr = [
				'user_id',
				'type',
				'activity_data',
				'academic_year_id',
				'context',
				'context_id',
				'date',
				'program_id',
				'created_by',
				'updated_by',
			];

			if (!activityId) {
				let create_body = {
					...body,
					context: 'activity_user',
					context_id: facilitator_id,
					activity_data: JSON.stringify(body.activity_data).replace(
						/"/g,
						'\\"',
					),
					created_by: facilitator_id,
					updated_by: facilitator_id,
				};

				response = await this.hasuraService.q(
					this.table,
					create_body,
					update_arr,
					true,
					this.returnFields,
				);
			} else {
				let update_body = {
					...body,
					activity_data: JSON.stringify(body.activity_data).replace(
						/"/g,
						'\\"',
					),
				};

				response = await this.hasuraService.q(
					this.table,
					{
						...update_body,
						id: activityId,
					},
					update_arr,
					true,
					this.returnFields,
				);
			}

			return response;
		} catch (error) {
			return {
				success: false,
				message: 'An error occurred during the operation',
				data: {},
			};
		}
	}

	public async list(
		academic_year_id: number,
		program_id: number,
		context_id: number,
	) {
		let query = `query MyQuery {
		  activities(where: {context_id: {_eq: ${context_id}}, program_id: {_eq: ${program_id}}, academic_year_id: {_eq:  ${academic_year_id}}})
		  {
			id
			user_id
			type
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

		const newQdata = response?.data?.activities;

		return newQdata;
	}
}
