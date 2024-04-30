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
import { AclGuard } from 'src/common/guards/acl.guard';
import { AclGuardData } from 'src/common/decorators/aclguarddata.decorator';
@UseInterceptors(SentryInterceptor)
@Controller('events')
export class EventsController {
	constructor(private readonly eventsService: EventsService) {}

	@Post('/create')
	@UseGuards(AuthGuard)
	@UsePipes(ValidationPipe)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['create'])
	create(
		@Body() createEventDto: CreateEventDto,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.eventsService.create(createEventDto, header, response);
	}

	@Get('/list')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['read', 'read.own'])
	getEventsList(
		@Body() body: Body,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.eventsService.getEventsList(body, header, response);
	}

	@Post()
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['read', 'read.own'])
	findAll(@Body() request: Record<string, any>) {
		return this.eventsService.findAll(request);
	}

	@Get(':id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['read.own'])
	findOne(@Param('id') id: string, @Res() response: Response) {
		return this.eventsService.findOne(+id, response);
	}

	@Patch(':id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['edit.own'])
	update(
		@Param('id') id: string,
		@Req() header: Request,
		@Body() request: Record<string, any>,
		@Res() response: Response,
	) {
		return this.eventsService.update(+id, header, request, response);
	}

	@Patch('/accept/:id')
	@UseGuards(AuthGuard)
	@UsePipes(ValidationPipe)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['edit.own'])
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
	@UseGuards(AuthGuard)
	updateAttendanceDetail(
		@Param('id') id: string,
		@Body() request: string,
		@Res() response: Response,
		@Req() req: any,
	) {
		return this.eventsService.updateAttendanceDetail(
			+id,
			request,
			response,
			req,
		);
	}

	@Delete(':id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['delete.own'])
	remove(
		@Param('id') id: string,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.eventsService.remove(+id, header, response);
	}

	@Post('/:id/get-participants')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['read.own'])
	getParticipants(
		@Req() req: any,
		@Param('id') id: any,
		@Body() body: any,
		@Res() res: any,
	) {
		return this.eventsService.getParticipants(req, id, body, res);
	}

	@Post('/add/attendance')
	@UseGuards(AuthGuard)
	@UsePipes(ValidationPipe)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['create'])
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
	//the user_id being passed here will be of staff and event's access is given to staff so it cannot access its own value and resulting in false
	@Get('/:id/get-events-by-user_id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['read.own'])
	getEventsListByUserId(
		@Req() req: any,
		@Param('id') id: any,
		@Body() body: any,
		@Res() res: any,
	) {
		return this.eventsService.getEventsListByUserId(req, id, body, res);
	}

	@Post('/camp-question-list')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('event', ['read.own'])
	campQuestionList(
		@Body() body: string,
		@Req() request: Request,
		@Res() response: Response,
	) {
		return this.eventsService.campQuestionList(body, request, response);
	}

	@Post('/questionset/hierarchy/:id')
	@UseGuards(AuthGuard)
	// @UseGuards(AclGuard)
	// @AclGuardData('event',[''])
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
}
