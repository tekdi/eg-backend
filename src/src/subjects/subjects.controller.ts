import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { SubjectsService } from './subjects.service';

@UseInterceptors(SentryInterceptor)
@Controller('subjects')
export class SubjectsController {
	constructor(private readonly SubjectsService: SubjectsService) {}

	@Post()
	findAll(@Body() request: Record<string, any>) {
		return this.SubjectsService.findAll(request);
	}
}
