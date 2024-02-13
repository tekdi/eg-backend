import { Injectable } from '@nestjs/common';
import { HasuraService } from '../../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';
import { UserService } from '../../user/user.service';
import { EditRequestCoreService } from './edit-requests.core.service';
@Injectable()
export class EditRequestService {
	constructor(
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private hasuraService: HasuraService,
		private editRequestCoreService: EditRequestCoreService,
		private userService: UserService,
	) {}
	public returnField = [
		'id',
		'edit_req_for_context',
		'edit_req_for_context_id',
		'fields',
		'req_date',
		'req_approved_date',
		'program_id',
		'academic_year_id',
		'status',
		'edit_req_approved_by',
	];
	public async createEditRequest(req, body, res) {
		const edit_req_approved_by = req.mw_userid;
		let result;

		const requiredFields = [
			'edit_req_for_context_id',
			'edit_req_for_context',
			'edit_req_by',
			'fields',
		];

		// Check required fields
		const missingRequiredField = requiredFields.find(
			(field) =>
				!body[field] ||
				(field === 'fields' &&
					(!Array.isArray(body[field]) ||
						body[field].length === 0)) ||
				body[field] === '',
		);

		if (missingRequiredField) {
			return res.json({
				status: 422,
				success: false,
				message: `${missingRequiredField} is required`,
			});
		}

		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;

		const response = await this.editRequestCoreService.getEditRequest(
			body.edit_req_for_context_id,
			body.edit_req_for_context,
			program_id,
			academic_year_id,
		);
		if (response?.data?.edit_requests?.length > 0) {
			let id = response?.data?.edit_requests[0]?.id;

			body.fields = JSON.stringify(body?.fields).replace(/"/g, '\\"');

			const update_array = ['status', 'fields'];

			result = await this.editRequestCoreService.updateEditDetails(
				id,
				body,
				update_array,
			);
		} else {
			result = await this.editRequestCoreService.createEditRequest(
				body,
				edit_req_approved_by,
				program_id,
				academic_year_id,
			);
		}
		return res.status(200).json({
			success: true,
			message: 'EditRequest saved successfully',
			data: result,
		});
	}

	public async getEditRequestList(req, body, res) {
		const edit_req_by = req.mw_userid;

		const response = await this.editRequestCoreService.getEditRequestList(
			req,
			body,
			edit_req_by,
		);
		return res.status(200).json({
			success: true,
			message: 'success',
			data: response.data.edit_requests,
		});
	}

	public async getEditRequestListAdmin(req, body, res) {
		const user = await this.userService.ipUserInfo(req);
		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return res.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}
		body.parent_ip_id = user?.data?.program_users?.[0]?.organisation_id;
		body.parent_ip_id = user?.data?.program_users?.[0]?.organisation_id;
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;

		const response =
			await this.editRequestCoreService.getEditRequestListAdmin(
				body,
				program_id,
				academic_year_id,
			);
		return res.status(200).json({
			success: true,
			message: 'success',
			data: response.data.edit_requests,
		});
	}

	public async updateEditRequest(id: any, req: any, body: any, res: any) {
		const user = await this.userService.ipUserInfo(req);
		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return res.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}

		let status = ['approved', 'closed'];

		if (!status.includes(body?.status)) {
			return res.json({
				status: 422,
				message: 'INVALID_PARAMETERS',
				data: {},
			});
		}

		if (body?.status == 'approved' && body?.fields?.length == 0) {
			return res.json({
				status: 422,
				message: 'INVALID_PARAMETERS',
				data: {},
			});
		}

		if (body?.status == 'closed') {
			body.fields = [];
		}

		body.fields = JSON.stringify(body?.fields).replace(/"/g, '\\"');
		let update_array = ['status', 'fields'];
		let result = await this.editRequestCoreService.updateEditDetails(
			id,
			body,
			update_array,
		);

		if (!result?.edit_requests?.id) {
			return res.status(500).json({
				status: false,
				message: 'STATUS_UPDATE_FAILURE',
				data: {},
			});
		}

		return res.status(200).json({
			status: true,
			message: 'STATUS_UPDATE_SUCCESS',
			data: result?.edit_requests?.id,
		});
	}
}
