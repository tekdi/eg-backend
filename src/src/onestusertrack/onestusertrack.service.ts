import { Injectable } from '@nestjs/common';
import { CreateOnestusertrackDto } from './dto/create-onestusertrack.dto';
import { UpdateOnestusertrackDto } from './dto/update-onestusertrack.dto';
import { HasuraService } from '../hasura/hasura.service';

import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
@Injectable()
export class OnestusertrackService {
	constructor(
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}

	async create(body: any, request: any, response: any) {
		const { user_id, context, context_item_id, order_id, status, params } =
			body;
		const missingFields = [
			'user_id',
			'context',
			'context_item_id',
			'status',
			'order_id',
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

		if (context == 'jobs' || context == 'scholarship') {
			let checkcontext = {
				query: `query MyQuery {
      onest_users_tracking_aggregate(where: {user_id: {_eq: ${user_id}}, context_item_id: {_eq: "${context_item_id}"}, context: {_eq: "${context}"}}){
        aggregate{
          count
        }
      }
    }`,
			};

			const contextcount = await this.hasuraServiceFromServices.getData(
				checkcontext,
			);
			const count =
				contextcount?.data?.onest_users_tracking_aggregate?.aggregate
					?.count;

			if (count > 0) {
				return response.status(422).send({
					success: false,
					key: 'context',
					message: 'Data Already Present',
					data: {},
				});
			}
		}
		// Convert params object to array of key-value pairs
		// const paramsArray = Object.entries(params || {}).map(
		// 	([key, value]) => ({
		// 		key,
		// 		value,
		// 	}),
		// );
		let onestuserdata = {
			user_id,
			context,
			context_item_id,
			status,
			order_id,
			params,
		};

		const tableName = 'onest_users_tracking';
		const fileds = [
			'user_id',
			'context',
			'context_item_id',
			'status',
			'order_id',
			'params',
		];
		const newDatainsert =
			await this.hasuraServiceFromServices.createWithVariable(
				tableName,
				onestuserdata,
				fileds,
				[...fileds, 'id'],
				[{ key: 'params', type: 'jsonb' }],
			);

		if (!newDatainsert || !newDatainsert?.onest_users_tracking.id) {
			throw new Error('Failed to add data.');
		}
		const newdata = newDatainsert?.onest_users_tracking;

		// Return success response
		response.status(200).json({
			success: true,
			message: 'Onest User tracking data added successfully.',
			data: {
				newdata,
			},
		});
	}

	public async getOnestUserTracking(body: any, req: any, resp: any) {
		let onlyfilter = [
			'id',
			'user_id',
			'context',
			'context_item_id',
			'status',
			'order_id',
			'params',
		];
		body.filter = {
			...(body.filter || {}),
		};

		const result = await this.hasuraServiceFromServices.getAll(
			'onest_users_tracking',
			[...onlyfilter],
			{ ...body, onlyfilter },
		);

		return resp.status(200).send({
			...result,
			success: true,
			message: 'Onest User Tracking data List Found Successfully',
		});
	}
}
