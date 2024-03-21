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
import { AclGuard } from 'src/common/guards/acl.guard';
import { AclGuardData } from 'src/common/decorators/aclguarddata.decorator';

@Controller('sessions')
export class SessionsController {
	constructor(private sessionService: SessionsService) {}

	@Post('/add')
	@UsePipes(ValidationPipe)
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('session', ['create'])
	createSession(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.sessionService.createSession(body, request, response);
	}

	@Patch('/update/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('session', ['edit.own'])
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
	@UseGuards(AuthGuard)
	// @UseGuards(AclGuard)
	// @AclGuardData('session',['read.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('session', ['read.own'])
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
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('session', ['read.own'])
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
}
