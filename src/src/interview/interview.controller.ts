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
import { AcceptInterviewDto } from './dto/accept-interview.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InterviewService } from './interview.service';

@UseInterceptors(SentryInterceptor)
@Controller('interview')
export class InterviewController {
	constructor(private readonly interviewService: InterviewService) {}

	@Post('/createinterview')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	create(
		@Body() body: CreateInterviewDto,
		@Res() response: Response,
		@Req() request: any,
	) {
		return this.interviewService.create(body, request, response);
	}

	@Get()
	@UseGuards(new AuthGuard())
	findAll(@Body() request: Record<string, any>, @Res() response: Response) {
		return this.interviewService.findAll(request, response);
	}

	@Get(':id')
	@UseGuards(new AuthGuard())
	findOne(@Param('id') id: string, @Res() response: Response) {
		return this.interviewService.findOne(+id, response);
	}

	@Patch(':id')
	@UseGuards(new AuthGuard())
	update(
		@Param('id') id: string,
		@Body() request: Record<string, any>,
		@Res() response: Response,
	) {
		return this.interviewService.update(+id, request, response);
	}

	@Patch('/accept/:id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	update_rsvp(
		@Param('id') id: string,
		@Body() request: AcceptInterviewDto,
		@Res() response: Response,
	) {
		return this.interviewService.update_rsvp(
			+id,
			{ rsvp: request.rsvp },
			response,
		);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.interviewService.remove(+id);
	}
}
