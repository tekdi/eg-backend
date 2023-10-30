// camp.controller.ts

import {
	Controller,
	Post,
	UsePipes,
	ValidationPipe,
	Body,
	Req,
	UseGuards,
	Res,
	Param,
	Response,
	Patch,
	Get,
} from '@nestjs/common';
import { CampService } from './camp.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('camp')
export class CampController {
	constructor(private campService: CampService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	registerCamp(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.campService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(new AuthGuard())
	campList(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.campService.campList(body, request, response);
	}

	@Post('/:id')
	@UseGuards(new AuthGuard())
	campById(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.campById(id, body, request, response);
	}

	@Patch('/:id')
	@UseGuards(new AuthGuard())
	updateCampDetails(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.updateCampDetailsForFacilitatore(
			id,
			body,
			request,
			response,
		);
	}

	@Patch('/admin/camp-details/:id')
	@UseGuards(new AuthGuard())
	adminUpdateCampDetails(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.updateCampDetailsForIp(
			id,
			body,
			request,
			response,
		);
	}

	@Post('/consent/create')
	@UseGuards(new AuthGuard())
	createConsentBenficiaries(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.campService.createConsentBenficiariesForFacilitator(
			body,
			request,
			response,
		);
	}

	@Post('/admin/consent/create')
	@UseGuards(new AuthGuard())
	adminCreateConsentBenficiaries(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.campService.createConsentBenficiariesForAdmin(
			body,
			request,
			response,
		);
	}

	@Post('/consent/get')
	@UseGuards(new AuthGuard())
	getConsentBenficiaries(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.campService.getConsentBenficiariesForFacilitators(
			body,
			request,
			response,
		);
	}

	@Post('/admin/consent/get')
	@UseGuards(new AuthGuard())
	getAdminConsentBenficiaries(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.campService.getAdminConsentBenficiaries(
			body,
			request,
			response,
		);
	}

	@Patch('admin/:id')
	@UseGuards(new AuthGuard())
	updateCampStatus(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: any,
	) {
		return this.campService.updateCampStatus(id, body, req, response);
	}

	@Post('admin/camp-list')
	@UseGuards(new AuthGuard())
	getCampList(@Req() req: any, @Res() response: any, @Body() body: any) {
		return this.campService.getCampList(body, req, response);
	}

	@Get('admin/camp-details/:id')
	@UseGuards(new AuthGuard())
	getCampDetailsForAdmin(
		@Param('id') id: number,
		@Req() req: any,
		@Res() response: any,
	) {
		return this.campService.getCampDetailsForAdmin(id, req, response);
	}

	@Post('attendance/add')
	@UseGuards(new AuthGuard())
	markCampAttendance(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
	) {
		return this.campService.markCampAttendance(body, req, response);
	}

	@Patch('attendance/update/:id')
	@UseGuards(new AuthGuard())
	updateCampAttendance(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
		@Param('id') id: number,
	) {
		return this.campService.updateCampAttendance(id, body, req, response);
	}

	@Post('attendance/:id')
	@UseGuards(new AuthGuard())
	getCampAttendanceById(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
		@Param('id') id: number,
	) {
		return this.campService.getCampAttendanceById(id, body, req, response);
	}

	@Get('/getStatuswiseCount')
	@UseGuards(new AuthGuard())
	getStatuswiseCount(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.campService.getStatuswiseCount(request, body, response);
	}

	@Post('/admin/filter-by-camps')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	async getFilter_By_Camps(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
	) {
		await this.campService.getFilter_By_Camps(body, req, response);
	}

	@Patch('/admin/reassign/:id')
	@UseGuards(new AuthGuard())
	reassignBeneficiarytoCamp(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.reassignBeneficiarytoCamp(
			id,
			body,
			request,
			response,
		);
	}

	@Get('/admin/facilitator/list')
	@UseGuards(new AuthGuard())
	getAvailableFacilitatorList(@Req() request: any, @Res() response: any) {
		return this.campService.getAvailableFacilitatorList(request, response);
	}

	@Patch('/admin/facilitator-reassign/:id')
	@UseGuards(new AuthGuard())
	reassignFaciltatorToCamp(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.reassignFaciltatorToCamp(
			id,
			body,
			request,
			response,
		);
	}
}
