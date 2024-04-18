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
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { ExamService } from './exam.service';

@Controller('exam')
export class ExamController {
	constructor(public examService: ExamService) {}

	@Get('schedule/subject/list/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async createObservation(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.examService.getExamSchedule(id, response, request);
	}
}
