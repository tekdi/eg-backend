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
	UploadedFile,
	UseInterceptors,
	Response,
	Request,
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { ExamService } from './exam.service';
import { FileInterceptor } from '@nestjs/platform-express/multer';

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

	@Post('/result/upload')
	//@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	@UseInterceptors(FileInterceptor('resultfile')) //  'jsonpayload' is the name of the field for the uploaded file
	public async userOnboarding(
		@UploadedFile() file: Express.Multer.File,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.resultUpload(file, response, request);
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

	@Post('schedule/learner/attendance/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getLearnerAttendanceBySubjectId(
		@Res() response: Response,
		@Req() request: Request,
		@Body() body: Body,
	) {
		return this.examService.getLearnerAttendanceBySubjectId(
			body,
			request,
			response,
		);
	} // Call the modified service function

	@Post('schedule/attendance')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async addExamScheduleAttendance(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.addExamScheduleAttendance(
			body,
			response,
			request,
		);
	}

	@Get('attendance/report')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getAttendanceReport(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.getAttendanceReport(body, request, response);
	}

	@Post('result')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async createExamResult(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.createExamResult(body, request, response);
	}

	@Post('learner/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getCampRegisteredLearners(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.getCampRegisteredLearners(
			body,
			request,
			response,
		);
	}

	@Post('result/search')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getExamResult(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.getExamResult(body, request, response);
	}

	@Get('result/report')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getExamResultReport(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.getExamResultReport(body, request, response);
	}

	@Post('result/subject')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getExamResultSubject(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.examService.getExamResultSubject(body, request, response);
	}
}
