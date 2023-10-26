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
			query: `query MyQuery {program_beneficiaries(where: {program_id: {_eq:${program_id}},user_id:{_eq: ${user_id}}, academic_year_id: {_eq:${academic_year_id}}}){
				id
			}
		}`,
		};
		const hasura_response = await this.hasuraService.getData(data);

		const response = body.okyc_response.data
			? JSON.stringify(body.okyc_response.data).replace(/"/g, '\\"')
			: '';
		const reqData = hasura_response.data.id;

		const updated_response = await this.hasuraService.q(
			'program_faciltators',
			{
				id: reqData,
				okyc_response: response,
			},
			[],
			true,
		);

		return updated_response;
	}
}
