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
@UseGuards(new AuthGuard())
@UsePipes(ValidationPipe)
export class ReferencesController {
	constructor(private readonly referencesService: ReferencesService) {}

	@Post('/create')
	@UseGuards(new AuthGuard())
	create(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.referencesService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(new AuthGuard())
	communityList(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.referencesService.communityList(body, request, response);
	}

	@Post('/:id')
	@UseGuards(new AuthGuard())
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
	@UseGuards(new AuthGuard())
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.referencesService.update(id, body, request, response);
	}
}
