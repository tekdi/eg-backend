import {
	Post,
	Controller,
	UseGuards,
	Res,
	Req,
	Body,
	ValidationPipe,
	UsePipes,
	Patch,
	Param,
} from '@nestjs/common';
import { EditRequestService } from './edit-requests.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('edit-request')
export class EditRequestController {
	constructor(private editRequestService: EditRequestService) {}
	@Post('/edit-requests')
	@UseGuards(new AuthGuard())
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
	@UseGuards(new AuthGuard())
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
	@UseGuards(new AuthGuard())
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
	@UseGuards(new AuthGuard())
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
