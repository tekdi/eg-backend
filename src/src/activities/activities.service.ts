import { Injectable } from '@nestjs/common';
import { ActivitiesCoreService } from './activities.core.service';
import { EnumService } from 'src/enum/enum.service';

@Injectable()
export class ActivitiesService {
	constructor(
		private activitiesCoreService: ActivitiesCoreService,
		private enumService: EnumService,
	) {}

	public async create(request: any, body: any, resp: any) {
		try {
			let facilitator_id = request.mw_userid;
			let user_id = body?.user_id;
			let academic_year_id = body?.academic_year_id || 1;
			let program_id = body?.program_id || 1;
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

			if (response != null) {
				return resp.json({
					status: 200,
					message: 'Successfully updated camp details',
					data: response,
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

	public async List(body: any, req: any, resp: any) {
		try {
			let academic_year_id = body?.academic_year_id || 1;
			let program_id = body?.program_id || 1;
			let context_id = req.mw_userid;

			let newQdata = await this.activitiesCoreService.list(
				academic_year_id,
				program_id,
				context_id,
			);

			if (newQdata.length > 0) {
				return resp.status(200).json({
					success: true,
					message: 'Data found successfully!',
					data: { activities: newQdata },
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
