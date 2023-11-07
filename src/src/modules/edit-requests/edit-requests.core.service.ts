import { Injectable } from '@nestjs/common';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';

@Injectable()
export class EditRequestCoreService {
	constructor(
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private hasuraService: HasuraServiceFromServices,
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
	public async getEditRequest(
		edit_req_for_context_id,
		edit_req_for_context,
		program_id,
		academic_year_id,
	) {
		const data = {
			query: `query MyQuery {
				edit_requests(where: {edit_req_for_context_id: {_eq: ${edit_req_for_context_id}}, edit_req_for_context: {_eq: ${edit_req_for_context}}, program_id: {_eq: ${program_id}}, academic_year_id: {_eq: ${academic_year_id}}}) {
				  id
                  edit_req_for_context
                  edit_req_for_context_id
                  fields
                  req_date
                  req_approved_date
                  program_id
                  academic_year_id
                  status
                  edit_req_approved_by
				}
			  }`,
		};

		const response = await this.hasuraServiceFromServices.getData(data);

		return response;
	}
	public async createEditRequest(
		body: any,
		edit_req_approved_by,
		program_id,
		academic_year_id,
	) {
		const result = await this.hasuraService.q(
			'edit_requests',
			{
				edit_req_for_context_id: body.edit_req_for_context_id,
				edit_req_for_context: body.edit_req_for_context,
				edit_req_approved_by: edit_req_approved_by,
				program_id: program_id,
				academic_year_id: academic_year_id,
				status: 'approved',
				fields: JSON.stringify(body.fields).replace(/"/g, '\\"'),
				req_date: new Date(Date.now()).toISOString(),
				req_approved_date: new Date(Date.now()).toISOString(),
			},
			[],
			true,
			['id'],
		);

		return result;
	}
	public async getEditRequestList(body, edit_req_approved_by) {
		const data = {
			query: `query MyQuery {
                    edit_requests(where: {edit_req_for_context: {_eq: ${body.edit_req_for_context}}, edit_req_for_context_id: {_eq: ${body.edit_req_for_context_id}}, edit_req_approved_by: {_eq: ${edit_req_approved_by}}, status: {_eq: "approved"}}) {
                      id
                    }
            }`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		return response;
	}
}
