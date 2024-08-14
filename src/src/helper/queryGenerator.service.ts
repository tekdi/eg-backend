import { Injectable } from '@nestjs/common';

@Injectable()
export class QueryGeneratorService {
	isEmptyObject = (obj: any) =>
		obj && obj.constructor.name === 'Object' && Object.keys(obj).length > 0;

	objectConvert = (obj: any, fun: any) => {
		if (this.isEmptyObject(obj)) {
			return Object.entries(obj).map(fun);
		}
		return [];
	};

	getParam = (keys: any) => {
		let str = '';
		keys.forEach((e: any, index: any) => {
			str += `${e}${keys.length > index + 1 ? '\n' : ''}`;
		});
		return str;
	};

	filterObjectByKeyArray = (obj: any, desiredKeys: []) => {
		const filteredObject = desiredKeys.reduce((acc: any, key) => {
			if (key in obj) {
				acc[key] = obj[key];
			}
			return acc;
		}, {});

		return filteredObject;
	};

	// create
	create(tName: string, item: any, onlyFields: any = [], fields: any = []) {
		let tableName = `insert_${tName}_one`;
		const keys = Object.keys(item);
		const getObjStr = (item: any, type: string = '') => {
			let str = 'object: {';
			let strArr = [];
			keys.forEach((e, index) => {
				if (
					e !== 'id' &&
					(onlyFields.length < 1 || onlyFields.includes(e))
				) {
					strArr = [...strArr, `${e}:"${item[e]}"`];
				}
			});
			str += strArr.join();
			str += `}`;
			return str;
		};

		return `mutation MyQuery {
	  ${tableName}(${getObjStr(item)}) {
		${this.getParam(fields && fields.length > 0 ? fields : onlyFields || keys)}
	  }
	}
	`;
	}

	// create
	createWithVariable(
		tName: string,
		item: any,
		onlyFields: any = [],
		fields: any = [],
		variable = [],
	) {
		let resultObject = {};
		let params = '';
		if (Array.isArray(variable) && variable?.length > 0) {
			params = `(${variable
				.map((newD) => `$${newD.key}: ${newD?.type}`)
				.join(', ')})`;

			let vData = {};
			variable.forEach((e) => {
				vData = { ...vData, [e.key]: item?.[e.key] };
			});
			resultObject = { ...resultObject, variables: vData };
		}

		let tableName = `insert_${tName}_one`;
		const keys = Object.keys(item);

		const getObjStr = (item: any, type: string = '') => {
			let str = 'object: {';
			let strArr = [];
			keys.forEach((e, index) => {
				if (
					e !== 'id' &&
					(onlyFields.length < 1 || onlyFields.includes(e))
				) {
					const data = variable.map((e) => e.key).filter((e) => e);
					if (data.includes(e)) {
						strArr = [...strArr, `${e}:$${e}`];
					} else {
						strArr = [...strArr, `${e}:"${item[e]}"`];
					}
				}
			});
			str += strArr.join();
			str += `}`;
			return str;
		};

		resultObject = {
			query: `mutation MyQuery${params} {
	  ${tableName}(${getObjStr(item)}) {
		${this.getParam(fields && fields.length > 0 ? fields : onlyFields || keys)}
	  }
	}
	`,
			...resultObject,
		};

		return resultObject;
	}

	// update
	update(
		id: number,
		tName: string,
		item: any,
		onlyFields: any = [],
		fields: any = [],
		props: any = {},
	) {
		let tableName = `update_${tName}`;
		const keys = Object.keys(item);
		const getObjStr = (item: any, type: string = '') => {
			let str = `where: ${
				props?.where ? props?.where : `{id: {_eq: ${id}}}`
			}, _set: {`;
			let strArr = [];
			keys.forEach((e, index) => {
				if (
					e !== 'id' &&
					(onlyFields.length < 1 || onlyFields.includes(e))
				) {
					strArr = [...strArr, `${e}:"${item[e]}"`];
				}
			});
			str += strArr.join();
			str += `}`;
			return str;
		};

		let coreQuery = `${tableName}(${getObjStr(item)}) {
			affected_rows
			returning {
				${this.getParam(fields && fields.length > 0 ? fields : onlyFields || keys)}
			}
		  }`;
		if (props?.isCore === true) {
			return coreQuery;
		}
		return `mutation MyQuery {
	  		${coreQuery}
		}`;
	}

