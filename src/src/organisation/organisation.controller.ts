import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Req,
	Res,
	Delete,
	UseGuards,
	Response,
} from '@nestjs/common';
import { OrganisationService } from './organisation.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { AuthGuard } from '../modules/auth/auth.guard';
@Controller('organisation')
export class OrganisationController {
	constructor(private readonly organisationService: OrganisationService) {}

	@Post()
	create(@Body() createOrganisationDto: CreateOrganisationDto) {
		return this.organisationService.create(createOrganisationDto);
	}

	@Post('/org/list')
	@UseGuards(new AuthGuard())
	getOrganisation(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.organisationService.getOrganisation(request, req, response);
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.organisationService.findOne(+id);
	}

	@Patch(':id')
	update(
		@Param('id') id: string,
		@Body() updateOrganisationDto: UpdateOrganisationDto,
	) {
		return this.organisationService.update(+id, updateOrganisationDto);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.organisationService.remove(+id);
	}
}
