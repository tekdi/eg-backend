import { Injectable } from '@nestjs/common';

import {
	HasuraService,
	HasuraService as HasuraServiceFromServices,
} from '../services/hasura/hasura.service';

@Injectable()
export class FacilitatorCoreService {
	constructor(
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	){}
	public async update_okyc_response(body:any,program_id:any,user_id:any,academic_year_id:any){
        
		const data = {
		query: `query MyQuery {
			program_beneficiaries(where: {program_id: {_eq:${program_id}},user_id:{_eq: ${user_id}}, academic_year_id: {_eq:${academic_year_id}}}){
				id
			}
		}`
	}
	const hasura_response = await this.hasuraServiceFromServices.getData(data);
	
	const response =  body.okyc_response.data
	? JSON.stringify(body.okyc_response.data).replace(
			/"/g,
			'\\"',
	  )
	: ''
	const reqData = hasura_response.data.program_beneficiaries[0].id;
	console.log(reqData);
	
	const updated_response = await this.hasuraService.q(	
		'program_faciltators',
		{
			id:reqData,
			okyc_response: response
		},
		[],	
		true,
	)
	
	return updated_response;
}
}