import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Req,
	Res,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { PcrscoresService } from './pcrscores.service';

@Controller('pcrscores')
@UseGuards(new AuthGuard())
@UsePipes(ValidationPipe)
export class PcrscoresController {
	constructor(private readonly pcrscoresService: PcrscoresService) {}

	@Post('/create')
	@UseGuards(new AuthGuard())
	create(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.pcrscoresService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(new AuthGuard())
	pcrscoreList(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.pcrscoresService.pcrscoreList(body, request, response);
	}

	@Post('/:id')
	@UseGuards(new AuthGuard())
	pcrscoreById(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.pcrscoresService.pcrscoreById(id, body, request, response);
	}

	@Get('/:user_id')
	@UseGuards(new AuthGuard())
	pcrscoreByUser_id(
		@Req() request: any,
		@Body() body: any,
		@Param('user_id') user_id: number,
		@Res() response: any,
	) {
		return this.pcrscoresService.pcrscoreByUser_id(
			user_id,
			body,
			request,
			response,
		);
	}

	@Patch('/:id')
	@UseGuards(new AuthGuard())
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.pcrscoresService.update(id, body, request, response);
	}

	@Post('/subjects/list')
	@UseGuards(new AuthGuard())
	pcr_subject_list(@Body() body, @Req() request: any, @Res() response: any) {
		return this.pcrscoresService.pcr_subject_list(body, request, response);
	}

	@Post('/subjects/learners')
	@UseGuards(new AuthGuard())
	pcr_camp_learner_list(
		@Body() body,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.pcrscoresService.pcr_camp_learner_list(
			body,
			request,
			response,
		);
	}

	@Post('/create/formative-assesment')
	@UseGuards(new AuthGuard())
	pcr_formative_upsert(
		@Body() body,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.pcrscoresService.pcr_formative_upsert(
			body,
			request,
			response,
		);
	}
}
