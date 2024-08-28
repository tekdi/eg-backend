import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
	UsePipes,
	ValidationPipe,
	Response,
	Request,
	Patch,
	Delete,
} from '@nestjs/common';

import { AuthGuard } from 'src/modules/auth/auth.guard';
import { ProgramCoordinatorService } from './program-coordinator.service';

@Controller('program-coordinator')
export class ProgramCoordinatorController {
	constructor(public programCoordinatorService: ProgramCoordinatorService) {}

	@Post('/register/:role')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	public async register(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
		@Param('role') role: string,
	) {
		return this.programCoordinatorService.programCoordinatorRegister(
			body,
			request,
			response,
			role,
		);
	}

	@Post('/:id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	public async getProgramCoodrinatordetails(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.programCoordinatorService.getProgramCoordinatorDetails(
			id,
			body,
			request,
			response,
		);
	}

	@Post('/')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	public async getProgramCoodinatorList(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.programCoordinatorService.getProgramCoodinatorList(
			body,
			request,
			response,
		);
	}

	@Post('/availablefacilitator/:id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	public async getAvailableFacilitatorList(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.programCoordinatorService.getAvailableFacilitatorList(
			id,
			body,
			request,
			response,
		);
	}

	@Patch('/:id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	public async updateProgramCoordinatorToFacilitator(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.programCoordinatorService.updateProgramCoordinatorToFacilitator(
			id,
			body,
			request,
			response,
		);
	}

	//daily activities
	@Post('/activities/create')
	@UseGuards(new AuthGuard())
	public async activitiesCreate(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.programCoordinatorService.activitiesCreate(
			request,
			body,
			response,
		);
	}
	@Patch('/activities/:id')
	@UseGuards(new AuthGuard())
	public async activitiesUpdate(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
		@Param('id') id: number,
	) {
		return this.programCoordinatorService.activitiesUpdate(
			request,
			body,
			response,
			id,
		);
	}
	@Delete('/activities/:id')
	@UseGuards(new AuthGuard())
	public async activitiesDelete(
		@Req() request: any,
		@Res() response: any,
		@Param('id') id: number,
	) {
		return this.programCoordinatorService.activitiesDelete(
			request,
			response,
			id,
		);
	}
	@Post('/activities/list')
	@UseGuards(new AuthGuard())
	public async activitiesList(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.programCoordinatorService.activitiesList(
			body,
			request,
			response,
		);
	}

	@Post('/learners/facilitator/list')
	@UseGuards(new AuthGuard())
	public async getFacilitatorsListForProgramCoordinator(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.programCoordinatorService.getFacilitatorsListForProgramCoordinator(
			body,
			request,
			response,
		);
	}

	@Post('/learners/list')
	@UseGuards(new AuthGuard())
	public async getLearnerListDetailsForProgramCoordinator(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.programCoordinatorService.getLearnerListDetailsForProgramCoordinator(
			body,
			request,
			response,
		);
	}

	@Post('/facilitators/cohort')
	@UseGuards(new AuthGuard())
	public async getCohortDataForProgramCoordinator(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.programCoordinatorService.getCohortDataForProgramCoordinator(
			body,
			request,
			response,
		);
	}

	@Post('/beneficiaries/:id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	public async getBeneficiaryDetailsforProgramCoordinator(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
		@Param() id: Number,
	) {
		return this.programCoordinatorService.getBeneficiaryDetailsforProgramCoordinator(
			id,
			body,
			request,
			response,
		);
	}

	@Post('/camps/list')
	@UseGuards(new AuthGuard())
	public async getCampDetailsForProgramCoordinator(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.programCoordinatorService.getCampDetailsForProgramCoordinator(
			body,
			request,
			response,
		);
	}

	@Post('/camps/:id')
	@UseGuards(new AuthGuard())
	public async campByIdForProgramCoordinator(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
		@Param() id: any,
	) {
		return this.programCoordinatorService.campByIdForProgramCoordinator(
			id,
			body,
			request,
			response,
		);
	}

	@Post('/info/:id')
	public async getFacilitatorDetails(
		@Param('id') id: number,
		@Res() response: Response,
		@Req() request: any,
		@Body() body: any,
	) {
		return this.programCoordinatorService.getFacilitatorDetails(
			id,
			body,
			request,
			response,
		);
	}

	@Get('/profile')
	public async getProgramCoordinatorProfile(
		@Res() response: Response,
		@Req() request: any,
	) {
		return this.programCoordinatorService.getProgramCoordinatorProfile(
			request,
			response,
		);
	}

	@Patch('/profile/:id')
	@UseGuards(new AuthGuard())
	public async updateProfile(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
		@Param('id') id: number,
	) {
		return this.programCoordinatorService.updateProfile(
			request,
			body,
			response,
			id,
		);
	}

	@Get('/board/:id')
	@UseGuards(new AuthGuard())
	public async getBoardNameById(
		@Param('id') id: number,
		@Res() response: any,
		@Req() request: any,
	) {
		return this.programCoordinatorService.getBoardNameById(
			id,
			response,
			request,
		);
	}

	@Get('/subject/list/:id')
	@UseGuards(new AuthGuard())
	public async getSubjectsByBoard(
		@Param('id') id: number,
		@Res() response: any,
		@Req() request: any,
	) {
		return this.programCoordinatorService.getSubjectsByBoard(
			id,
			response,
			request,
		);
	}

	@Post('/get/academic-year-details')
	public async getAcademicyearDetailsByProgram(
		@Body() body: any,
		@Res() response: Response,
		@Req() request: any,
	) {
		return this.programCoordinatorService.getAcademicyearDetailsByProgram(
			body,
			request,
			response,
		);
	}
}
