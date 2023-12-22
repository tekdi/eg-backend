import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserV2Service {
	constructor(private hasuraServiceFromServices: HasuraServiceFromServices) {}
	public async isUserExist(role: any, body: any, response: any) {
		const tableName =
			role === 'facilitators'
				? 'program_faciltators'
				: 'program_beneficiaries';
		const hasura_response = await this.ifUserExist(role, body);
		if (
			hasura_response &&
			hasura_response.data &&
			hasura_response.data.users
		) {
			const beneficiariesArray = hasura_response.data.users.flatMap(
				(user) => user[tableName] || [],
			);

			if (beneficiariesArray.length > 0) {
				return response.json({
					status: true,
					message: `${role} found`,
					data: beneficiariesArray,
				});
			} else {
				return response.json({
					status: false,
					message: `${role} not found`,
					data: [],
				});
			}
		} else {
			// 'users' array is either undefined or empty
			return response.json({
				status: false,
				message: `${role} not found`,
				data: [],
			});
		}
	}

	public async ifUserExist(role, body) {
		//set table name according to the role
		const tableName =
			role === 'facilitators'
				? 'program_faciltators'
				: 'program_beneficiaries';
		const fields = [];

		for (const fieldName in body) {
			const fieldValue = body[fieldName];
			fields.push(fieldName, fieldValue);
		}
		const data = {
			query: `query MyQuery {
				users(where: {${fields[0]}: {_eq: "${fields[1]}"}}){
				  ${tableName}{
					user_id
					id
					academic_year_id
					program_id
				  }
				  
				}
			}`,
		};

		//fetch data
		const hasura_response = await this.hasuraServiceFromServices.getData(
			data,
		);
		return hasura_response;
	}
}
