import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { UserService } from 'src/user/user.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class ObservationsService {
	public tableName = 'observations';
	public fillable = [
		'name',
		'created_by',
		'created_at',
		'updated_at',
		'updated_by',
	];
	public returnFields = [
		'id',
		'name',
		'created_by',
		'created_at',
		'updated_at',
		'updated_by',
	];

	public FieldTableName = 'fields';
	public FieldFillable = [
		'name',
		'created_by',
		'created_at',
		'updated_at',
		'updated_by',
		'data_type',
		'description',
		'extra_all_info',
		'title',
		'enum',
	];
	public FieldReturnFields = [
		'id',
		'name',
		'created_by',
		'created_at',
		'updated_at',
		'updated_by',
		'data_type',
		'description',
		'extra_all_info',
		'title',
		'enum',
	];
	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private userService: UserService,
	) {}

	async createObservation(body: any, resp: any, request: any) {
		let user_id = request?.mw_userid;
		let response;
		let data;
		body.created_by = user_id;
		body.updated_by = user_id;
		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let query = '';
		Object.keys(body).forEach((e) => {
			if (body[e] && body[e] != '') {
				if (e === 'render') {
					query += `${e}: ${body[e]}, `;
				} else if (Array.isArray(body[e])) {
					query += `${e}: "${JSON.stringify(body[e])}", `;
				} else {
					query += `${e}: "${body[e]}", `;
				}
			}
		});

		data = {
			query: `mutation CreateObservations {
			insert_observations_one(object: {${query}}) {
			  id
			  name
			}
		  }
		  `,
			variables: {},
		};

		response = await this.hasuraServiceFromServices.queryWithVariable(data);

		let result = response?.data?.data?.insert_observations_one;

		if (result) {
			return resp.status(200).json({
				success: true,
				message: 'Observation created successfully!',
				data: result,
			});
		} else {
			return resp.status(500).json({
				success: false,
				message: 'Unable to create obsevation !',
				data: {},
			});
		}
	}

	async createFields(body: any, resp: any, request: any) {
		let data;
		let user_id = request?.mw_userid;

		body.created_by = user_id;
		body.updated_by = user_id;

		body.enum = body?.enum
			? JSON.stringify(body?.enum).replace(/"/g, '\\"')
			: '';

		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let query = '';
		Object.keys(body).forEach((e) => {
			if (body[e] && body[e] != '') {
				if (e === 'render') {
					query += `${e}: ${body[e]}, `;
				} else if (Array.isArray(body[e])) {
					query += `${e}: "${JSON.stringify(body[e])}", `;
				} else {
					query += `${e}: "${body[e]}", `;
				}
			}
		});

		data = {
			query: `mutation CreateFields {
			insert_fields_one(object: {${query}}) {
			  id
			  name
			  title
			  enum


			}
		  }
		  `,
			variables: {},
		};

		let response = await this.hasuraServiceFromServices.queryWithVariable(
			data,
		);

		let result = response?.data?.data?.insert_fields_one;
		if (result) {
			return resp.status(200).json({
				success: true,
				message: 'Field created successfully!',
				data: result,
			});
		} else {
			return resp.status(500).json({
				success: false,
				message: 'Unable to create Field !',
				data: {},
			});
		}
	}

	async updateObservation(body: any, resp: any, request: any, id: any) {
		let user_id = request?.mw_userid;

		body.updated_by = user_id;
		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let result = await this.hasuraService.q(
			this.tableName,
			{
				...body,
				id: id,
			},
			this.fillable,
			true,
			this.returnFields,
		);

		if (result) {
			return resp.status(200).json({
				success: true,
				message: 'Observation updated successfully!',
				data: result,
			});
		} else {
			return resp.status(500).json({
				success: false,
				message: 'Unable to update obsevation !',
				data: {},
			});
		}
	}

	async updateFields(body: any, resp: any, request: any, id: any) {
		let user_id = request?.mw_userid;

		body.updated_by = user_id;
		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		body.enum = body?.enum
			? JSON.stringify(body?.enum).replace(/"/g, '\\"')
			: '';

		let result = await this.hasuraService.q(
			this.FieldTableName,
			{
				...body,
				id: id,
			},
			this.FieldFillable,
			true,
			this.FieldReturnFields,
		);

		if (result) {
			return resp.status(200).json({
				success: true,
				message: 'Field updated successfully!',
				data: result,
			});
		} else {
			return resp.status(500).json({
				success: false,
				message: 'Unable to update Field !',
				data: {},
			});
		}
	}

	async getObservationList(body: any, resp: any, request: any) {
		let response;
		let newQdata;
		let query;
		let obj_filters;
		let data;
		let user_id = request?.mw_userid;

		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		if (body?.filters) {
			let filters = new Object(body);

			Object.keys(body.filters).forEach((item) => {
				Object.keys(body.filters[item]).forEach((e) => {
					if (!e.startsWith('_')) {
						filters[item][`_${e}`] = filters[item][e];
						delete filters[item][e];
					}
				});
			});

			data = {
				query: `query Searchobservations($filters:observations_bool_exp) {
					observations(where:$filters) {
						created_at
						created_by
						id
						name
						updated_at
						updated_by
					  }
					}`,
				variables: {
					filters: body.filters,
				},
			};
		} else {
			data = {
				query: `query MyQuery {
					observations{
					  id
					  name
					  created_at
					  created_by
					  updated_by
					}
				  }
				  
				  `,
			};
		}

		response = await this.hasuraServiceFromServices.queryWithVariable(data);

		newQdata = response?.data?.data?.observations;

		if (newQdata.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	async getFieldsList(body: any, resp: any, request: any) {
		let response;
		let newQdata;
		let query;
		let user_id = request?.mw_userid;
		let data;

		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		if (body?.filters) {
			let filters = new Object(body);

			Object.keys(body.filters).forEach((item) => {
				Object.keys(body.filters[item]).forEach((e) => {
					if (!e.startsWith('_')) {
						filters[item][`_${e}`] = filters[item][e];
						delete filters[item][e];
					}
				});
			});

			data = {
				query: `query Searchfields($filters:fields_bool_exp) {
					fields(where:$filters) {
						created_at
						created_by
						id
						name
						updated_at
						updated_by
						data_type
						description
						extra_all_info
						title
						enum
					  }
					}`,
				variables: {
					filters: body.filters,
				},
			};
		} else {
			data = {
				query: `query MyQuery {
					fields {
					  created_at
					  created_by
					  id
					  name
					  updated_at
					  updated_by
					  data_type
					  description
					  extra_all_info
					  title
					  enum
					}
				  }
				  
				  
				  `,
			};
		}

		response = await this.hasuraServiceFromServices.queryWithVariable(data);

		newQdata = response?.data?.data?.fields;

		if (newQdata.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	async getObservationById(resp: any, request: any, id: any) {
		let user_id = request?.mw_userid;

		if (!id) {
			return resp.status(422).json({
				message: 'Please provide a valid get id',
				data: null,
			});
		}

		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let query = `query MyQuery {
            observations_by_pk(id:${id}) {
              id
              name
              created_by
              created_at
              updated_at
              updated_by
            }
          }
          
          
          `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.observations_by_pk;

		if (newQdata) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	async getFieldById(resp: any, request: any, id: any) {
		let user_id = request?.mw_userid;

		if (!id) {
			return resp.status(422).json({
				message: 'Please provide a valid get id',
				data: null,
			});
		}

		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let query = `query MyQuery {
            fields_by_pk(id:${id}) {
              created_at
              created_by
              id
              name
              updated_at
              updated_by
              data_type
              description
              extra_all_info
            }
          }
          
          
          
          `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.fields_by_pk;

		if (newQdata) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	async deleteObservationById(resp: any, request: any, id: any) {
		let user_id = request?.mw_userid;

		if (!id) {
			return resp.status(422).json({
				message: 'Please provide a valid get id',
				data: null,
			});
		}

		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let query = `mutation MyMutation {
            delete_observations_by_pk(id:${id}) {
              id
              created_by
              name
              updated_at
              updated_by
              created_at
            }
          }
                      
          `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.delete_observations_by_pk;

		if (newQdata) {
			return resp.status(200).json({
				success: true,
				message: 'Data deleted successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	async deleteFieldById(resp: any, request: any, id: any) {
		let user_id = request?.mw_userid;

		if (!id) {
			return resp.status(422).json({
				message: 'Please provide a valid get id',
				data: null,
			});
		}

		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let query = `mutation MyMutation {
            delete_fields_by_pk(id:${id}) {
              created_at
              created_by
              id
              name
              updated_at
              updated_by
              data_type
              description
              extra_all_info
            }
          }
                      
          `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.delete_fields_by_pk;

		if (newQdata) {
			return resp.status(200).json({
				success: true,
				message: 'Data deleted successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}
}
