import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class ReferencesService {
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
		'program_id',
		'academic_year_id',
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
		'program_id',
		'academic_year_id',
	];

	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}

	async create(body: any, request: any, resp: any) {
		let facilitator_id = request.mw_userid;
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let context = 'community.user';
		let contact = body?.contact_number;

		let response;
		let reference_query = `query MyQuery {
			references_aggregate(where: {context: {_eq: "${context}"},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}},context_id: {_eq: ${facilitator_id}}, contact_number: {_eq: ${contact}}}) {
			  aggregate {
				count
			  }
			}
		  }`;

		let user_query = `query MyQuery {
			users_aggregate(where:{id:{_eq:${facilitator_id}},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}},mobile:{_eq:${contact}}}) {
			  aggregate {
				count
			  }
			}
		  }
		  `;

		const reference_response = await this.hasuraServiceFromServices.getData(
			{
				query: reference_query,
			},
		);
		const reference_mobile_count =
			reference_response?.data?.references_aggregate?.aggregate?.count;

		const user_response = await this.hasuraServiceFromServices.getData({
			query: user_query,
		});
		const user_mobile_count =
			user_response?.data?.users_aggregate?.aggregate?.count;

		if (user_mobile_count > 0 || reference_mobile_count > 0) {
			return resp.json({
				status: 400,
				message: 'Mobile number already exists',
				data: {},
			});
		}

		response = await this.hasuraService.create(
			this.table,
			{
				...body,
				context: 'community.user',
				context_id: facilitator_id,
				academic_year_id: academic_year_id,
				program_id: program_id,
			},
			this.returnFields,
		);

		const community_response = response?.community;
		if (!community_response?.id) {
			return resp.status(200).json({
				success: true,
				message: 'Community Reference added successfully!',
				data: response,
			});
		} else {
			return resp.json({
				status: 404,
				message: 'Unable to add Community Reference!',
				data: { community_response },
			});
		}
	}

	public async communityList(body: any, req: any, resp) {
		const facilitator_id = req.mw_userid;
		let academic_year_id = req?.mw_academic_year_id;
		let program_id = req?.mw_program_id;
		let context = body?.context;

		let query = `query MyQuery {
			references(where: {context_id: {_eq: ${facilitator_id}},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}},context:{_eq:"${context}"}}, order_by: {id: desc}) {
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

		const community_response = response?.data?.references;

		if (community_response?.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Community References Data found successfully!',
				data: {
					community_response,
				},
			});
		} else {
			return resp.status(404).json({
				success: false,
				status: 404,
				message: 'Community References Data Not Found',
				data: { community_response },
			});
		}
	}

	public async communityById(id: any, body: any, req: any, resp: any) {
		const facilitator_id = req?.mw_userid;
		const academic_year_id = req?.mw_academic_year_id;
		const program_id = req?.mw_program_id;

		let query = `query MyQuery {
			references(where: {id:{_eq:${id}},program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}},context_id: {_eq: ${facilitator_id}}}) {
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
		const community_response = response?.data?.references;

		if (community_response.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Community Reference Data found successfully!',
				data: { community_response },
			});
		} else {
			return resp.status(404).json({
				success: false,
				status: 404,
				message: 'Community References Data Not Found',
				data: { community_response },
			});
		}
	}

	async update(id: any, body: any, request: any, resp: any) {
		let facilitator_id = request?.mw_userid;
		let context = body?.context;
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let reference_id = id;
		let response;

		let query = `query MyQuery {
			references(where: {context_id: {_eq: ${facilitator_id}},program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}},context:{_eq:"${context}"},id:{_eq:${reference_id}}}) {
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
				success: true,
				message: 'Community Reference Updated successfully!',
				data: response,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Unable to Update Community Reference!',
				data: {},
			});
		}
	}
}
