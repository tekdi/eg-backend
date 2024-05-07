import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	Res,
	Req,
	UseGuards,
	Response,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { OnestusertrackService } from './onestusertrack.service';
import { UpdateOnestusertrackDto } from './dto/update-onestusertrack.dto';
import { AuthGuard } from '../modules/auth/auth.guard';
@Controller('onestusertrack')
export class OnestusertrackController {
	constructor(
		private readonly onestusertrackService: OnestusertrackService,
	) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	create(@Body() body: any, @Req() request: any, @Res() response: Response) {
		return this.onestusertrackService.create(body, request, response);
	}
}