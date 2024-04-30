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
import { AclGuard } from 'src/common/guards/acl.guard';
import { AclGuardData } from 'src/common/decorators/aclguarddata.decorator';
import { AclHelper } from 'src/common/helpers/acl.helper';

@Controller('pcrscores')
@UseGuards(AuthGuard)
@UsePipes(ValidationPipe)
export class PcrscoresController {
	constructor(
		private readonly pcrscoresService: PcrscoresService,
		private aclHelper: AclHelper,
	) {}

	@Post('/create')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('pcrscore', ['create'])
	create(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.pcrscoresService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('pcrscore', ['read.own'])
	pcrscoreList(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.pcrscoresService.pcrscoreList(body, request, response);
	}

	@Post('/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('pcrscore', ['read.own'])
	pcrscoreById(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.pcrscoresService.pcrscoreById(id, body, request, response);
	}

	@Get('/:user_id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('pcrscore', ['read.own'])
	async pcrscoreByUser_id(
		@Req() request: any,
		@Body() body: any,
		@Param('user_id') user_id: number,
		@Res() response: any,
	) {
		if (
			!(await this.aclHelper.doIHaveAccess(
				request,
				'pcrscore',
				request.params.user_id,
			))
		) {
			return response.status(403).json({
				success: false,
				message: 'FORBIDDEN',
				data: {},
			});
		}
		return this.pcrscoresService.pcrscoreByUser_id(
			user_id,
			body,
			request,
			response,
		);
	}

	@Patch('/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('pcrscore', ['edit.own'])
	update(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.pcrscoresService.update(id, body, request, response);
	}
}
