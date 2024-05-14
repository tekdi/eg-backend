import {
	Controller,
	Get,
	Post,
	Patch,
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
	create(@Body() body: any, @Req() request: any, @Res() response: Response) {
		return this.organisationService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(new AuthGuard())
	getOrganisation(
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.organisationService.getOrganisation(body, req, response);
	}

	@Post('/:id')
	@UseGuards(new AuthGuard())
	getOrganisationDetails(
		@Req() req: any,
		@Res() response: Response,
		@Param('id') id: number,
	) {
		return this.organisationService.getOrganisationDetails(
			req,
			response,
			id,
		);
	}

	@Get('/exist_list')
	@UseGuards(new AuthGuard())
	getOrganisationExists(
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.organisationService.getOrganisationExists(
			body,
			req,
			response,
		);
	}

	@Post('/add/existing')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	addExisting(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.organisationService.addExisting(body, request, response);
	}

	@Patch('/:id')
	@UseGuards(new AuthGuard())
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.organisationService.update(id, body, request, response);
	}
}
