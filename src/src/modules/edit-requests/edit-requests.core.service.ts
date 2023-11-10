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
		'edit_req_by',
	];

	public returnFieldUpdate = ['status'];
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
				  edit_req_by
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
				edit_req_by: body.edit_req_by,
			},
			[],
			false,
			['id'],
		);

		return result;
	}
	public async getEditRequestList(body, edit_req_by) {
		let {
			program_id,
			academic_year_id,
			edit_req_for_context,
			edit_req_for_context_id,
		} = body;

		let filterQueryArray = [];

		filterQueryArray.push(
			`program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}},status:{_eq:"approved"},edit_req_by:{_eq:${edit_req_by}}`,
		);

		if (edit_req_for_context) {
			filterQueryArray.push(
				`edit_req_for_context:{_eq:${edit_req_for_context}}`,
			);
		}

		if (edit_req_for_context_id) {
			filterQueryArray.push(
				`edit_req_for_context_id:{_eq:${edit_req_for_context_id}}`,
			);
		}
		const data = {
			query: `query MyQuery {
                    edit_requests(where: {${filterQueryArray}}) {
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
						edit_req_by
                    }
            }`,
		};

		const response = await this.hasuraServiceFromServices.getData(data);
		return response;
	}

	public async getEditRequestListAdmin(body) {
		let {
			program_id,
			academic_year_id,
			edit_req_for_context,
			edit_req_for_context_id,
			parent_ip_id,
		} = body;

		let filterQueryArray = [];

		filterQueryArray.push(
			`users: {program_faciltators: {parent_ip: {_eq: "${parent_ip_id}"}}},program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}}`,
		);

		if (edit_req_for_context) {
			filterQueryArray.push(
				`edit_req_for_context:{_eq:${edit_req_for_context}}`,
			);
		}

		if (edit_req_for_context_id) {
			filterQueryArray.push(
				`edit_req_for_context_id:{_eq:${edit_req_for_context_id}}`,
			);
		}
		const data = {
			query: `query MyQuery {
                    edit_requests(where: {${filterQueryArray}}) {
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
						edit_req_by
                    }
            }`,
		};

		const response = await this.hasuraServiceFromServices.getData(data);
		return response;
	}

	public async updateEditDetails(id, body, update_array) {
		let result = await this.hasuraService.q(
			'edit_requests',
			{
				...body,
				id: id,
			},
			update_array,
			true,
			[...this.returnFieldUpdate, 'id'],
		);
		return result;
	}
}
