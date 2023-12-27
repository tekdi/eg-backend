import { Injectable } from '@nestjs/common';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';

@Injectable()
export class TaxonomyService {
	constructor(private hasuraServiceFromServices: HasuraServiceFromServices) {}

	/***************************** PROGRAMS ***********************************/
	public async getProgramDetails(id: any, response: any) {
		let program_id = id;

		let sql = `select p.id,p.name,p.state_id as state_id ,
		(SELECT state_name from address where state_cd = p.state_id limit  1) AS state_name
	 from programs p
	 left join address ad on p.state_id=ad.state_cd
	 where p.id=${program_id}
	 group by p.state_id,p.id 
	 
	 `;

		let cohort_data = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		)?.result;

		if (cohort_data != undefined) {
			return response.json({
				status: 200,
				message: 'Successfully retrieved data',
				data: this.hasuraServiceFromServices.getFormattedData(
					cohort_data,
					[5],
				),
			});
		} else {
			return response.status(404).json({
				status: 404,
				message: 'Successfully retrieved data',
				data: [],
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
