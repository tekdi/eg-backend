import {
	Body,
	Controller,
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
import { ReferencesService } from './references.service';

@Controller('references')
@UseGuards(AuthGuard)
@UsePipes(ValidationPipe)
export class ReferencesController {
	constructor(private readonly referencesService: ReferencesService) {}

	@Post('/create')
	@UseGuards(AuthGuard)
	create(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.referencesService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(AuthGuard)
	communityList(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.referencesService.communityList(body, request, response);
	}

	@Post('/:id')
	@UseGuards(AuthGuard)
	communityById(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.referencesService.communityById(
			id,
			body,
			request,
			response,
		);
	}

	@Patch('/:id')
	@UseGuards(AuthGuard)
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.referencesService.update(id, body, request, response);
	}
}
