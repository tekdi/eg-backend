import { Controller, Get, Param, Res, UseInterceptors } from '@nestjs/common';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { TaxonomyService } from './taxonomy.service';

@UseInterceptors(SentryInterceptor)
@Controller('/taxonomy')
export class TaxonomyController {
	constructor(private taxonomyService: TaxonomyService) {}

	// Get program
	@Get('/programs/:id')
	public async getProgramDetails(@Param('id') id: number, @Res() response: any) {
		return this.taxonomyService.getProgramDetails(id, response);
	}

    // Get academic-year
	@Get('/academic-years/:id')
	public async getAcademicYearDetails(@Param('id') id: number, @Res() response: any) {
		return this.taxonomyService.getAcademicYearDetails(id, response);
	}
}
