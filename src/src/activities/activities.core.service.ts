import { Injectable } from '@nestjs/common';
import { EnumService } from 'src/enum/enum.service';
import { HasuraService } from 'src/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

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

			if (users) {
				response = await this.hasuraService.create(
					this.table,
					{
						...body,
						context: 'activity_users',
						context_id: facilitator_id,
						activity_data: JSON.stringify(
							body.activity_data,
						).replace(/"/g, '\\"'),
						created_by: facilitator_id,
						updated_by: facilitator_id,
					},
					this.returnFields,
				);
				if (response) {
					return {
						status: 200,
						success: true,
						message: 'Activity created Successfully',
						data: { response },
					};
				}
				return response;
			} else {
				return {
					status: 422,
					success: false,
					message: 'Beneficiary is not under this facilitator!',
					data: {},
				};
			}
		} catch (error) {
			return {
				success: false,
				message: 'An error occurred during the operation',
				data: {},
			};
		}
	}

	public async update(
		body,
		activities_id,
		user_id,
		academic_year_id,
		program_id,
		created_by,
		updated_by,
	) {
		let query_update = `
			query GetActivitiesQuery {
			  activities(
				where: {
				  user_id: { _eq: ${user_id} },
				  academic_year_id: { _eq: ${academic_year_id} },
				  program_id: { _eq: ${program_id} },
				  created_by:{_eq:${created_by}},
				  updated_by:{_eq:${updated_by}}, id: {_eq: ${activities_id}}
				}
			  ) {
				id
				user_id
				type
				activity_data
				academic_year_id
				context
				context_id
				date
				program_id
				created_by
				updated_by
			  }
			}
		  `;

		const queryResult = await this.hasuraServiceFromServices.getData({
			query: query_update,
		});

		const activityId = queryResult?.data?.activities?.[0]?.id;

		let response;
		if (activityId) {
			response = await this.hasuraService.q(
				this.table,
				{
					...body,
					id: activityId,
				},
				[
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
				],
				true,
				[...this.returnFields, 'id'],
			);
		}

		return response;
	}

	public async list(
		academic_year_id: number,
		program_id: number,
		context_id: number,
		body: any,
		limit: any,
		offset: any,
	) {
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
				},

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

		const count = response?.data?.activities_aggregate?.aggregate?.count;

		const totalPages = Math.ceil(count / limit);
		const newQdata = response?.data?.activities;

		return { activities: newQdata, count: count, totalPages: totalPages };
	}
}
