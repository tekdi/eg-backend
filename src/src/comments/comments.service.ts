import { Injectable } from '@nestjs/common';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class CommentsService {
	constructor(
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}
	returnFields = [
		'id',
		'parent_id',
		'user_id',
		'comment',
		'context',
		'context_id',
		'created_datetime',
		'updated_datetime',
		'created_by',
		'updated_by',
		'status',
	];

	async create(request: any, body: any, context, context_id, response) {
		const user_Id = request.mw_userid;
		const tableName = 'comments';
		const result = await this.hasuraService.create(
			tableName,
			{
				...body,
				user_id: user_Id,
				created_by: user_Id,
				updated_by: user_Id,
				context: context,
				context_id: parseInt(context_id),
			},
			this.returnFields,
		);
		if (result) {
			return response.status(200).send({
				success: true,
				message: 'Comment Send Successfully!',
				data: result?.comments,
			});
		} else {
			return response.status(500).send({
				success: false,
				message: 'Unable to Send Comment!',
				data: {},
			});
		}
	}

	async findAll(request, context, context_id, resp) {
		const data = {
			query: `query MyQuery {
				comments(where: {_and:[{context:{_eq:"${context}"}},{context_id:{_eq:${context_id}}}]},order_by:{created_datetime:desc}){
					id
					user_id
					comment
					context
					context_id
					created_by
					created_datetime
					updated_by
					updated_datetime
					status
					user_details{
						first_name
						last_name
						id  
					}
				}
			}`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.comments;
		if (!result || result.length < 1) {
			return resp.status(200).send({
				success: false,
				status: 'Not Found',
				message: 'Comments Not Found',
				data: {},
			});
		} else {
			return resp.status(200).json({
				success: true,
				message: 'Comments found success!',
				data: result,
			});
		}
	}

	async findOne(id: number) {
		const data = {
			query: `query MyQuery {
				comments(where: {id: {_eq: ${id}}}){
					id
					user_id
					comment
					context
					context_id
					created_by
					created_datetime
					updated_by
					updated_datetime
					status
					user_details{
						first_name
						last_name
						id  
					}
				}
			}`,
		};
		const result = await this.hasuraServiceFromServices.getData(data);
		return result;
	}

	async update(
		id: number,
		body: any,
		request: any,
		response: any,
	) {
		const user_Id = request.mw_userid;
		let updatedComment = {};
		const tableName = 'comments';
		const result = await this.findOne(id);
		//if logged user and commented user is same then only able to update comment else not
		if (
			result.data.comments[0] &&
			result.data.comments[0].user_id == user_Id
		) {
			updatedComment = await this.hasuraService.update(
				id,
				tableName,
				body,
				this.returnFields,
				[...this.returnFields, 'id'],
			);
			if (updatedComment) {
				return response.status(200).json({
					success: true,
					message: 'Comment Updated Successfully!',
					data: updatedComment,
				});
			} else {
				return response.status(400).json({
					success: false,
					message: `Comment Not Updated!`,
					data: {},
				});
			}
		} else {
			return response.status(400).json({
				success: false,
				message: `Comment Not Found`,
				data: {},
			});
		}
	}

	async remove(
		id: number,
		request: any,
		response: any,
	) {
		const user_Id = request.mw_userid;
		let deleteComment = {};
		const tableName = 'comments';
		const commentData = await this.findOne(id);
		//if logged user and commented user is same then only able to delete comment else not
		if (
			commentData?.data?.comments[0] &&
			commentData.data.comments[0].user_id == user_Id
		) {
			deleteComment = await this.hasuraService.delete(tableName, {
				id: id,
			});
			if (deleteComment) {
				return response.status(200).json({
					success: true,
					message: 'Comment Delete Successfully!',
					data: deleteComment,
				});
			} else {
				return response.status(400).json({
					success: false,
					message: `Comment Not Delete!`,
					data: {},
				});
			}
		} else {
			return response.status(400).json({
				success: false,
				message: `Comment Not Found`,
				data: {},
			});
		}
	}
}
