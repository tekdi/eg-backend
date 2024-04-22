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
	public async createObservation(
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
}
