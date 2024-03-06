import {
	Body,
	Controller,
	Injectable,
	Param,
	Patch,
	Post,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { ActivitiesService } from './activities.service';

@Injectable()
@Controller('/activities')
export class ActivitiesController {
	constructor(private readonly activitiesService: ActivitiesService) {}

	@Post('/create')
	@UseGuards(AuthGuard)
	create(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.activitiesService.create(request, body, response);
	}

	@Post('/list')
	@UseGuards(AuthGuard)
	list(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.activitiesService.List(body, request, response);
	}

	@Patch('/:id')
	@UseGuards(AuthGuard)
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.activitiesService.update(id, body, request, response);
	}
}
