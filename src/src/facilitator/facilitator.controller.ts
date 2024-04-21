import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	Res,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { AuthGuard } from '../modules/auth/auth.guard';
import { FilterFacilitatorDto } from './dto/filter-facilitator.dto';
import { FacilitatorService } from './facilitator.service';
import { AclGuard } from 'src/common/guards/acl.guard';
import { AclGuardData } from 'src/common/decorators/aclguarddata.decorator';
import { AclHelper } from 'src/common/helpers/acl.helper';
import { UserService } from 'src/user/user.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@UseInterceptors(SentryInterceptor)
@Controller('/facilitators')
export class FacilitatorController {
	public url = process.env.HASURA_BASE_URL;
	constructor(
		public facilitatorService: FacilitatorService,
		public aclHelper: AclHelper,
		public userService: UserService,
		private hasuraServiceFromService: HasuraServiceFromServices,
	) {}

	// @Post('/create')
	// create(@Body() createFacilitatorDto: CreateFacilitatorDto) {
	//   return this.facilitatorService.create(createFacilitatorDto);
	// }

	// @Post()
	// findAll(@Body() request: Record<string, any>) {
	//   return this.facilitatorService.findAll(request);
	// }

	// @Get(':id')
	// findOne(@Param('id') id: string) {
	//   return this.facilitatorService.findOne(+id);
	// }

	// @Patch(':id')
	// update(@Param('id') id: string, @Body() request: Record<string, any>) {
	//   return this.facilitatorService.update(+id, request);
	// }

	@Get('/getStatuswiseCount')
	@UseGuards(AuthGuard)
	// @UseGuards(AclGuard)
	// @AclGuardData('facilitator', ['read', 'read.own'])
	async getStatuswiseCount(@Req() request: any, @Res() response: Response) {
		return this.facilitatorService.getStatuswiseCount(request, response);
	}

	@Post('/forOrientation')
	@UseGuards(AuthGuard)
	async getFacilitatorsForOrientation(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.facilitatorService.getFacilitatorsForOrientation(
			request,
			body,
			response,
		);
	}
	@Delete('/experience/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('facilitator', ['delete.own'])
	removeExperience(
		@Param('id') id: string,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.facilitatorService.removeExperience(+id, request, response);
	}

	@Patch('/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('facilitator', ['edit', 'edit.own'])
	@UsePipes(ValidationPipe)
	update(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Res() response: any,
		@Req() req?: any,
	) {
		return this.facilitatorService.update(+id, body, response, req);
	}

	@Patch('admin/okyc_details_override')
	@UseGuards(AuthGuard)
	@AclGuardData('facilitator', ['edit.own'])
	async okyc_update(
		@Req() req: any,
		@Body() body: any,
		@Res() response: any,
	) {
		if (
			!(await this.aclHelper.doIHaveAccess(req, 'facilitator', body?.id))
		) {
			return response.status(403).json({
				success: false,
				message: 'FORBIDDEN',
				data: {},
			});
		}
		return this.facilitatorService.okyc_update(body, req, response);
	}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseGuards(AuthGuard)
	async getFacilitators(
		@Req() req: any,
		@Body() body: FilterFacilitatorDto,
		@Res() response: any,
	) {
		return this.facilitatorService.getFacilitators(req, body, response);
	}

	@Post('/admin/search-by-ids')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('facilitator', ['read', 'read.own'])
	@UsePipes(ValidationPipe)
	async getFacilitatorsFromIds(@Body() body: any, @Res() res: any) {
		const ids = body.Ids;

		if (!Array.isArray(ids)) {
			return res.status(400).json({
				success: false,
				message: 'Invalid request. The IDs array is invalid.',
				data: {},
			});
		}
		for (const id of ids) {
			if (
				!(await this.aclHelper.doIHaveAccess(
					null,
					'facilitator',
					parseInt(id, 10),
				))
			) {
				return res.status(403).json({
					success: false,
					message: 'FORBIDDEN',
					data: {},
				});
			}
		}
		const result = await this.facilitatorService.getFacilitatorsFromIds(
			body.Ids,
			body.search,
		);
		return res.status(result.success ? 200 : 500).json({
			success: result.success,
			message: result.message,
			data: result.users,
		});
	}

	@Post('/admin/filter-by-beneficiaries')
	@UseGuards(AuthGuard)
	@UsePipes(ValidationPipe)
	async getFilter_By_Beneficiaries(
		@Body() body: any,
		@Res() res: any,
		@Req() req: any,
	) {
		await this.facilitatorService.getFilter_By_Beneficiaries(
			body,
			res,
			req,
		);
	}

	@Post('/exportCsv')
	@UseGuards(AuthGuard)
	@UsePipes(ValidationPipe)
	async exportFileToCsv(
		@Req() request: any,
		@Body() body: FilterFacilitatorDto,
		@Res() response: any,
	) {
		return this.facilitatorService.exportFileToCsv(request, body, response);
	}

	@Patch('update-facilitator-aadhar/:id')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('facilitator', ['edit.own'])
	updatePrerakAadhar(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: any,
	) {
		return this.facilitatorService.updatePrerakAadhar(
			id,
			req,
			body,
			response,
		);
	}

	@Post('/admin/learner-status-distribution')
	@UseGuards(AuthGuard)
	@UsePipes(ValidationPipe)
	async getLearnerStatusDistribution(
		@Req() req: any,
		@Body() body: FilterFacilitatorDto,
		@Res() response: any,
	) {
		return this.facilitatorService.getLearnerStatusDistribution(
			req,
			body,
			response,
		);
	}

	@Get('/admin/prerak-learner-list/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(AclGuard)
	@AclGuardData('facilitator', ['read', 'read.own'])
	async getLearnerListByPrerakId(
		@Req() req: any,
		@Body() body: FilterFacilitatorDto,
		@Param('id') id: string,
		@Query() query: any,
		@Res() response: any,
	) {
		return this.facilitatorService.getLearnerListByPrerakId(
			req,
			id,
			query,
			response,
		);
	}

	@Post('/update-okyc-response')
	@UseGuards(AuthGuard)
	async updateOkycResponse(
		@Req() req: any,
		@Body() body: any,
		@Res() res: any,
	) {
		if (
			!(await this.aclHelper.doIHaveAccess(
				req,
				'facilitator',
				req.mw_userid,
			))
		) {
			return res.status(403).json({
				success: false,
				message: 'FORBIDDEN',
				data: {},
			});
		}
		return this.facilitatorService.updateOkycResponse(req, body, res);
	}

	@Post('/program-facilitator/add')
	@UseGuards(AuthGuard)
	@UseGuards(AclGuard)
	@AclGuardData('facilitator', ['create'])
	createProgramFacilitator(
		@Req() req: any,
		@Body() body: any,
		@Res() res: any,
	) {
		return this.facilitatorService.createProgramFacilitator(req, body, res);
	}
}
