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
}
