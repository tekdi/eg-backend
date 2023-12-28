import { Injectable } from '@nestjs/common';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';

@Injectable()
export class Method {
	constructor(
		private hasuraServiceFromService: HasuraServiceFromServices,
	){}
	async CapitalizeEachWord(sentence) {
		if (sentence == null || sentence === '') {
			return '';
		} else {
			const arr = sentence.split(' ');
			for (var i = 0; i < arr.length; i++) {
				arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
			}
			const c_sentence = arr.join(' ');
			return c_sentence;
		}
	}
	public async isUserHasAccessForProgram(
		req:any
	) {
		//set a table name
		const tableName =
			req.mw_roles === 'staff' ? 'program_users' : 'program_faciltators';
		let data ;
		if(tableName === 'program_users'){
		data = {
			query: `query MyQuery {
				${tableName}(where: {user_id: {_eq: ${req.mw_userid}}, program_id: {_eq: ${req.mw_program_id}}, program_organisation: {status: {_eq: "active"}}}){
				  id
				  
				}
			}`
		};
	}else{
		data = {
			query: `query MyQuery {
				${tableName}(where: {user_id: {_eq:${req.mw_userid}}, program_id: {_eq: ${req.mw_program_id}}, program_organisation: {status: {_eq: "active"}}}){
				  id
				  user_id
				  
				}
			  }`
		};
	}
		//fetch data
		const result = await this.hasuraServiceFromService.getData(data);
		if(result.data[tableName].length > 0 ){
			return true;
		}else{
			return false;
		}
	}
	public async isUserHasAccessForAcademicYearId(
		req:any
	) {
		//set a table name
		const tableName =
			req.mw_roles === 'staff' ? 'program_users' : 'program_faciltators';
			let data ;
			if(tableName === 'program_users'){
			data = {
				query: `query MyQuery {
					${tableName}(where: {user_id: {_eq: ${req.mw_userid}}, academic_year_id: {_eq: ${req.mw_academic_year_id}}, program_organisation: {status: {_eq: "active"}}}){
					  id
					}
				}`
			};
		}else{
			data = {
				query: `query MyQuery {
					${tableName}(where: {user_id: {_eq:${req.mw_userid}}, academic_year_id: {_eq: ${req.mw_academic_year_id}}, program_organisation: {status: {_eq: "active"}}}){
					  id
					}
				  }`
			};
		}
		//fetch data
		const result = await this.hasuraServiceFromService.getData(data);
		if(result.data[tableName].length > 0 ){
			return true;
		}else{
			return false;
		}
	}
}
