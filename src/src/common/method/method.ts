import { Injectable } from '@nestjs/common';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';
import * as moment from 'moment-timezone';

@Injectable()
export class Method {
	constructor(private hasuraServiceFromService: HasuraServiceFromServices) {}

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

	public async isUserHasAccessForProgram(req: any) {
		// if role is program_owner pass this access
		if (req.mw_roles.includes('program_owner')) {
			return true;
		}
		// Set a table name
		let tableName;
		if (req.mw_roles.includes('staff')) {
			tableName = 'program_users';
		} else if (req.mw_roles.includes('facilitator')) {
			tableName = 'program_faciltators';
		}

		if (typeof tableName == 'undefined') {
			return false;
		}

		let data;

		if (tableName === 'program_users') {
			data = {
				query: `query MyQuery {
				${tableName}(where: {user_id: {_eq: ${req.mw_userid}}, program_id: {_eq: ${req.mw_program_id}}, program_organisation: {status: {_eq: "active"}}}){
				  id

				}
			}`,
			};
		} else {
			data = {
				query: `query MyQuery {
				${tableName}(where: {user_id: {_eq:${req.mw_userid}}, program_id: {_eq: ${req.mw_program_id}}, program_organisation: {status: {_eq: "active"}}}){
				  id
				  user_id

				}
			  }`,
			};
		}
		// Fetch data
		const result = await this.hasuraServiceFromService.getData(data);
		if (result.data[tableName].length > 0) {
			return true;
		} else {
			return false;
		}
	}

	public async isUserHasAccessForAcademicYearId(req: any) {
		// if role is program_owner pass this access
		if (req.mw_roles.includes('program_owner')) {
			return true;
		}
		// Set a table name
		let tableName;
		if (req.mw_roles.includes('staff')) {
			tableName = 'program_users';
		} else if (req.mw_roles.includes('facilitator')) {
			tableName = 'program_faciltators';
		}

		if (typeof tableName == 'undefined') {
			return false;
		}

		let data;

		if (tableName === 'program_users') {
			data = {
				query: `query MyQuery {
					${tableName}(where: {user_id: {_eq: ${req.mw_userid}}, academic_year_id: {_eq: ${req.mw_academic_year_id}}, program_organisation: {status: {_eq: "active"}}}){
					  id
					}
				}`,
			};
		} else {
			data = {
				query: `query MyQuery {
					${tableName}(where: {user_id: {_eq:${req.mw_userid}}, academic_year_id: {_eq: ${req.mw_academic_year_id}}, program_organisation: {status: {_eq: "active"}}}){
					  id
					}
				  }`,
			};
		}
		// Fetch data
		const result = await this.hasuraServiceFromService.getData(data);
		if (result.data[tableName].length > 0) {
			return true;
		} else {
			return false;
		}
	}
	public async transformGender(gender) {
		return new Promise((resolve, reject) => {
			if (typeof gender !== 'string') {
				reject(new Error('Gender should be a string.'));
			} else if (gender === 'M') {
				resolve('male');
			} else if (gender === 'F') {
				resolve('female');
			} else {
				resolve(gender);
			}
		});
	}

	public getFormattedISTTime() {
		return moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
	}
}
