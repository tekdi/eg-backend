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
	UsePipes,
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
	@Patch('/:id')
	@UseGuards(new AuthGuard())
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.activitiesService.update(request, body, id, response);
	}
	@Get('/')
	@UseGuards(new AuthGuard())
	list(@Req() request: any, @Res() response: any) {
		return this.activitiesService.getList(request, response);
	}
	@Get('/:id')
	@UseGuards(new AuthGuard())
	getById(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.activitiesService.getById(id, body, request, response);
	}
}