	updateWithVariable(
		id: number,
		tName: string,
		item: any,
		onlyFields: any = [],
		fields: any = [],
		props: any = {},
	) {
		let tableName = `update_${tName}`;
		const keys = Object.keys(item);
		let resultObject = {};
		let params = '';
		const { variable } = props;

		if (Array.isArray(variable) && variable?.length > 0) {
			params = `(${variable
				.filter((key) => item[key.key])
				.map((newD) => `$${newD.key}: ${newD?.type}`)
				.join(', ')})`;

			let vData = {};
			variable.forEach((e) => {
				if (item?.[e.key]) {
					vData = { ...vData, [e.key]: item?.[e.key] };
				}
			});
			resultObject = { ...resultObject, variables: vData };
		}
		const getObjStr = (item: any, type: string = '') => {
			let str = `where: ${
				props?.where ? props?.where : `{id: {_eq: ${id}}}`
			}, _set: {`;
			let strArr = [];
			keys.forEach((e, index) => {
				if (
					e !== 'id' &&
					(onlyFields.length < 1 || onlyFields.includes(e))
				) {
					const data = variable.map((e) => e.key).filter((e) => e);
					if (data.includes(e)) {
						strArr = [...strArr, `${e}:$${e}`];
					} else {
						strArr = [...strArr, `${e}:"${item[e]}"`];
					}
				}
			});
			str += strArr.join();
			str += `}`;
			return str;
		};

		resultObject = {
			query: `mutation MyQuery${params} {
	  ${tableName}(${getObjStr(item)}) {
		affected_rows
			returning {
		${this.getParam(fields && fields.length > 0 ? fields : onlyFields || keys)}
		}
	  }
	}
	`,
			...resultObject,
		};

		let coreQuery = `${tableName}(${getObjStr(item)}) {
			affected_rows
			returning {
				${this.getParam(fields && fields.length > 0 ? fields : onlyFields || keys)}
			}
		  }`;
		if (props?.isCore === true) {
			return coreQuery;
		}

		resultObject = {
			query: `mutation MyQuery {
				${coreQuery}
		  }`,
			...resultObject,
		};

		return resultObject;
	}

	//mutation
	mutation(
		tName: string,
		item: any,
		onlyFields: any = [],
		update: boolean = false,
		fields: any = [],
	) {
		let tableName = `insert_${tName}_one`;
		if (item?.id && update) {
			tableName = `update_${tName}`;
		}
		const keys = Object.keys(item);
		const getObjStr = (item: any, type: string = '') => {
			let str = 'object: {';
			if (item?.id && update) {
				str = `where: {id: {_eq: ${item?.id}}}, _set: {`;
			}
			let strArr = [];
			keys.forEach((e, index) => {
				if (
					e !== 'id' &&
					(onlyFields.length < 1 || onlyFields.includes(e))
				) {
					if (type === 'obj') {
						if (typeof item[e] !== 'string') {
							strArr = [...strArr, `${e}:${item[e]}`];
						} else {
							strArr = [...strArr, `${e}:"${item[e]}"`];
						}
					} else {
						strArr = [...strArr, `${e}:string`];
					}
				}
			});
			str += strArr.join();
			str += `}`;
			return str;
		};

		let returnFieldsQuery = '';
		if (!(item?.id && update)) {
			if (fields && fields.length > 0) {
				returnFieldsQuery = this.getParam(fields);
			} else if (onlyFields && onlyFields.length > 0) {
				returnFieldsQuery = this.getParam([...onlyFields, 'id']);
			} else {
				returnFieldsQuery = this.getParam(keys);
			}
		} else if (fields.length) {
			returnFieldsQuery = `
				affected_rows
				returning {
					${this.getParam(fields)}
				}
			`;
		} else {
			returnFieldsQuery = 'affected_rows';
		}

		return `mutation MyQuery {
	  ${tableName}(${getObjStr(item, 'obj')}) {
		${returnFieldsQuery}
	  }
	}
	`;
	}

