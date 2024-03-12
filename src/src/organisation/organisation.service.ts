import { Injectable } from '@nestjs/common';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class OrganisationService {
	constructor(
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}

	async create(body: any, request: any, response: any) {
		const organisationData = {
			name: body?.name,
			mobile: body?.mobile,
			contact_person: body?.contact_person,
			address: body?.address,
		};

		const tableName = 'organisations';
		const newOrganisation = await this.hasuraService.q(
			tableName,
			organisationData,
			['name', 'mobile', 'contact_person', 'address'],
		);

		if (!newOrganisation || !newOrganisation?.organisations.id) {
			throw new Error('Failed to create organisation.');
		}
		const organisation = newOrganisation?.organisations;

		// Step 2: Insert data into the 'program_organisation' table
		const programOrganisationData = {
			organisation_id: organisation?.id,
			program_id: request.mw_program_id,
			academic_year_id: request.mw_academic_year_id,
			status: 'active',
			// Other fields as needed
		};

		const programOrganisationTableName = 'program_organisation';
		const program_org = await this.hasuraService.q(
			programOrganisationTableName,
			programOrganisationData,
		);

		// Return success response
		response.status(200).json({
			success: true,
			message: 'Organisation created successfully.',
			data: {
				organisation,
				program_org: program_org?.program_organisation,
			},
		});
	}

	public async getOrganisation(body: any, req: any, resp: any) {
		const academic_year_id = req?.mw_academic_year_id;
		const program_id = req?.mw_program_id;

		try {
			const page = isNaN(body.page) ? 1 : parseInt(body.page);
			const limit = isNaN(body.limit) ? 10 : parseInt(body.limit);
			let offset = page > 1 ? limit * (page - 1) : 0;
			let order_by = '';
			if (body?.order_by) {
				let { name, id } = body?.order_by;
				let errorData = {};
				if (name && !['asc', 'desc'].includes(name)) {
					errorData = {
						message: `Invalid value for order_by name ${name}`,
					};
				} else if (id && !['asc', 'desc'].includes(id)) {
					errorData = {
						message: `Invalid value for order_by id ${id}`,
					};
				}
				if (Object.keys(errorData).length > 0) {
					return resp.status(422).send({
						success: false,
						...errorData,
					});
				} else {
					const order = JSON.stringify({ name, id }).replace(
						/"/g,
						'',
					);
					order_by = `, order_by:${order}`;
				}
			}

			let searchQuery = '';
			if (body.search && !isNaN(body.search)) {
				let id = parseInt(body.search);
				searchQuery = `id: {_eq: ${id}}`;
			} else if (body.search) {
				if (body.search && body.search !== '') {
					let first_name = body.search.split(' ')[0];
					let last_name = body.search.split(' ')[1] || '';

					if (last_name?.length > 0) {
						searchQuery = `_and:[{name: { _ilike: "%${first_name}%" }}, {name: { _ilike: "%${last_name}%" }}],`;
					} else {
						searchQuery = `_or:[{name: { _ilike: "%${first_name}%" }}, {name: { _ilike: "%${first_name}%" }}],`;
					}
				}
			}

			let data = {
				query: `query MyQuery($limit:Int, $offset:Int) {
					organisations_aggregate(where: {${searchQuery}
            program_organisations: {
              program_id:{_eq:${program_id}},
              academic_year_id:{_eq:${academic_year_id}}
              status:{_eq:"active"}
            }}){
						aggregate{
							count
						}
				}
          organisations(where: {${searchQuery}
            program_organisations: {
              program_id:{_eq:${program_id}},
              academic_year_id:{_eq:${academic_year_id}}
              status:{_eq:"active"}
            }
          }limit: $limit,
          offset: $offset ${order_by},) {
            id
            name
            contact_person
            mobile
          }
        }
			`,
				variables: {
					limit: limit,
					offset: offset,
				},
			};

			const response = await this.hasuraServiceFromServices.getData(data);

			const organisations = response?.data?.organisations || [];
			const count =
				response?.data?.organisations_aggregate?.aggregate?.count;
			const totalPages = Math.ceil(count / limit);
			return resp.status(200).send({
				success: true,
				message: 'Organisation list found successfully',
				data: organisations,
				totalCount: count,
				limit,
				currentPage: page,
				totalPages: totalPages,
			});
		} catch (error) {
			// Log error and return a generic error response
			console.error('Error fetching organizations:', error);
			return resp.status(422).send({
				success: false,
				message: 'An error occurred while fetching organizations',
				data: {},
			});
		}
	}

	public async getOrganisationDetails(req: any, resp: any, id: any) {
		const academic_year_id = req?.mw_academic_year_id;
		const program_id = req?.mw_program_id;
		const org_id = id;
		try {
			let data = {
				query: `query MyQuery {
          organisations(where: {id:{_eq:${org_id}}
          }) {
            id
            name
            contact_person
            mobile
            program_organisations(where:{program_id: {_eq: ${program_id}}, academic_year_id: {_eq: ${academic_year_id}}, status: {_eq: "active"}}){
              program_id
              academic_year_id
              status
            }
          }
        }
			`,
			};

			const response = await this.hasuraServiceFromServices.getData(data);

			const organisations = response?.data?.organisations || [];

			if (organisations.length == 0) {
				return resp.status(422).send({
					success: false,
					message: 'Organisation Details Not found!',
					data: organisations,
				});
			} else {
				return resp.status(200).send({
					success: true,
					message: 'Organisation Details found successfully!',
					data: organisations,
				});
			}
		} catch (error) {
			// Log error and return a generic error response
			console.error('Error fetching organizations:', error);
			return resp.status(422).send({
				success: false,
				message: 'An error occurred while fetching organizations',
				data: {},
			});
		}
	}

	public async getOrganisationexists(body: any, req: any, resp: any) {
		const academic_year_id = req?.mw_academic_year_id;
		const program_id = req?.mw_program_id;

		try {
			let data = {
				query: `query MyQuery {
					organisations(where: {_not: {program_organisations: {academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq: ${program_id}}}}}) {
						id
						name
					}
				}
			`,
			};

			const response = await this.hasuraServiceFromServices.getData(data);

			const organisations = response?.data?.organisations || [];

			if (organisations.length > 0) {
				return resp.status(200).send({
					success: true,
					message: 'Organisation exists',
					data: organisations,
				});
			} else {
				return resp.status(422).send({
					success: true,
					message: 'Organisation not exists',
					data: organisations,
				});
			}
		} catch (error) {
			// Log error and return a generic error response
			console.error('Error fetching organizations:', error);
			return resp.status(422).send({
				success: false,
				message: 'An error occurred while fetching organizations',
				data: {},
			});
		}
	}
}
