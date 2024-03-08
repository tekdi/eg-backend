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
} from '@nestjs/common';
import { OrganisationService } from './organisation.service';
import { AuthGuard } from '../modules/auth/auth.guard';
@Controller('organisation')
export class OrganisationController {
	constructor(private readonly organisationService: OrganisationService) {}

	@Post('/create')
	@UsePipes(ValidationPipe)
	@UseGuards(AuthGuard)
	registerCamp(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.organisationService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(AuthGuard)
	getOrganisation(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.organisationService.getOrganisation(request, req, response);
	}

	// @Get(':id')
	// findOne(@Param('id') id: string) {
	// 	return this.organisationService.findOne(+id);
	// }

	// @Patch(':id')
	// update(
	// 	@Param('id') id: string,
	// 	@Body() updateOrganisationDto: UpdateOrganisationDto,
	// ) {
	// 	return this.organisationService.update(+id, updateOrganisationDto);
	// }

	// @Delete(':id')
	// remove(@Param('id') id: string) {
	// 	return this.organisationService.remove(+id);
	// }
}
