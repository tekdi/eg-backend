import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserV2Service {
	constructor(private hasuraServiceFromServices: HasuraServiceFromServices) {}
	public async isUserExist(role: any, body: any, response: any) {
		const hasura_response = await this.ifUserExist(role, body);
		if (hasura_response && hasura_response.data.users.length > 0) {

			const users = hasura_response.data.users;
			const facilitators_data = users.flatMap(user => user.program_faciltators);


			const beneficiaries_data = users.flatMap(user => user.program_beneficiaries);


			// 1. both roles found
			if (facilitators_data.length > 0 && beneficiaries_data.length > 0) {
				return response.json({
					status: true,
					message: 'Facilitators and Beneficiaries found',
					data: hasura_response.data.users,
				});
			}
			// 2. pf found,pb empty
			else if (
				facilitators_data.length > 0 &&
				beneficiaries_data.length == 0
			) {
				return response.json({
					status: true,
					message: 'Facilitators found',
					data: hasura_response.data.users,
				});
			}
			// 3. pf empty,pb found
			else if (
				beneficiaries_data.length > 0 &&
				facilitators_data.length == 0
			) {
				return response.json({
					status: true,
					message: 'Beneficiaries found',
					data: hasura_response.data.users,
				});
			}
		} else {
			// 4. both empty
			return response.json({
				status: false,
				message: 'Facilitators and Beneficiaries not found',
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
					program_faciltators {
						user_id
						academic_year_id
						program_id
					  }
					  program_beneficiaries{
						user_id
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
