import { Injectable } from '@nestjs/common';
import { EnumService } from 'src/enum/enum.service';
import { ActivitiesCoreService } from './activities.core.service';

@Injectable()
export class ActivitiesService {
	constructor(
		private activitiesCoreService: ActivitiesCoreService,
		private enumService: EnumService,
	) {}

	public async create(request: any, body: any, resp: any) {
		try {
			let facilitator_id = request.mw_userid;
			let user_id = request.mw_userid;
			let academic_year_id = request.mw_academic_year_id;
			let program_id = request.mw_program_id;
			let created_by = request.mw_userid;
			let updated_by = request.mw_userid;

			const response = await this.activitiesCoreService.create(
				body,
				user_id,
				facilitator_id,
				academic_year_id,
				program_id,
				created_by,
				updated_by,
			);

			if (response) {
				return resp.status(response.status).json({
					status: response.status,
					message: response.message,
					data: response.data,
				});
			}
		} catch (error) {
			return resp.json({
				status: 500,
				message: 'Internal server error',
				data: [],
			});
		}
	}

	async update(id: any, body: any, request: any, resp: any) {
		let actvities_id = id;
		let user_id = body?.user_id;
		const program_id = request.mw_program_id;
		const academic_year_id = request.mw_academic_year_id;
		let created_by = request.mw_userid;
		let updated_by = request.mw_userid;

		body.activity_data = JSON.stringify(body?.activity_data).replace(
			/"/g,
			'\\"',
		);
		const response = await this.activitiesCoreService.update(
			body,
			actvities_id,
			user_id,
			academic_year_id,
			program_id,
			created_by,
			updated_by,
		);

		if (response) {
			return resp.status(200).json({
				success: true,
				message: 'Activities Updated successfully!',
				data: response,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Unable to Update Activities!',
				data: {},
			});
		}
	}

	public async List(body: any, req: any, resp: any) {
		try {
			const program_id = req.mw_program_id;
            const academic_year_id = req.mw_academic_year_id;
			let context_id = req.mw_userid;
			const page = isNaN(body?.page) ? 1 : parseInt(body?.page);
			const limit = isNaN(body?.limit) ? 15 : parseInt(body?.limit);
			let offset = page > 1 ? limit * (page - 1) : 0;

			let newQdata = await this.activitiesCoreService.list(
				academic_year_id,
				program_id,
				context_id,
				body,
				limit,
				offset,
			);

			if (newQdata.activities.length > 0) {
				return resp.status(200).json({
					success: true,
					message: 'Data found successfully!',
					data: { activities: newQdata.activities },
					totalCount: newQdata.count,
					limit,
					currentPage: page,
					totalPages: `${newQdata.totalPages}`,
				});
			} else {
				return resp.status(400).json({
					success: false,
					message: 'Data Not Found',
					data: {},
				});
			}
		} catch (error) {
			return resp.status(500).json({
				success: false,
				message: 'Internal server error',
				data: {},
			});
		}
	}
}