	query(
		tableName: string,
		onlyFields: any = [],
		request: any = { filters: {}, page: '0', limit: '0' },
	) {
		const getObjStr = (request: any, is_aggregate = false) => {
			const { filters, page, limit, order_by, onlyfilter } = request;
			const filter = this.filterObjectByKeyArray(
				filters || {},
				onlyfilter || [],
			);

			let str = '';
			const isLimitExist = limit && limit != '0';
			const isFilterExist = filters && Object.keys(filters).length > 0;
			const isOrderByExist = order_by && Object.keys(order_by).length > 0;
			if (isLimitExist || isFilterExist || isOrderByExist) {
				if (
					isFilterExist ||
					(isLimitExist && !is_aggregate) ||
					isOrderByExist
				) {
					str += '(';
				}
				let paramArr = [];

				if (filter && Object.keys(filter).length > 0) {
					let filterStr = `where: {`;
					let strArr = Object.keys(filter).map((e) => {
						let qData = '';

						if (e === 'core') {
							qData = filter[e];
						} else if (this.isEmptyObject(filter[e])) {
							let data = this.objectConvert(
								filter[e],
								([key, val]) => {
									return `${key}: "${val}"`;
								},
							);
							qData = `${e}:{${data.join(',')}}`;
						} else if (filter && filter[e] != '') {
							qData = `${e}:{_eq:"${filter[e]}"}`;
						}
						return qData;
					});
					filterStr += strArr.join();
					filterStr += `}`;
					paramArr = [...paramArr, filterStr];
				}
				if (limit && !is_aggregate) {
					let offset = 0;
					if (page > 1 && limit) {
						offset = parseInt(limit) * (page - 1);
					}
					paramArr = [
						...paramArr,
						`limit: ${limit}, offset: "${offset}"`,
					];
				}
				if (order_by && Object.keys(order_by).length > 0) {
					let data = this.objectConvert(order_by, ([key, val]) => {
						return `${key}: ${val}`;
					});
					paramArr = [...paramArr, `order_by: {${data.join(',')}}`];
				}
				str += paramArr.join(', ');
				if (
					isFilterExist ||
					(isLimitExist && !is_aggregate) ||
					isOrderByExist
				) {
					str += ')';
				}
			}
			return str;
		};
		const query = `query MyQuery {
	  ${tableName}_aggregate${getObjStr(request, true)} {
		aggregate {
		  count
		}
	  }
	  ${tableName}${getObjStr(request)} {
		${this.getParam(onlyFields)}
	  }
	}
	`;

		return query;
	}

	findOne(id: number, tName: string, onlyFields: any = []) {
		return `query MyQuery {
		${tName}_by_pk(id: ${id}) {
			${this.getParam(onlyFields)}
	  }
	}
	`;
	}

	queryMulti(
		tableName: string,
		items: any,
		onlyFields: any,
		fields: any = [],
		props: any = {},
	) {
		let returnkeys = [];
		const getObjStr = (item: Object, type: string = '') => {
			let str = '[';
			items.forEach((item, pindex) => {
				const keys = Object.keys(item);
				str += '{';
				keys.forEach((e, index) => {
					if (!returnkeys.includes(e)) {
						returnkeys = [...returnkeys, e];
					}

					if (onlyFields.length < 1 || onlyFields.includes(e)) {
						if (type === 'obj') {
							str += `${e}:${item[e]}${
								keys.length > index + 1 ? ',' : ''
							}`;
						} else {
							str += `$${e}:string${
								keys.length > index + 1 ? ',' : ''
							}`;
						}
					}
				});
				str += `}${items.length > pindex + 1 ? ',' : ''}`;
			});

			return (str += ']');
		};

		let coreQuery = `${tableName}(objects: ${getObjStr(items, 'obj')}) {
			returning {
				${this.getParam(fields || (onlyFields ? [...onlyFields, 'id'] : returnkeys))}
			}
		}`;

		if (props?.isCore === true) {
			return coreQuery;
		}

		return `mutation MyQuery {

	  		${coreQuery}
		}`;
	}

	deleteQuery(
		tName: string,
		item: any,
		onlyFields: any = [],
		returnFields: any = null,
	) {
		let tableName = `delete_${tName}`;
		const keys = Object.keys(item);

		const getObjStr = (item: any, type: string = '') => {
			let str = ``;
			let strArr = [];
			keys.forEach((e) => {
				if (onlyFields.length < 1 || onlyFields.includes(e)) {
					if (type === 'obj') {
						strArr = [...strArr, `${e}:{_eq:"${item[e]}"}`];
					}
				}
			});
			str += strArr.join();
			return str;
		};

		let returnFieldsQuery = ``;
		if (
			returnFields &&
			Array.isArray(returnFields) &&
			returnFields.length > 0
		) {
			returnFieldsQuery = `returning {
		${returnFields.join(',')}
	  }`;
		}

		return `mutation DeleteQuery {
	  ${tableName}(where: {${getObjStr(item, 'obj')}}) {
		 affected_rows
		 ${returnFieldsQuery}
	  }
	}
	`;
	}
}
