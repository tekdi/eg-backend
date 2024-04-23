import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
	UsePipes,
	ValidationPipe,
	Response,
	Request,
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { ExamService } from './exam.service';

@Controller('exam')
export class ExamController {
	constructor(public examService: ExamService) {}

	@Get('schedule/subject/list/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getExamSchedule(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.examService.getExamSchedule(id, response, request);
	}

	@Post('schedule')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async createExamSchedule(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.createExamSchedule(body, response, request);
	}

	@Post('schedule/edit')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async editExamSchedule(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.editExamSchedule(body, response, request);
	}

	@Get('schedule/:id/:date')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getExamScheduleByBoardIdAndDate(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
		@Param('date') date: string, // Add date parameter here
	) {
		return this.examService.getExamScheduleByBoardIdAndDate(
			id,
			date,
			response,
			request,
		); // Call the modified service function
	}
}
