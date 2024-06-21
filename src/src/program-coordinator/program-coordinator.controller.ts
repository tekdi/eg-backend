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
	UploadedFile,
	UseInterceptors,
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
		@Param('id') id: Number,
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
		@Param('id') id: Number,
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
		@Param('id') id: Number,
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
		@Param('id') id: Number,
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
		@Param('id') id: Number,
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
}
