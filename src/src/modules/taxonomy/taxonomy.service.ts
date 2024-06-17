import { Injectable } from '@nestjs/common';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';

@Injectable()
export class TaxonomyService {
	constructor(private hasuraServiceFromServices: HasuraServiceFromServices) {}

	/***************************** PROGRAMS ***********************************/
	public async getProgramDetails(id: any, response: any) {
		let program_id = id;

		let sql = `select p.id as program_id, p.name as program_name, p.state_id as state_id,
		(SELECT state_name from address where state_cd = p.state_id limit 1) AS state_name
		from programs p
		left join address ad on p.state_id = ad.state_cd
		where p.id = ${program_id}
		group by p.state_id, p.id`;

		let cohort_data = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		)?.result;

		if (cohort_data && cohort_data.length > 0) {
			return response.status(200).json({
				success: true,
				data: this.hasuraServiceFromServices.getFormattedData(
					cohort_data,
					[5],
				),
			});
		} else {
			return response.status(200).json({
				success: false,
				data: [],
			});
		}
	}

	/*************************** ACADEMIC YEARS ********************************/
	public async getAcademicYearDetails(id: any, response: any) {
		let academic_year_id = id;

		let query = `query MyQuery {
			academic_years_by_pk(id:${academic_year_id}){
				academic_year_id:id,
				academic_year_name:name
			}
		}`;

		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let academic_year_data = result?.data?.academic_years_by_pk;

		if (academic_year_data != null) {
			return response.status(200).json({
				success: true,
				data: academic_year_data,
			});
		} else {
			return response.status(200).json({
				success: false,
				data: [],
			});
		}
	}

	public async getAcademicYearCycleDetails(id: any, response: any) {
		let academic_year_cycles_id = id;

		let query = `query MyQuery {
			academic_year_cycles_by_pk(id:${academic_year_cycles_id}){
			  id
			  name
			  academic_years{
				id
				name
				program_id
				programs{
				  id
				  name
				}
				academic_year_cycle_id
				
			  }
			  
			}
		  
		  
		}`;

		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let academic_year_cycle_data = result?.data?.academic_year_cycles_by_pk;

		if (academic_year_cycle_data != null) {
			return response.status(200).json({
				success: true,
				message: 'Data retrieved successfully',
				data: academic_year_cycle_data,
			});
		} else {
			return response.status(404).json({
				success: false,
				message: 'Data not found',
				data: [],
			});
		}
	}

	public async getAcademicYearDetailsForCycle(id: any, response: any) {
		let academic_year_id = id;

		let query = `query MyQuery {
			academic_years_by_pk(id:${academic_year_id}){
			  id
			  name
			  program_id
			  programs{
				id
				name
				
			  }
			  academic_year_cycle_id
			  academic_years_cycles{
				id
				name
			  }
			}
		  }
		  `;

		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let academic_year_data = result?.data?.academic_years_by_pk;

		if (academic_year_data != null) {
			return response.status(200).json({
				success: true,
				message: 'Data retrieved successfully',
				data: academic_year_data,
			});
		} else {
			return response.status(404).json({
				success: false,
				message: 'Data not found',
				data: [],
			});
		}
	}

	public async getAcademicYearDetailsForCycleFilters(
		body: any,
		response: any,
	) {
		let filters = [];

		if (body?.academic_year_id) {
			filters.push(`id:{_eq:${body?.academic_year_id}}`);
		}

		if (body?.program_id) {
			filters.push(`program_id:{_eq:${body?.program_id}}`);
		}

		if (body?.academic_year_cycle_id) {
			filters.push(
				`academic_year_cycle_id:{_eq:${body?.academic_year_cycle_id}}`,
			);
		}

		let query = `query MyQuery {
			academic_years(where:{${filters}}) {
			  id
			  name
			  program_id
			  programs {
				id
				name
			  }
			  academic_year_cycle_id
			  academic_years_cycles {
				id
				name
			  }
			}
		  }
		  
		  `;

		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let academic_year_data = result?.data?.academic_years;

		if (academic_year_data?.length > 0) {
			return response.status(200).json({
				success: true,
				message: 'Data retrieved successfully',
				data: academic_year_data,
			});
		} else {
			return response.status(404).json({
				success: false,
				message: 'Data not found',
				data: [],
			});
		}
	}
}
