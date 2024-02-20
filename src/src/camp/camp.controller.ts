import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Req,
	Res,
	Response,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { RoleGuard } from 'src/modules/auth/role.guard';
import { Roles } from 'src/modules/auth/role.decorator';
import { CampService } from './camp.service';

@Controller('camp')
export class CampController {
	constructor(private campService: CampService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator')
	registerCamp(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.campService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator')
	campList(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.campService.campList(body, request, response);
	}

	@Post('/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator')
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
	@UseGuards(RoleGuard)
	@Roles('facilitator')
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
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
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
	@UseGuards(RoleGuard)
	@Roles('facilitator')
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
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
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
	@UseGuards(RoleGuard)
	@Roles('facilitator')
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
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
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
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
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
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
	getCampList(@Req() req: any, @Res() response: any, @Body() body: any) {
		return this.campService.getCampList(body, req, response);
	}

	@Get('admin/camp-details/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
	getCampDetailsForAdmin(
		@Param('id') id: number,
		@Req() req: any,
		@Res() response: any,
	) {
		return this.campService.getCampDetailsForAdmin(id, req, response);
	}

	@Post('attendance/add')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator')
	markCampAttendance(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
	) {
		return this.campService.markCampAttendance(body, req, response);
	}

	@Patch('attendance/update/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator')
	updateCampAttendance(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
		@Param('id') id: number,
	) {
		return this.campService.updateCampAttendance(id, body, req, response);
	}

	@Post('/attendances/list')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator')
	getAttendanceList(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
	) {
		return this.campService.getAttendanceList(body, req, response);
	}

	@Post('attendance/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator')
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
	@UseGuards(RoleGuard)
	@Roles('facilitator')
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
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
	async getFilter_By_Camps(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
	) {
		await this.campService.getFilter_By_Camps(body, req, response);
	}

	@Patch('/admin/reassign/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
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

	@Post('/admin/facilitators')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
	getAvailableFacilitatorList(
		@Body() body: any,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.campService.getAvailableFacilitatorList(
			body,
			request,
			response,
		);
	}

	@Patch('/admin/facilitator-reassign/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('staff', 'program_owner')
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

	@Post('/add/campdayactivity')
	@UseGuards(new AuthGuard())
	createCampDayActivity(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.campService.createCampDayActivity(body, request, response);
	}

	@Patch('/camp-day-activity/:id')
	@UseGuards(new AuthGuard())
	update_camp_day_activity(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.update_camp_day_activity(
			id,
			body,
			request,
			response,
		);
	}

	@Post('/camp-day-activity/:id')
	@UseGuards(new AuthGuard())
	getCampDayActivityById(
		@Param('id') id: number,
		@Req() request: any,
		@Body() body: any,
		@Res() response: Response,
	) {
		return this.campService.getCampDayActivityById(
			id,
			body,
			request,
			response,
		);
	}

	@Get('/:id/get-camp-sessions')
	@UseGuards(new AuthGuard())
	getCampSession(@Req() req: any, @Param('id') id: number, @Res() res) {
		return this.campService.getCampSessions(req, id, res);
	}

	@Post('/incomplete/camp-day-activity/:id')
	@UseGuards(new AuthGuard())
	getPreviousCampAcitivityById(
		@Param('id') id: number,
		@Req() request: any,
		@Body() body: any,
		@Res() response: Response,
	) {
		return this.campService.getPreviousCampAcitivityById(
			id,
			body,
			request,
			response,
		);
	}

	@Get('/random-attendance/:id')
	@UseGuards(new AuthGuard())
	getRandomAttendanceGeneration(
		@Param('id') id: number,
		@Req() request: any,

		@Res() response: Response,
	) {
		return this.campService.getRandomAttendanceGeneration(
			id,

			request,
			response,
		);
	}

	@Post('/:id/camp_learners')
	@UseGuards(new AuthGuard())
	campLearnersById(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.campLearnersById(id, body, request, response);
	}

	//multiple reassigne learner from One camp to other
	@Patch('/admin/multiplereassign/:id')
	@UseGuards(new AuthGuard())
	multiplereassignBeneficiarytoCamp(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.multiplereassignBeneficiarytoCamp(
			id,
			body,
			request,
			response,
		);
	}

	@Post('campday/campdetails')
	@UseGuards(new AuthGuard())
	campDetails(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.campService.campDetails(body, request, response);
	}
}
