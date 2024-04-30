import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { LMSCertificateDto } from './dto/lms-certificate.dto';
import { LMSTestTrackingDto } from './dto/lms-test-tracking.dto';
import { SearchLMSDto } from './dto/search-lms.dto';
import { LMSService } from './lms.service';

@UseInterceptors(SentryInterceptor)
@Controller('lms')
export class LMSController {
	constructor(private readonly lmsService: LMSService) {}

	//user test allow
	@Get('/testTracking')
	@UseGuards(AuthGuard)
	getTestAllowStatus(@Req() header: Request, @Res() response: Response) {
		return this.lmsService.getTestAllowStatus(header, response);
	}

	//create test tracking
	@Post('/testTracking')
	@UseGuards(AuthGuard)
	createTestTracking(
		@Body() lmsTestTrackingDto: LMSTestTrackingDto,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.lmsService.createTestTracking(
			lmsTestTrackingDto,
			header,
			response,
		);
	}

	//get test tracking
	@Get('/testTracking/:id')
	@UseGuards(AuthGuard)
	getTestTracking(
		@Param('id') id: string,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.lmsService.getTestTracking(id, header, response);
	}

	//search test tracking
	@Post('/testTracking/search')
	@UseGuards(AuthGuard)
	public async searchTestTracking(
		@Body() searchLMSDto: SearchLMSDto,
		@Res() response: Response,
	) {
		return this.lmsService.searchTestTracking(searchLMSDto, response);
	}

	//download certificate detail
	@Post('/certificate/download')
	@UseGuards(AuthGuard)
	public async downloadCertificate(
		@Body() lmsCertificateDto: LMSCertificateDto,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.lmsService.downloadCertificate(
			lmsCertificateDto,
			header,
			response,
		);
	}

	//verify certificate detail
	@Post('/certificate/verify')
	@UseGuards(AuthGuard)
	public async verifyCertificate(
		@Body() lmsCertificateDto: LMSCertificateDto,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.lmsService.verifyCertificate(
			lmsCertificateDto,
			header,
			response,
		);
	}

	@Get('/:id/get-certificates')
	@UseGuards(AuthGuard)
	public async getList(
		@Req() req: any,
		@Param('id') id: any,
		@Res() res: any,
	) {
		return this.lmsService.getList(req, id, res);
	}
}
