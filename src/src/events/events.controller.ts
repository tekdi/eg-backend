import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Req,
	Res,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AcceptEventDto } from './dto/accept-event.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';
@UseInterceptors(SentryInterceptor)
@Controller('events')
export class EventsController {
	constructor(private readonly eventsService: EventsService) {}

	@Post('/create')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	create(
		@Body() createEventDto: CreateEventDto,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.eventsService.create(createEventDto, header, response);
	}

	@Post('/list')
	@UseGuards(new AuthGuard())
	getEventsList(
		@Body() body: Body,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.eventsService.getEventsList(body, header, response);
	}

	@Post()
	findAll(@Body() request: Record<string, any>) {
		return this.eventsService.findAll(request);
	}

	@Get(':id')
	@UseGuards(new AuthGuard())
	findOne(@Param('id') id: string, @Res() response: Response) {
		return this.eventsService.findOne(+id, response);
	}

	@Patch(':id')
	@UseGuards(new AuthGuard())
	update(
		@Param('id') id: string,
		@Req() header: Request,
		@Body() request: Record<string, any>,
		@Res() response: Response,
	) {
		return this.eventsService.update(+id, header, request, response);
	}

	@Patch('/accept/:id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	updateEventAcceptDetail(
		@Param('id') id: string,
		@Body() request: AcceptEventDto,
		@Res() response: Response,
	) {
		return this.eventsService.updateEventAcceptDetail(
			+id,
			{ rsvp: request.rsvp },
			response,
		);
	}

	@Patch('/attendance/:id')
	@UseGuards(new AuthGuard())
	updateAttendanceDetail(
		@Param('id') id: string,
		@Body() request: string,
		@Res() response: Response,
	) {
		return this.eventsService.updateAttendanceDetail(
			+id,
			request,
			response,
		);
	}

	@Delete(':id')
	@UseGuards(new AuthGuard())
	remove(
		@Param('id') id: string,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.eventsService.remove(+id, header, response);
	}

	@Post('/:id/get-participants')
	@UseGuards(new AuthGuard())
	getParticipants(
		@Req() req: any,
		@Param('id') id: any,
		@Body() body: any,
		@Res() res: any,
	) {
		return this.eventsService.getParticipants(req, id, body, res);
	}

	@Post('/add/attendance')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	createEventAttendance(
		@Req() request: any,
		@Body() body: any,
		@Res() response: Response,
	) {
		return this.eventsService.createEventAttendance(
			body,
			request,
			response,
		);
	}

	@Get('/:id/get-events-by-user_id')
	@UseGuards(new AuthGuard())
	getEventsListByUserId(
		@Req() req: any,
		@Param('id') id: any,
		@Body() body: any,
		@Res() res: any,
	) {
		return this.eventsService.getEventsListByUserId(req, id, body, res);
	}

	@Post('/camp-question-list')
	campQuestionList(
		@Body() body: string,
		@Req() request: Request,
		@Res() response: Response,
	) {
		return this.eventsService.campQuestionList(body, request, response);
	}

	@Post('/questionset/hierarchy/:id')
	campParamsCross(
		@Param('id') id: any,
		@Body() body: string,
		@Req() request: Request,
		@Res() response: Response,
	) {
		return this.eventsService.campParamsCross(id, body, request, response);
	}

	@Patch('/admin/:id/start-exam')
	@UseGuards(new AuthGuard())
	eventStartExam(
		@Param('id') id: any,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.eventsService.eventStartExam(id, request, response);
	}

	@Post('/add/event_do_id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	addEventDoId(
		@Body() body: any,
		@Req() request: Request,
		@Res() response: Response,
	) {
		return this.eventsService.addEventDoId(body, request, response);
	}

	@Get('/event_do_id/list')
	@UseGuards(new AuthGuard())
	getEventsDoIdList(@Req() req: any, @Body() body: any, @Res() res: any) {
		return this.eventsService.getEventsDoIdList(req, body, res);
	}
}
