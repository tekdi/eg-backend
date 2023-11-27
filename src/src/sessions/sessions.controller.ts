import {
	Controller,
	Post,
	UsePipes,
	ValidationPipe,
	Body,
	Req,
	UseGuards,
	Res,
	Param,
	Response,
	Patch,
	Get,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';
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
}
