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
	Response,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('community')
@UseGuards(new AuthGuard())
@UsePipes(ValidationPipe)
export class CommunityController {
	constructor(private readonly communityService: CommunityService) {}

	@Post('/create')
	@UseGuards(new AuthGuard())
	create(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.communityService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(new AuthGuard())
	campList(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.communityService.communityList(body, request, response);
	}

	@Post('/:id')
	@UseGuards(new AuthGuard())
	campById(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.communityService.communityById(id, body, request, response);
	}

	@Patch('/:id')
	@UseGuards(new AuthGuard())
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.communityService.update(id, body, request, response);
	}
}
