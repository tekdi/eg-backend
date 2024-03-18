import {
	Get,
	Req,
	Res,
	Body,
	Post,
	Param,
	Patch,
	Response,
	UsePipes,
	UseGuards,
	Controller,
	ValidationPipe,
} from '@nestjs/common';
import { CampService } from './camp.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AclGuard } from 'src/common/guards/acl.guard';
import { AclGuardData } from 'src/common/decorators/aclguarddata.decorator';

@Controller('camp')
export class CampController {
	constructor(private campService: CampService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['create'])
	registerCamp(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.campService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
	campList(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.campService.campList(body, request, response);
	}

	@Post('/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
	campById(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.campById(id, body, request, response);
	}

	@Patch('/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['edit', 'edit.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['edit', 'edit.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['create'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['create'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['edit', 'edit.own'])
	updateCampStatus(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: any,
	) {
		return this.campService.updateCampStatus(id, body, req, response);
	}

	@Post('admin/camp-list')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
	getCampList(@Req() req: any, @Res() response: any, @Body() body: any) {
		return this.campService.getCampList(body, req, response);
	}

	@Get('admin/camp-details/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
	getCampDetailsForAdmin(
		@Param('id') id: number,
		@Req() req: any,
		@Res() response: any,
	) {
		return this.campService.getCampDetailsForAdmin(id, req, response);
	}

	@Post('attendance/add')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['create'])
	markCampAttendance(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
	) {
		return this.campService.markCampAttendance(body, req, response);
	}

	@Patch('attendance/update/:id')
	@UseGuards(AuthGuard)
	// @UseGuards(AclGuard)
	// @AclGuardData('camp',['edit.own'])
	updateCampAttendance(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
		@Param('id') id: number,
	) {
		return this.campService.updateCampAttendance(id, body, req, response);
	}

	//facil
	@Post('/attendances/list')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read.own'])
	getAttendanceList(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
	) {
		return this.campService.getAttendanceList(body, req, response);
	}

	//facil
	@Post('attendance/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read.own'])
	getCampAttendanceById(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
		@Param('id') id: number,
	) {
		return this.campService.getCampAttendanceById(id, body, req, response);
	}

	@Get('/getStatuswiseCount')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read.own'])
	getStatuswiseCount(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.campService.getStatuswiseCount(request, body, response);
	}

	@Post('/admin/filter-by-camps')
	@UseGuards(AuthGuard)
	@UsePipes(ValidationPipe)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
	async getFilter_By_Camps(
		@Req() req: any,
		@Res() response: any,
		@Body() body: any,
	) {
		await this.campService.getFilter_By_Camps(body, req, response);
	}

	@Patch('/admin/reassign/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('beneficiary', ['reassign.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
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
	@UseGuards(AuthGuard)
	// @UseGuards(AclGuard)
	// @AclGuardData('camp',[])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['create'])
	createCampDayActivity(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.campService.createCampDayActivity(body, request, response);
	}

	//facil
	@Patch('/camp-day-activity/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['edit.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
	getCampSession(@Req() req: any, @Param('id') id: number, @Res() res) {
		return this.campService.getCampSessions(req, id, res);
	}

	@Post('/incomplete/camp-day-activity/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
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
	//facil
	@Get('/random-attendance/:id')
	@UseGuards(AuthGuard)
	// @UseGuards(AclGuard)
	// @AclGuardData('camp',['read', 'read.own'])
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
	//facil
	@Post('/:id/camp_learners')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('camp', ['read', 'read.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('beneficiary', ['reassign.own'])
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
	@UseGuards(AuthGuard)
	// @UseGuards(AclGuard)
	// @AclGuardData('camp',[])
	campDetails(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.campService.campDetails(body, request, response);
	}
}
