import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseGuards,
	Req,
	Res,
} from '@nestjs/common';
import { VolunteerService } from './volunteer.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('volunteer')
export class VolunteerController {
	constructor(private readonly volunteerService: VolunteerService) {}

	@Post('/list')
	@UseGuards(new AuthGuard())
	getvolunteerList(
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.volunteerService.getvolunteerList(body, req, response);
	}
	//volunteer self data update
	@Patch('/self_update/')
	@UseGuards(new AuthGuard())
	updatevolunteer(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.volunteerService.updatevolunteer(body, request, response);
	}

	@Patch('/:id')
	@UseGuards(new AuthGuard())
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.volunteerService.update(id, body, request, response);
	}

	@Post('/:id')
	@UseGuards(new AuthGuard())
	getVolunteerDetails(
		@Req() req: any,
		@Res() response: Response,
		@Param('id') id: number,
	) {
		return this.volunteerService.getVolunteerDetails(req, response, id);
	}
}
