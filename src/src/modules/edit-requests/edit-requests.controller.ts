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
import { EditRequestService } from './edit-requests.service';

@Controller('edit-request')
export class EditRequestController {
	constructor(private editRequestService: EditRequestService) {}

	@Post('/edit-requests')
	@UseGuards(AuthGuard)
	@UsePipes(ValidationPipe)
	getEditRequestsList(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.editRequestService.getEditRequestList(
			request,
			body,
			response,
		);
	}

	@Post('/create-edit-requests')
	@UseGuards(AuthGuard)
	createEditRequests(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.editRequestService.createEditRequest(
			request,
			body,
			response,
		);
	}

	@Patch('/admin/update-edit-requests/:id')
	@UseGuards(AuthGuard)
	updateEditRequests(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
		@Param('id') id: any,
	) {
		return this.editRequestService.updateEditRequest(
			id,
			request,
			body,
			response,
		);
	}

	@Post('/admin/edit-requests')
	@UseGuards(AuthGuard)
	getAdminEditRequests(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.editRequestService.getEditRequestListAdmin(
			request,
			body,
			response,
		);
	}
}
