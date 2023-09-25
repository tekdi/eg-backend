import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class CommunityService {
	public table = 'references';
	public fillable = [
		'name',
		'contact_number',
		'type_of_document',
		'designation',
		'context',
		'context_id',
		'document_id',
		'first_name',
		'middle_name',
		'last_name',
		'relation',
	];
	public returnFields = [
		'id',
		'name',
		'contact_number',
		'type_of_document',
		'designation',
		'context',
		'context_id',
		'document_id',
		'first_name',
		'middle_name',
		'last_name',
		'relation',
	];
	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}
	async create(body: any, request: any, resp: any) {
		let facilitator_id = request.mw_userid;

		let response;

		response = await this.hasuraService.create(
			this.table,
			{
				...body,
				context: 'community.user',
				context_id: facilitator_id,
			},
			this.returnFields,
		);

		const community_response = response?.community;
		if (!community_response?.id) {
			return resp.status(400).json({
				success: false,
				message: 'Community created successfully!',
				data: response,
			});
		} else {
			return resp.json({
				status: 200,
				message: 'Unable to create Community!',
				data: { community_response },
			});
		}
	}

	public async communityList(body: any, req: any, resp) {
		const facilitator_id = req.mw_userid;
		let context = body?.context;

		let query = `query MyQuery {
			references(where: {context_id: {_eq: ${facilitator_id}},context:{_eq:"${context}"}}) {
				id
				name
				contact_number
				context
				context_id
				first_name
				middle_name
				last_name
				relation
				designation
				document_id
				type_of_document
			}
		  }`;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.references;

		if (newQdata.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Community Data Not Found',
				data: {},
			});
		}
	}

	public async communityById(id: any, body: any, req: any, resp: any) {
		const facilitator_id = req.mw_userid;

		let query = `query MyQuery {
			references(where: {id:{_eq:${id}},context_id: {_eq: ${facilitator_id}}}) {
			  id
			  name
			  contact_number
			  context
			  context_id
			  first_name
			  middle_name
			  last_name
			  relation
			  designation
			  document_id
			  type_of_document
			}
		  }`;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.references;

		if (newQdata.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Community Data Not Found',
				data: {},
			});
		}
	}

	async update(id: any, body: any, request: any, resp: any) {
		let facilitator_id = request.mw_userid;
		let context = body?.context;
		let reference_id = id;
		let response;

		let query = `query MyQuery {
			references(where: {context_id: {_eq: ${facilitator_id}},context:{_eq:"${context}"},id:{_eq:${reference_id}}}) {
				id
				name
				context
				context_id
			  }
		  }`;
		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let community_id = hasura_response?.data?.references?.[0]?.id;

		if (community_id) {
			response = await this.hasuraService.q(
				this.table,
				{
					...body,
					id: community_id,
				},
				[
					'name',
					'contact_number',
					'type_of_document',
					'designation',
					'document_id',
					'first_name',
					'middle_name',
					'last_name',
					'relation',
				],
				true,
				[
					...this.returnFields,
					'id',
					'name',
					'contact_number',
					'type_of_document',
					'designation',
					'context',
					'context_id',
					'document_id',
					'first_name',
					'middle_name',
					'last_name',
					'relation',
				],
			);
			return resp.status(200).json({
				success: false,
				message: 'Community Updated successfully!',
				data: response,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Unable to Update Community!',
				data: {},
			});
		}
	}
}
