import { Injectable } from '@nestjs/common';

import { HasuraService } from '../services/hasura/hasura.service';

@Injectable()
export class FacilitatorCoreService {
	constructor(private hasuraService: HasuraService) {}

	public async updateOkycResponse(
		body: any,
		program_id: any,
		user_id: any,
		academic_year_id: any,
	) {
		const data = {
			query: `query MyQuery {program_faciltators(where: {program_id: {_eq:${program_id}},user_id:{_eq: ${user_id}}, academic_year_id: {_eq:${academic_year_id}}}){
				id
			}
		}`,
		};

		const hasura_response = await this.hasuraService.getData(data);

		const response = body ? JSON.stringify(body).replace(/"/g, '\\"') : '';
		const reqData = hasura_response?.data?.program_faciltators?.[0]?.id;

		let updated_response = {};
		let update_array = ['okyc_response'];
		if (reqData) {
			updated_response = await this.hasuraService.q(
				'program_faciltators',
				{
					id: reqData,
					okyc_response: response,
				},
				update_array,
				true,
			);
		} else {
			return {
				status: 200,
				message: 'Data not found',
				data: {},
			};
		}
		return updated_response;
	}

	public async updateOkycDetails(body: any) {
		// Update Users table data
		const userArr = [
			'first_name',
			'last_name',
			'middle_name',
			'dob',
			'gender',
			'aadhar_verified',
		];

		const requiredFields = ['id','first_name', 'dob', 'last_name', 'gender'];

		// Check required fields
		const missingRequiredField = requiredFields.find(
			(field) => !body[field] || body[field] === '',
		);
		if (missingRequiredField) {
			return { error: `${missingRequiredField} is required` };
		}

		const keyExist = userArr.filter((e) => Object.keys(body).includes(e));

		if (keyExist.length) {
			const tableName = 'users';
			const newReq = {
				...body,
				id: body.id,
				aadhar_verified: 'okyc_ip_verified',
				...(body?.dob == '' && { dob: null }),
			};
			await this.hasuraService.q(tableName, newReq, userArr, true);
		} else {
			return {
				status: 404,
				message: 'Data not found',
				data: {},
			};
		}
	}
}
