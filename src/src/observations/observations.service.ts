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

		//check for duplicate name validation

		let vquery = `query MyQuery {
			observations_aggregate(where: {name: {_eq:"${body?.name}"}}) {
			  aggregate {
				count
			  }
			}
		  }`;

		const vresponse = await this.hasuraServiceFromServices.getData({
			query: vquery,
		});
		const newQdata =
			vresponse?.data?.observations_aggregate?.aggregate?.count;

		if (newQdata > 0) {
			return resp.status(422).json({
				success: false,
				message: 'Duplicate name encountered !',
				data: {},
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

		let vquery = `query MyQuery {
			fields_aggregate(where: {title: {_eq:"${body?.title}"}}) {
			  aggregate {
				count
			  }
			}
		  }`;

		const vresponse = await this.hasuraServiceFromServices.getData({
			query: vquery,
		});
		const newQdata = vresponse?.data?.fields_aggregate?.aggregate?.count;

		if (newQdata > 0) {
			return resp.status(422).json({
				success: false,
				message: 'Duplicate title encountered !',
				data: {},
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

	async createObservationFields(body: any, resp: any, request: any) {
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

		let vquery = `query MyQuery {
			observation_fields_aggregate(where: {observation_id: {_eq:${body?.observation_id}}, field_id: {_eq:${body?.field_id}}, context_id: {_eq:${body?.context_id}}}) {
			  aggregate {
				count
			  }
			}
		  }`;

		const vresponse = await this.hasuraServiceFromServices.getData({
			query: vquery,
		});
		const newQdata =
			vresponse?.data?.observation_fields_aggregate?.aggregate?.count;

		if (newQdata > 0) {
			return resp.status(422).json({
				success: false,
				message: 'Duplicate observation field encountered !',
				data: {},
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
			query: `mutation CreateObservationFields {
			insert_observation_fields_one(object: {${query}}) {
			  id
			  observation_id
			  context
			  context_id
			  field_id
			}
		  }
		  `,
			variables: {},
		};

		response = await this.hasuraServiceFromServices.queryWithVariable(data);

		let result = response?.data?.data?.insert_observation_fields_one;

		if (result) {
			return resp.status(200).json({
				success: true,
				message: 'Observation Field created successfully!',
				data: result,
			});
		} else {
			return resp.status(500).json({
				success: false,
				message: 'Unable to create obsevation Field!',
				data: {},
			});
		}
	}

	async createFieldResponses(body: any, resp: any, request: any) {
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

		let vquery = `query MyQuery {
			field_responses_aggregate(where: {context_id: {_eq:${body?.context_id}},observation_fields_id:{_eq:${body?.observation_fields_id}}, field_id: {_eq:${body?.field_id}}, observation_id: {_eq:${body?.observation_id}}, response_value: {_eq:"${body?.response_value}"}}) {
			  aggregate {
				count
			  }
			}
		  }`;

		const vresponse = await this.hasuraServiceFromServices.getData({
			query: vquery,
		});
		const newQdata =
			vresponse?.data?.field_responses_aggregate?.aggregate?.count;

		if (newQdata > 0) {
			return resp.status(422).json({
				success: false,
				message: 'Duplicate field responses encountered !',
				data: {},
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
			query: `mutation CreateFieldsResponses {
			insert_field_responses_one(object: {${query}}) {
			  id
			  observation_id
			  context
			  context_id
			  response_value
			}
		  }
		  `,
			variables: {},
		};

		response = await this.hasuraServiceFromServices.queryWithVariable(data);

		let result = response?.data?.data?.insert_field_responses_one;

		if (result) {
			return resp.status(200).json({
				success: true,
				message: 'Observation Field created successfully!',
				data: result,
			});
		} else {
			return resp.status(500).json({
				success: false,
				message: 'Unable to create obsevation Field!',
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

		let vquery = `query MyQuery {
			observations_aggregate(where: {name: {_eq:"${body?.name}"}, id: {_neq:${id}}}) {
			  aggregate {
				count
			  }
			}
		  }`;

		const vresponse = await this.hasuraServiceFromServices.getData({
			query: vquery,
		});
		const newQdata =
			vresponse?.data?.observations_aggregate?.aggregate?.count;

		if (newQdata > 0) {
			return resp.status(422).json({
				success: false,
				message: 'Duplicate name encountered !',
				data: {},
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

		let data = {
			query: `
      mutation UpdateObservations($id:Int!) {
        update_observations_by_pk(
            pk_columns: {
              id: $id
            },
            _set: {
                ${query}
            }
        ) {
          id
        }
    }
    `,
			variables: {
				id: id,
			},
		};

		let response = await this.hasuraServiceFromServices.queryWithVariable(
			data,
		);

		let result = response?.data?.data?.update_observations_by_pk;

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

		let vquery = `query MyQuery {
				fields_aggregate(where: {title: {_eq:"${body?.title}"}, id: {_neq:${id}}}) {
				  aggregate {
					count
				  }
				}
			  }`;

		const vresponse = await this.hasuraServiceFromServices.getData({
			query: vquery,
		});
		const newQdata = vresponse?.data?.fields_aggregate?.aggregate?.count;

		if (newQdata > 0) {
			return resp.status(422).json({
				success: false,
				message: 'Duplicate title encountered !',
				data: {},
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

		var data = {
			query: `
		  mutation UpdateFields($id:Int!) {
			update_fields_by_pk(
				pk_columns: {
				  id: $id
				},
				_set: {
					${query}
				}
			) {
			  id
			}
		}
		`,
			variables: {
				id: id,
			},
		};

		let response = await this.hasuraServiceFromServices.queryWithVariable(
			data,
		);

		let result = response?.data?.data?.update_fields_by_pk;

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

	async updateObservationField(body: any, resp: any, request: any, id: any) {
		let user_id = request?.mw_userid;

		body.updated_by = user_id;
		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let vquery = `query MyQuery {
			observation_fields_aggregate(where: {observation_id: {_eq:${body?.observation_id}}, field_id: {_eq:${body?.field_id}}, context_id: {_eq:${body?.context_id}}, id: {_neq:${id}}}) {
			  aggregate {
				count
			  }
			}
		  }`;

		const vresponse = await this.hasuraServiceFromServices.getData({
			query: vquery,
		});
		const newQdata =
			vresponse?.data?.observation_fields_aggregate?.aggregate?.count;

		if (newQdata > 0) {
			return resp.status(422).json({
				success: false,
				message: 'Duplicate observation field encountered !',
				data: {},
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

		var data = {
			query: `
      mutation UpdateObservationFields($id:Int!) {
        update_observation_fields_by_pk(
            pk_columns: {
              id: $id
            },
            _set: {
                ${query}
            }
        ) {
          id
        }
    }
    `,
			variables: {
				id: id,
			},
		};

		let response = await this.hasuraServiceFromServices.queryWithVariable(
			data,
		);

		let result = response?.data?.data?.update_observation_fields_by_pk;

		if (result) {
			return resp.status(200).json({
				success: true,
				message: 'Observation-Field updated successfully!',
				data: result,
			});
		} else {
			return resp.status(500).json({
				success: false,
				message: 'Unable to update obsevation-field !',
				data: {},
			});
		}
	}

	async updateFieldResponses(body: any, resp: any, request: any, id: any) {
		let user_id = request?.mw_userid;

		body.updated_by = user_id;
		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		let vquery = `query MyQuery {
			field_responses_aggregate(where: {context_id: {_eq:${body?.context_id}},observation_fields_id:{_eq:${body?.observation_fields_id}}, field_id: {_eq:${body?.field_id}}, observation_id: {_eq:${body?.observation_id}}, response_value: {_eq:"${body?.response_value}"}, id: {_neq:${id}}}) {
			  aggregate {
				count
			  }
			}
		  }`;

		const vresponse = await this.hasuraServiceFromServices.getData({
			query: vquery,
		});
		const newQdata =
			vresponse?.data?.field_responses_aggregate?.aggregate?.count;

		if (newQdata > 0) {
			return resp.status(422).json({
				success: false,
				message: 'Duplicate field responses encountered !',
				data: {},
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

		var data = {
			query: `
      mutation UpdateFieldResponses($id:Int!) {
        update_field_responses_by_pk(
            pk_columns: {
              id: $id
            },
            _set: {
                ${query}
            }
        ) {
          id
        }
    }
    `,
			variables: {
				id: id,
			},
		};

		let response = await this.hasuraServiceFromServices.queryWithVariable(
			data,
		);

		let result = response?.data?.data?.update_field_responses_by_pk;

		if (result) {
			return resp.status(200).json({
				success: true,
				message: 'Field Responses updated successfully!',
				data: result,
			});
		} else {
			return resp.status(500).json({
				success: false,
				message: 'Unable to update field Responses !',
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
			const traverseFilters = (filters) => {
				Object.keys(filters).forEach((key) => {
					if (typeof filters[key] === 'object') {
						traverseFilters(filters[key]);
					} else {
						if (!key.startsWith('_')) {
							filters[`_${key}`] = filters[key];
							delete filters[key];
						}
					}
				});
			};

			traverseFilters(body?.filters);

			data = {
				query: `query Searchobservations($filters:observations_bool_exp) {
					observations(where:$filters) {
						created_at
						created_by
						id
						name
						title
						observation_fields{
							id
							observation_id
							field_id
							context
							context_id
							fields_sequence
							fields{
							  id
							  data_type
							  description
							  title
							  enum
							}
						  }
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
					  title
					  observation_fields{
						id
						observation_id
						field_id
						context
						context_id
						fields_sequence
						fields{
						  id
						  data_type
						  description
						  title
						  enum
						}
					  }
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

	async getObservationByType(body: any, resp: any, request: any, type: any) {
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
			const traverseFilters = (filters) => {
				Object.keys(filters).forEach((key) => {
					if (typeof filters[key] === 'object') {
						traverseFilters(filters[key]);
					} else {
						if (!key.startsWith('_')) {
							filters[`_${key}`] = filters[key];
							delete filters[key];
						}
					}
				});
			};

			traverseFilters(body?.filters);

			if (type == 'forms') {
				data = {
					query: `query Searchobservations($filters:observations_bool_exp) {
					observations(where:$filters) {
						created_at
						created_by
						id
						name
						title
						observation_fields{
							id
							observation_id
							field_id
							context
							context_id
							fields_sequence
							fields{
							  id
							  data_type
							  description
							  title
							  enum
							}
						  }
						updated_at
						updated_by
					  }
					}`,
					variables: {
						filters: body.filters,
					},
				};
			} else if (type == 'submissons') {
				data = {
					query: `query SearchObservations($observations: observations_bool_exp, $observation_fields: observation_fields_bool_exp,$field_responses: field_responses_bool_exp) {
						observations(where: $observations) {
							created_at
							created_by
							id
							name
							title
							observation_fields(where: $observation_fields) {
								id
								observation_id
								field_id
								context
								context_id
								fields_sequence
								fields {
									id
									data_type
									description
									title
									enum
								}
								field_responses(where: $field_responses) {
									id
									context
									context_id
									observation_fields_id
									response_value
								}
							}
							updated_at
							updated_by
						}
					}`,
					variables: {
						observations: body.filters?.observations,
						observation_fields: body.filters?.observation_fields,
						field_responses: body.filters?.field_responses,
					},
				};
			}

			console.log('query-->>', JSON.stringify(data));
		}

		response = await this.hasuraServiceFromServices.queryWithVariable(data);

		newQdata = response?.data?.data?.observations;

		if (newQdata?.length > 0) {
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

	async getObservationFieldList(body: any, resp: any, request: any) {
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
				query: `query Searchobservation_fields($filters:observation_fields_bool_exp) {
					observation_fields(where:$filters) {
						created_at
						created_by
						id
						observation_id
						observations {
							id
							name
						  }
						  fields {
							id
							name
							description
							data_type
							extra_all_info
						  }
						context
						context_id
						fields_sequence
						field_id
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
					observation_fields {
					  created_at
					  created_by
					  id
					  observation_id
					  observations{
						id
						name
					  }
					  fields{
						id
						name
						description
						data_type
						extra_all_info
					  }
					  context
					  context_id
					  fields_sequence
					  field_id
					  updated_at
					  updated_by
					}
				  }
				  
				  
				  `,
			};
		}

		response = await this.hasuraServiceFromServices.queryWithVariable(data);

		newQdata = response?.data?.data?.observation_fields;

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

	async getFieldResponsesList(body: any, resp: any, request: any) {
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
				query: `query Searchfield_responses($filters:field_responses_bool_exp) {
					field_responses(where:$filters) {
						created_at
						created_by
						id
						observation_id
						observation_fields_id
						observation_fields{
							observations{
							  id
							  name
							}
							fields{
							  id
							  data_type
							  description
							  title
							  
							}
						  }
						context
						context_id
						response_value
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
					field_responses{
						created_at
						created_by
						id
						observation_id
						observation_fields_id
						observation_fields{
							observations{
							  id
							  name
							}
							fields{
							  id
							  data_type
							  description
							  title
							  
							}
						  }
						context
						context_id
						response_value
						updated_at
						updated_by
					}
				  }
				  
				  `,
			};
		}

		response = await this.hasuraServiceFromServices.queryWithVariable(data);

		newQdata = response?.data?.data?.field_responses;

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
			  title
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

	async getObservationFieldById(resp: any, request: any, id: any) {
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
            observation_fields_by_pk(id:${id}) {
				created_at
				created_by
				id
				observation_id
				observations {
					id
					name
				  }
				  fields {
					id
					name
					description
					data_type
					extra_all_info
				  }
				context
				context_id
				fields_sequence
				field_id
				updated_at
				updated_by
            }
          }
          
          
          `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.observation_fields_by_pk;

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

	async getFieldResponsesById(resp: any, request: any, id: any) {
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
            field_responses_by_pk(id:${id}) {
				created_at
				created_by
				id
				observation_id
				observation_fields_id
				observation_fields {
				  observations {
					id
					name
				  }
				  fields {
					id
					data_type
					description
					title
				  }
				}
				context
				context_id
				response_value
				updated_at
				updated_by
            }
          }
          
          
          `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.field_responses_by_pk;

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

	async deleteObservationFieldById(resp: any, request: any, id: any) {
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
            delete_observation_fields_by_pk(id:${id}) {
				created_at
				created_by
				id
				observation_id
				context
				context_id
				field_id
				updated_at
				updated_by
            }
          }
                      
          `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.delete_observation_fields_by_pk;

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

	async deleteFieldResponsesById(resp: any, request: any, id: any) {
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
            delete_fields_responses_by_pk(id:${id}) {
				created_at
				created_by
				id
				observation_id
				context
				context_id
				response_value
				updated_at
				updated_by
            }
          }
                      
          `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.delete_fields_responses_by_pk;

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

	async createFieldResponsesMany(bodyArray: any, resp: any, request: any) {
		let user_id = request?.mw_userid;
		let response;
		let data;
		let result;
		if (!user_id) {
			return resp.status(422).json({
				message: 'Invalid User Entity',
				data: null,
			});
		}

		for (let body of bodyArray) {
			const {
				observation_id,
				context,
				context_id,
				field_id,
				observation_fields_id,
				...rest
			} = body; // Extract fields for querying
			body.created_by = user_id;
			body.updated_by = user_id;

			data = {
				query: ` query GetFieldResponse {
					field_responses(
					  where: { observation_id: { _eq: ${observation_id} }, context: { _eq: ${context} }, context_id: { _eq: ${context_id} },field_id:{_eq:${field_id}},observation_fields_id:{_eq:${observation_fields_id}} }
					) {
					  id
					}
				  }
				`,
			};

			const existingData =
				await this.hasuraServiceFromServices.queryWithVariable(data);
			const action =
				existingData?.data?.data?.field_responses?.length > 0
					? 'update'
					: 'insert';
			let query = '';
			Object.keys(body).forEach((e) => {
				if (body[e]) {
					if (Array.isArray(body[e])) {
						query += `${e}: "${JSON.stringify(body[e])}", `;
					} else {
						query += `${e}: "${body[e]}", `;
					}
				} else {
					query += `${e}: "", `;
				}
			});

			if (action == 'update') {
				const id = existingData?.data?.data?.field_responses?.[0]?.id;

				data = {
					query: ` mutation UpdateObservations($id:Int!) {
								update_field_responses_by_pk(
									pk_columns: {
									id: $id
									},
									_set: {
										${query}
									}
								) {
								id
								}
							}
   							 `,
					variables: {
						id: id,
					},
				};

				response =
					await this.hasuraServiceFromServices.queryWithVariable(
						data,
					);

				result = response?.data?.data?.update_field_responses_by_pk;
			} else {
				data = {
					query: `mutation CreateFieldsResponses {
					insert_field_responses_one(object: {${query}}) {
					  id
					  observation_id
					  context
					  context_id
					  response_value
					}
				  }
				  `,
					variables: {},
				};

				response =
					await this.hasuraServiceFromServices.queryWithVariable(
						data,
					);

				result = response?.data?.data?.insert_field_responses_one;
			}

			console.log('result-->>', result);
			if (!result) {
				return resp.status(500).json({
					success: false,
					message: 'Unable to create observation Field!',
					data: {},
				});
			}
		}

		return resp.status(200).json({
			success: true,
			message: 'Observation Field(s) created successfully!',
			data: result,
		});
	}

	async getObservationReport(body: any, resp: any, req: any) {
		let sql;
		let dataWithStatus;
		let observationFieldsResultCount;

		//get observation data from filters

		let observation_body = body?.filters?.observations;
		let observation_fields_body = body?.filters?.observation_fields;

		sql = `select * from observations where name = '${observation_body?.name}'`;

		const observationData = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		).result;

		let observationResult =
			this.hasuraServiceFromServices.getFormattedData(observationData);

		let observation_id = observationResult?.[0]?.id;

		//get observation_fields_data;

		sql = `select * from observation_fields where observation_id='${observation_id}' and context = '${observation_fields_body?.context}' and context_id = '${observation_fields_body?.context_id}'`;
		const observationFieldsData = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		)?.result;

		if (observationFieldsData == undefined) {
			return resp.status(422).json({
				message: 'Data Not Found',
				data: [],
			});
		}

		let observationFieldsResult =
			this.hasuraServiceFromServices.getFormattedData(
				observationFieldsData,
			);

		let observationFieldIds = '';

		observationFieldsResult.forEach((item) => {
			observationFieldIds += `'${item.id}',`;
		});

		observationFieldIds = observationFieldIds.slice(0, -1); // Remove the trailing comma

		//get count of observation_fields
		sql = `SELECT COUNT(*) FROM observation_fields WHERE observation_id='${observation_id}' AND context = '${observation_fields_body?.context}' and context_id = '${observation_fields_body?.context_id}'
		`;

		const observationFieldsDataCount = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		)?.result;

		if (observationFieldsDataCount == undefined) {
			return resp.status(422).json({
				message: 'Data Not Found',
				data: [],
			});
		}

		observationFieldsResultCount =
			this.hasuraServiceFromServices.getFormattedData(
				observationFieldsDataCount,
			);

		//get data for fields_response

		let fields_response_body = body?.filters?.field_responses;
		let fields_response_context = fields_response_body?.context;
		let field_responses_context_id = fields_response_body?.context_id;

		sql = `SELECT
		COALESCE(COUNT(fr.observation_id), 0) AS count,
		all_combinations.observation_id,
		all_combinations.context,
		all_combinations.context_id
	FROM
		(
			
			SELECT DISTINCT
				observation_id,
				'${fields_response_context}' AS context,
				unnest(ARRAY[${field_responses_context_id}]) AS context_id
			FROM
				field_responses
			WHERE
				observation_id = ${observation_id}
				AND observation_fields_id IN (${observationFieldIds})
		) AS all_combinations
	LEFT JOIN
		field_responses AS fr
	ON
		all_combinations.observation_id = fr.observation_id
		AND all_combinations.context = fr.context
		AND all_combinations.context_id = fr.context_id
	GROUP BY
		all_combinations.observation_id,
		all_combinations.context,
		all_combinations.context_id;
	`;

		const fieldResponsesData = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		)?.result;

		if (fieldResponsesData == undefined) {
			return resp.status(422).json({
				message: 'Data Not Found',
				data: [],
			});
		}
		let fieldResponsesResult =
			this.hasuraServiceFromServices.getFormattedData(fieldResponsesData);

		if (fieldResponsesResult.length > 0) {
			dataWithStatus = this.addStatus(
				fieldResponsesResult,
				observationFieldsResultCount?.[0]?.count,
			);
			return resp.status(200).json({
				message: 'Data retrieved',
				data: dataWithStatus,
			});
		} else {
			//no data fouud
			let fieldResponsesData = [
				['count', 'observation_id', 'context', 'context_id'],
			];
			field_responses_context_id.forEach((item) => {
				fieldResponsesData.push([
					'0',
					`${observation_id}`,
					`${fields_response_context}`,
					`${item}`,
				]);
			});

			let fieldResponsesResult =
				this.hasuraServiceFromServices.getFormattedData(
					fieldResponsesData,
				);

			if (fieldResponsesResult.length > 0) {
				dataWithStatus = this.addStatus(
					fieldResponsesResult,
					observationFieldsResultCount?.[0]?.count,
				);
				return resp.status(200).json({
					message: 'Data retrieved',
					data: dataWithStatus,
				});
			}

			return resp.status(200).json({
				message: 'Data retrieved',
				data: dataWithStatus,
			});
		}
	}

	addStatus(data, observationFieldsResultCount) {
		for (const item of data) {
			const count = parseInt(item.count);
			if (count == observationFieldsResultCount) {
				item.status = 'completed';
			} else if (count == 0) {
				item.status = 'not_started';
			} else {
				item.status = 'incomplete';
			}
		}
		return data;
	}
}
