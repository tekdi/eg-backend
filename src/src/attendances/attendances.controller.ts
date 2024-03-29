import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Request,
	Response,
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';

@Controller('attendances')
export class AttendancesController {
	constructor(private readonly attendancesService: AttendancesService) {}

	@Post('/createattendances')
	create(@Body() body, @Request() request, @Response() response) {
		return this.attendancesService.createAttendance(
			body,
			request,
			response,
		);
	}

	@Post()
	findAll(@Body() request: Record<string, any>) {
		return this.attendancesService.findAll(request);
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.attendancesService.findOne(+id);
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() request: Record<string, any>) {
		return this.attendancesService.update(+id, request);
	}

	@Get('/get/user-attendance-list')
	getUserAttendanceList(
		@Request() req: any,
		@Body() body: any,
		@Response() res: any,
	) {
		return this.attendancesService.getUserAttendanceList(req, body, res);
	}
}
