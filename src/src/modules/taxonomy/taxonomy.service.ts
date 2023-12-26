import { Injectable } from '@nestjs/common';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';

@Injectable()
export class TaxonomyService {
	constructor(
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}

	/***************************** PROGRAMS ***********************************/
	public async getProgramDetails(id: any, response: any) {
		let program_id = id;

		let query = `query MyQuery {
			programs_by_pk(id:${program_id}){
				id,
				name
			}
		}`;

		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let program_data = result?.data?.programs_by_pk;

		if (program_data != null) {
			return response.status(200).send({
				success: true,
				data: program_data,
			});
		} else {
			return response.status(404).send({
				success: false,
				data: {},
			});
		}
	}

	/*************************** ACADEMIC YEARS ********************************/
	public async getAcademicYearDetails(id: any, response: any) {
		let academic_year_id = id;

		let query = `query MyQuery {
			academic_years_by_pk(id:${academic_year_id}){
				id,
				name
			}
		}`;

		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let academic_year_data = result?.data?.academic_years_by_pk;

		if (academic_year_data != null) {
			return response.status(200).send({
				success: true,
				data: academic_year_data,
			});
		} else {
			return response.status(404).send({
				success: false,
				data: {},
			});
		}
	}
}
