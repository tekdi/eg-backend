import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Req,
	Res,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { SearchLMSDto } from './dto/search-lms.dto';
import { LMSService } from './lms.service';
import { LMSTestTrackingDto } from './dto/lms-test-tracking.dto';

@UseInterceptors(SentryInterceptor)
@Controller('lms')
export class LMSController {
	constructor(private readonly lmsService: LMSService) {}

	//test CRUD

	//user test allow
	@Get('/testTracking')
	@UseGuards(new AuthGuard())
	getTestAllowStatus(@Req() header: Request, @Res() response: Response) {
		return this.lmsService.getTestAllowStatus(header, response);
	}

	//create test tracking
	@Post('/testTracking')
	@UseGuards(new AuthGuard())
	createTestTracking(
		@Body() lmsTestTrackingDto: LMSTestTrackingDto,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.lmsService.createTestTracking(lmsTestTrackingDto, header, response);
	}

	//get test tracking
	@Get('/testTracking/:id')
	@UseGuards(new AuthGuard())
	getTestTracking(
		@Param('id') id: string,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.lmsService.getTestTracking(id, header, response);
	}

	//search test tracking
	@Post('/testTracking/search')
	@UseGuards(new AuthGuard())
	public async searchTestTracking(
		@Body() searchLMSDto: SearchLMSDto,
		@Res() response: Response,
	) {
		return this.lmsService.searchTestTracking(searchLMSDto, response);
	}
}
