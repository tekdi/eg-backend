import {
	Body,
	Controller,
	Get,
	Injectable,
	Param,
	Patch,
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

	@Post('/list')
	@UseGuards(new AuthGuard())
	list(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.activitiesService.List(body, request, response);
	}

	@Patch('/:id')
	@UseGuards(new AuthGuard())
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.activitiesService.update(id, body, request, response);
	}
}
