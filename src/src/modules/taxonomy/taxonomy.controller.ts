import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Res,
	UseInterceptors,
} from '@nestjs/common';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { TaxonomyService } from './taxonomy.service';

@UseInterceptors(SentryInterceptor)
@Controller('/taxonomy')
export class TaxonomyController {
	constructor(private taxonomyService: TaxonomyService) {}

	// Get program
	@Get('/programs/:id')
	public async getProgramDetails(
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.taxonomyService.getProgramDetails(id, response);
	}

	// Get academic-year
	@Get('/academic-years/:id')
	public async getAcademicYearDetails(
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.taxonomyService.getAcademicYearDetails(id, response);
	}

	@Get('/academic-years/cycle/:id')
	public async getAcademicYearDetailsForCycle(
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.taxonomyService.getAcademicYearDetailsForCycle(
			id,
			response,
		);
	}

	@Get('/academic-years-cycles/:id')
	public async getAcademicYearCycleDetails(
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.taxonomyService.getAcademicYearCycleDetails(id, response);
	}

	@Post('/academic-years-cycles/filter')
	public async getAcademicYearDetailsForCycleFilters(
		@Res() response: any,
		@Body() body: any,
	) {
		return this.taxonomyService.getAcademicYearDetailsForCycleFilters(
			body,
			response,
		);
	}
}
