import { Injectable } from '@nestjs/common';

import { HasuraService } from '../services/hasura/hasura.service';
import * as moment from 'moment';

@Injectable()
export class FacilitatorCoreService {
	constructor(private readonly hasuraService: HasuraService) {}

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

		const requiredFields = ['id', 'first_name', 'dob', 'gender'];

		const dataValidationFields = ['middle_name', 'last_name'];

		//Check required fields

		const missingRequiredField = requiredFields.find(
			(field) => !body[field] || body[field] === '',
		);
		if (missingRequiredField) {
			return { error: `${missingRequiredField} is required` };
		}

		// Validate and set default values for fields in dataValidationFields if these fields are not present in body
		dataValidationFields.forEach((field) => {
			if (!body[field]) {
				body[field] = null;
			}
		});

		const dobFormats = ['YYYY-M-DD', 'YYYY-MM-DD', 'YYYY-M-D', 'YYYY-MM-D'];

		// Check if body.dob exists and if it matches any of the expected formats
		if (body?.dob) {
			let validFormat = false;
			for (const format of dobFormats) {
				if (moment(body.dob, format, true).isValid()) {
					validFormat = true;
					break;
				}
			}
			// If the dob is not in any of the expected formats, delete it from the database
			if (!validFormat) {
				delete body.dob;
			}
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
