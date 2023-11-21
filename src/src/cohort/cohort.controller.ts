import { Controller, Post, Res } from '@nestjs/common';
import { CohortService } from './cohort.service';
@Controller('/cohort')
export class CohortController {
	constructor(private cohortService: CohortService) {}
	@Post('/get-cohort-list')
	async getCohortList(@Res() res:any) {
		return this.cohortService.getCohortList(res);
	}
}
