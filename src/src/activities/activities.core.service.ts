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
	) {
		let response;
		let query = `query MyQuery2 {
      users(where: {id: {_eq: ${user_id}}, program_beneficiaries: {facilitator_id: {_eq:${facilitator_id}}, academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq: ${program_id}}}}) {
        id
      }
    }
    `;

		const result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let users = result?.data?.users?.[0]?.id;
		if (!users) {
			return null;
		} else {
			let query_update = `query MyQuery {
                        activities(where: {user_id: {_eq: ${user_id}}}) {
                          id
                          user_id
                          activity_data
                          context
                          context_id
                        }
                      }`;
			const query_result = await this.hasuraServiceFromServices.getData({
				query: query_update,
			});

			const id = query_result?.data?.activities?.[0]?.user_id;

			if (!id?.user_id) {
				response = await this.hasuraService.create(
					this.table,
					{
						...body,
						context: 'activity_user',
						context_id: facilitator_id,
						activity_data: JSON.stringify(
							body.activity_data,
						).replace(/"/g, '\\"'),
					},
					this.returnFields,
				);
			} else {
				response = await this.hasuraService.q(
					this.table,
					{
						...body,
						user_id: id,
						context_id: facilitator_id,
						activity_data: JSON.stringify(
							body.activity_data,
						).replace(/"/g, '\\"'),
					},
					[],
					true,
				);
			}
		}
		return response;
	}
	public async update(body: any, id: any, facilitator_id: any, user_id: any) {
		let query = `query MyQuery {
			activities(where: {updated_by: {_eq: ${facilitator_id}}, user_id: {_eq: ${user_id}}}) {
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
			}
		  }`;
		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let response_data = hasura_response?.data;
		if (response_data) {
		}
	}
}
