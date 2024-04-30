import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { KitMaterialsService } from './kit-materials.service';
import { AclGuard } from 'src/common/guards/acl.guard';
import { AclGuardData } from 'src/common/decorators/aclguarddata.decorator';
import { AclHelper } from 'src/common/helpers/acl.helper';

@Controller('kitmaterials')
@UseGuards(AuthGuard)
export class KitMaterialsController {
	constructor(
		private readonly kitMaterialsService: KitMaterialsService,
		private aclHelper: AclHelper,
	) {}

	@Post('/create')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('kit-material', ['create'])
	async create(@Req() request: any, @Body() body: any, @Res() response: any) {
		if (
			!(await this.aclHelper.doIHaveAccess(
				request,
				'kit-material',
				body.camp_id,
			))
		) {
			return response.status(403).json({
				success: false,
				message: 'FORBIDDEN',
				data: {},
			});
		}
		return this.kitMaterialsService.create(body, request, response);
	}

	@Get('/list/:camp_id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('kit-material', ['read.own'])
	async list(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
		@Param('camp_id') camp_id: number,
	) {
		if (
			!(await this.aclHelper.doIHaveAccess(
				request,
				'kit-material',
				camp_id,
			))
		) {
			return response.status(403).json({
				success: false,
				message: 'FORBIDDEN',
				data: {},
			});
		}
		return this.kitMaterialsService.List(body, request, response, camp_id);
	}
}
