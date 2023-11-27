import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { KitMaterialsCoreService } from '../kit-materials/kit-materials.core.service';
const moment = require('moment');

@Injectable()
export class KitMaterialsService {
	public table = 'kit_materials_checklist';

	public fillable = [
		'user_id',
		'camp_id',
		'list_of_materials',
		'date',
		'created_at',
		'updated_at',
	];

	public returnFields = [
		'id',
		'user_id',
		'camp_id',
		'list_of_materials',
		'date',
		'created_at',
		'updated_at',
	];

	constructor(
		private readonly hasuraService: HasuraService,
		private KitMaterialsCoreService: KitMaterialsCoreService,
		private hasuraServiceFromServices: HasuraServiceFromServices, 
	) {}

	public async create(body: any, request: any, resp: any) {
		let user_id = request.mw_userid;
		let camp_id = body.camp_id;
		let date = body.date;
		let list_of_materials = body.list_of_materials;
		let response;

		let query = `query MyQuery {
			camps(where:{id:{_eq:${camp_id}},kit_received:{_eq:"yes"}}) {
				id
				group_id
				kit_received
			}
		}`;

		const result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let camp = result?.data?.camps?.[0]?.group_id;

		if (!camp) {
			return resp.status(400).json({
				success: false,
				message: 'Kit recived not filled!',
				data: {},
			});
		} else {
			let query = `query MyQuery {
				kit_materials_checklist(where: {camp_id: {_eq: ${camp_id}}, 
					date: {_eq: "${date}"
							}}) {
					id
					date
					camp_id
					list_of_materials
					user_id
				}}`;
			const result = await this.hasuraServiceFromServices.getData({
				query,
			});

			if (
				result?.data?.date &&
				moment().format('YYYY-MM') ===
					moment(result?.data?.date).format('YYYY-MM')
			) {
				const data = {
					query: `mutation MyMutation($list_of_materials: jsonb) {
						update_kit_materials_checklist(_set:{list_of_materials:$list_of_materials}, where: {camp_id: {_eq: ${camp_id}}, date: {_eq: "${date}"}, user_id: {_eq: ${user_id}}}) {
							affected_rows
							returning {
								camp_id
								date
								id
								list_of_materials
								user_id
							}
						}
					}`,
					variables: {
						list_of_materials,
					},
				};
				
				response = await this.hasuraServiceFromServices.getData(data);
				
				return resp.status(200).json({
					success: true,
					message: 'Kit Updated successfully!',
					data: response?.data,
				});
			} else {
				const data = {
					query: `mutation MyMutation($list_of_materials: jsonb) {
					insert_kit_materials_checklist(objects: {
						camp_id: ${camp_id},
						date: "${date}",
						list_of_materials:$list_of_materials,
						user_id: ${user_id}
					}) {
						returning {
							camp_id
							id
							date
							created_at
							list_of_materials
							user_id
							updated_at
						}
					}
				}`,
					variables: {
						list_of_materials,
					},
				};

				response = await this.hasuraServiceFromServices.getData(data);
			}

			return resp.status(200).json({
				success: true,
				message: 'Kit added successfully!',
				data: response,
			});
		}
	}

	public async List(body: any, req: any, resp: any) {
		try {
			
			let kit_data = await this.KitMaterialsCoreService.list(
				body,
			);

			if (kit_data) {
				return resp.status(200).json({
					success: true,
					message: 'Data found successfully!',
					data: kit_data,
					
				});
			} else {
				return resp.status(400).json({
					success: false,
					message: 'Data Not Found',
					data: {},
				});
			}
		} catch (error) {
			return resp.status(500).json({
				success: false,
				message: 'Internal server error',
				data: {},
			});
		}
	}
}
