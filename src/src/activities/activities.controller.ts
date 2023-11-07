import {
	Body,
	Controller,
	Get,
	Injectable,
	Post,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Injectable()
@Controller('/activities')
export class ActivitiesController {
	constructor(private readonly activitiesService: ActivitiesService) {}

	@Post('/create')
	@UseGuards(new AuthGuard())
	create(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.activitiesService.create(request, body, response);
	}

	@Get('/list')
	@UseGuards(new AuthGuard())
	list(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.activitiesService.List(body, request, response);
	}
}
