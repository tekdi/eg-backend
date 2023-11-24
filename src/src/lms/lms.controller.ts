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
import { LSMTestDto } from './dto/lms-test.dto';

@UseInterceptors(SentryInterceptor)
@Controller('lms')
export class LMSController {
	constructor(private readonly lmsService: LMSService) {}

	//test CRUD

	//user test allow
	@Get('/test')
	@UseGuards(new AuthGuard())
	getTestAllowStatus(@Req() header: Request, @Res() response: Response) {
		return this.lmsService.getTestAllowStatus(header, response);
	}

	//create test tracking
	@Post('/test')
	@UseGuards(new AuthGuard())
	createTest(
		@Body() lmsTestDto: LSMTestDto,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.lmsService.createTest(lmsTestDto, header, response);
	}

	//get test tracking
	@Get('/test/:id')
	@UseGuards(new AuthGuard())
	getTest(
		@Param('id') id: string,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.lmsService.getTest(id, header, response);
	}

	//search test tracking
	@Post('/test/search')
	@UseGuards(new AuthGuard())
	public async searchCohort(
		@Body() searchLMSDto: SearchLMSDto,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.lmsService.searchTest(searchLMSDto, header, response);
	}
}
