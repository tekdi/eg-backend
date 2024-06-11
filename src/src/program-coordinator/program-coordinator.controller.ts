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
}
