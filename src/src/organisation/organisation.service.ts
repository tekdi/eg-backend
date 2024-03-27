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
		let checkemail = {
			query: `query MyQuery {
			organisations_aggregate(where: {email_id: {_eq: "${body?.email_id}"}}){
				aggregate{
					count
				}
			}
		}`,
		};
		const emailcount = await this.hasuraServiceFromServices.getData(
			checkemail,
		);
		const count =
			emailcount?.data?.organisations_aggregate?.aggregate?.count;

		if (count > 0) {
			return response.status(422).send({
				success: false,
				key: 'email_id',
				message: 'Email ID Already Exists',
				data: {},
			});
		}
		const {
			learner_target,
			doc_per_cohort_id,
			doc_per_monthly_id,
			doc_quarterly_id,
			learner_per_camp,
			camp_target,
		} = body;
		const missingFields = [
			'learner_target',
			'doc_per_cohort_id',
			'doc_per_monthly_id',
			'doc_quarterly_id',
			'learner_per_camp',
			'camp_target',
		].filter((field) => !body[field] && body[field] != '');

		if (missingFields.length > 0) {
			return response.status(422).send({
				success: false,
				key: missingFields?.[0],
				message: `Required fields are missing in the payload. ${missingFields.join(
					',',
				)}`,
				data: {},
			});
		}
		const organisationData = {
			name: body?.name,
			mobile: body?.mobile,
			contact_person: body?.contact_person,
			address: body?.address || null,
			email_id: body?.email_id,
		};

		const tableName = 'organisations';
		const newOrganisation = await this.hasuraService.q(
			tableName,
			organisationData,
			['name', 'mobile', 'contact_person', 'address', 'email_id'],
		);

		if (!newOrganisation || !newOrganisation?.organisations.id) {
			throw new Error('Failed to create organisation.');
		}
		const organisation = newOrganisation?.organisations;

		const organisation_id = organisation?.id;

		// Calculate learner_target per camp and round up to nearest whole number
		if (Math.ceil(learner_target / learner_per_camp) !== camp_target) {
			return response.status(422).send({
				success: false,
				message: 'Camp target is wrong',
				data: {},
			});
		}

		// Step 2: Insert data into the 'program_organisation' table
		const programOrganisationTableName = 'program_organisation';
		const program_org = await this.hasuraService.q(
			programOrganisationTableName,
			{
				organisation_id,
				program_id: request.mw_program_id,
				academic_year_id: request.mw_academic_year_id,
				status: 'active',
				...body,
			},
			[
				'organisation_id',
				'program_id',
				'academic_year_id',
				'status',
				'learner_target',
				'doc_per_cohort_id',
				'doc_per_monthly_id',
				'doc_quarterly_id',
				'learner_per_camp',
				'camp_target',
			],
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
		const academic_year_id = req.mw_academic_year_id;
		const program_id = req.mw_program_id;

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
						email_id
						program_organisations(where:{program_id: {_eq: ${program_id}}, academic_year_id: {_eq: ${academic_year_id}}, status: {_eq: "active"}}){
							learner_target
						}
					
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
						email_id
						address
            program_organisations(where:{program_id: {_eq: ${program_id}}, academic_year_id: {_eq: ${academic_year_id}}, status: {_eq: "active"}}){
              program_id
              academic_year_id
              status
							organisation_id
							learner_target
							doc_per_cohort_id
							doc_per_monthly_id
							doc_quarterly_id
							learner_per_camp
							camp_target
							program{
								name
								state{
									state_name
								}
							}
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
					data: organisations?.[0],
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

	public async getOrganisationExists(body: any, req: any, resp: any) {
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

	async addExisting(body: any, request: any, response: any) {
		const {
			organisation_id,
			learner_target,
			doc_per_cohort_id,
			doc_per_monthly_id,
			doc_quarterly_id,
			learner_per_camp,
			camp_target,
		} = body;
		let data = {
			query: `query MyQuery {
				program_organisation_aggregate(where: {academic_year_id: {_eq: ${request.mw_academic_year_id}}, program_id: {_eq: ${request.mw_program_id}}, organisation_id: {_eq: ${organisation_id}}})
					{
						aggregate{
							count
						}
					}
			}`,
		};
		const existing = await this.hasuraServiceFromServices.getData(data);

		const program_organisation =
			existing?.data?.program_organisation_aggregate?.aggregate?.count;

		const missingFields = [
			'organisation_id',
			'learner_target',
			'doc_per_cohort_id',
			'doc_per_monthly_id',
			'doc_quarterly_id',
			'learner_per_camp',
			'camp_target',
		].filter((field) => !body[field] && body[field] != '');

		if (missingFields.length > 0) {
			return response.status(422).send({
				success: false,
				key: missingFields?.[0],
				message: `Required fields are missing in the payload. ${missingFields.join(
					',',
				)}`,
				data: {},
			});
		}
		// Calculate learner_target per camp and round up to nearest whole number
		if (Math.ceil(learner_target / learner_per_camp) !== camp_target) {
			return response.status(422).send({
				success: false,
				message: 'Camp target is wrong',
				data: {},
			});
		}

		if (program_organisation == 0) {
			const programOrganisationTableName = 'program_organisation';
			const program_organisation = await this.hasuraService.q(
				programOrganisationTableName,
				{
					program_id: request.mw_program_id,
					academic_year_id: request.mw_academic_year_id,
					status: 'active',
					...body,
				},
				[
					'organisation_id',
					'program_id',
					'academic_year_id',
					'status',
					'learner_target',
					'doc_per_cohort_id',
					'doc_per_monthly_id',
					'doc_quarterly_id',
					'learner_per_camp',
					'camp_target',
				],
			);

			// Return success response
			response.status(200).json({
				success: true,
				message: 'Existing Organisation created successfully.',
				data: program_organisation,
			});
		} else {
			response.status(422).json({
				success: false,
				key: 'organisation_id',
				message:
					'Organisation ALready Exists for the Program and Academic Year.',
				data: {},
			});
		}
	}
}
