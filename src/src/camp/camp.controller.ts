// camp.controller.ts

import {
	Controller,
	Post,
	UsePipes,
	ValidationPipe,
	Body,
	Req,
	UseGuards,
	Res,
	Param,
	Response,
	Patch,
	Get,
} from '@nestjs/common';
import { CampService } from './camp.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { RoleGuard } from 'src/modules/auth/role.guard';
import { Roles } from 'src/modules/auth/role.decorator';
@Controller('camp')
export class CampController {
	constructor(private campService: CampService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('faciltator', 'staff')
	registerCamp(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.campService.create(body, request, response);
	}

	@Post('/list')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator', 'staff')
	campList(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.campService.campList(body, request, response);
	}

	@Post('/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator', 'staff')
	campById(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.campById(id, body, request, response);
	}

	@Patch('/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator', 'staff')
	updateCampDetails(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.campService.updateCampDetails(id, body, request, response);
	}

	@Post('/consent/create')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator', 'staff')
	createConsentBenficiaries(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.campService.createConsentBenficiaries(
			body,
			request,
			response,
		);
	}

	@Post('/consent/get')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('facilitator', 'staff') // Specify the required role for this route
	getConsentBenficiaries(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.campService.getConsentBenficiaries(body, request, response);
	}

	@Post('/admin/consent/get')
	@UseGuards(new AuthGuard())
	getAdminConsentBenficiaries(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.campService.getAdminConsentBenficiaries(
			body,
			request,
			response,
		);
	}

	@Patch('admin/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('staff') // Specify the required role for this route
	updateCampStatus(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: any,
	) {
		return this.campService.updateCampStatus(id, body, req, response);
	}

	@Post('admin/camp-list')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('staff') // Specify the required role for this route
	getCampList(@Req() req: any, @Res() response: any, @Body() body: any) {
		return this.campService.getCampList(body, req, response);
	}

	@Get('admin/camp-details/:id')
	@UseGuards(new AuthGuard())
	@UseGuards(RoleGuard)
	@Roles('staff') // Specify the required role for this route
	getCampDetailsForAdmin(
		@Param('id') id: number,
		@Req() req: any,
		@Res() response: any,
	) {
		return this.campService.getCampDetailsForAdmin(id, req, response);
	}
}
