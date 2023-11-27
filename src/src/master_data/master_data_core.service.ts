import { Injectable } from '@nestjs/common';
import { HasuraService } from '../services/hasura/hasura.service';
@Injectable()
export class MasterDataCoreService {
	constructor(private hasuraServiceFromServices: HasuraService) {}

	async list(body) {
		const { page, totalpage, total_count, limit, ...filter } = body || {};

		const resultCreate = await this.hasuraServiceFromServices.getAll(
			'learning_lesson_plans_master',
			['id', 'title', 'cms_lesson_id', 'academic_year_id', 'program_id'],
			{
				filters: {
					...filter,
				},
				page,
				limit,
				totalpage,
				total_count,
				order_by: { id: 'asc' },
			},
		);

		return resultCreate;
	}
}
