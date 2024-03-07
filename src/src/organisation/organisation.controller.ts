import {
	Controller,
	Get,
	Post,
	Body,
	Req,
	Res,
	Delete,
	UseGuards,
	Response,
	UsePipes,
	ValidationPipe,
	Param,
} from '@nestjs/common';
import { OrganisationService } from './organisation.service';
import { AuthGuard } from '../modules/auth/auth.guard';
@Controller('organisation')
export class OrganisationController {
	constructor(private readonly organisationService: OrganisationService) {}

	@Post('/create')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	registerCamp(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.organisationService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(new AuthGuard())
	getOrganisation(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.organisationService.getOrganisation(request, req, response);
	}

	@Post('/details/:id')
	@UseGuards(new AuthGuard())
	getOrganisationDetails(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
		@Param('id') id: number,
	) {
		return this.organisationService.getOrganisationDetails(
			request,
			req,
			response,
			id,
		);
	}
}
