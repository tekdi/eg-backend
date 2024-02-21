import { Injectable } from '@nestjs/common';
import { MasterDataCoreService } from './master_data_core.service';

@Injectable()
export class MasterDataService {
	constructor(private masterDataCoreService: MasterDataCoreService) {}
	async getList(req: any, body: any, res: any) {
		const limit = isNaN(body.limit) ? 6 : parseInt(body.limit);
		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const result = await this.masterDataCoreService.list(body);

		if (result.data) {
			return res.status(200).json({
				message: 'Data found successfully',
				data: {
					learning_lesson_plans_master: result.data,
					limit,
					currentPage: page,
					totalPages: result.totalPages,
				},
			});
		} else {
			return res.status(200).json({
				message: 'Data not found',
				data: [],
			});
		}
	}
}
