import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Req,
	Res,
	Response,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
	constructor(private sessionService: SessionsService) {}

	@Post('/add')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	createSession(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.sessionService.createSession(body, request, response);
	}

	@Patch('/update/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	updateSession(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
		@Param('id') id: number,
	) {
		return this.sessionService.updateSession(id, body, request, response);
	}

	@Get('/list/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	getSessionsListByCampId(
		@Req() request: any,
		@Res() response: Response,
		@Param('id') id: number,
	) {
		return this.sessionService.getSessionsListByCampId(
			id,
			request,
			response,
		);
	}

	@Post('/details/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	getSessionDetailsById(
		@Req() request: any,
		@Res() response: Response,
		@Param('id') id: number,
		@Body() body: any,
	) {
		return this.sessionService.getSessionDetailsById(
			id,
			body,
			request,
			response,
		);
	}

	@Post('/get-one/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	getSessionDetailsByIdGetOne(
		@Req() request: any,
		@Res() response: Response,
		@Param('id') id: number,
		@Body() body: any,
	) {
		return this.sessionService.getSessionDetailsByIdGetOne(
			id,
			body,
			request,
			response,
		);
	}

	@Post('/session-wegithage/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	getSessionWegithage(
		@Req() request: any,
		@Res() response: Response,
		@Param('id') id: number,
		@Body() body: any,
	) {
		return this.sessionService.getSessionWegithage(
			id,
			body,
			request,
			response,
		);
	}
}
