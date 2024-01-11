import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';

@Injectable()
export class InterviewService {
	public table = 'interviews';
	public fillable = [
		'title',
		'user_id',
		'owner_user_id',
		'start_time',
		'end_time',
		'date',
		'interviewer_name',
		'comment',
		'status',
		'created_by',
		'updated_by',
		'created_at',
		'updated_at',
		'location_type',
		'location',
		'reminder',
		'rsvp',
	];
	public returnFields = [
		'id',
		'title',
		'user_id',
		'owner_user_id',
		'start_time',
		'end_time',
		'date',
		'interviewer_name',
		'comment',
		'status',
		'created_by',
		'updated_by',
		'created_at',
		'updated_at',
		'location_type',
		'location',
		'reminder',
		'rsvp',
	];

	constructor(private readonly hasuraService: HasuraService) {}

	async create(body: any, request: any, resp: any) {
		const result = await this.hasuraService.create(
			this.table,
			{
				...body,
				owner_user_id: request.mw_userid,
				reminder: JSON.stringify(body.reminder).replace(/"/g, '\\"'),
			},
			this.returnFields,
		);
		if (result) {
			return resp.status(200).send({
				success: true,
				message: 'Interview created successfully!',
				data: result.interviews,
			});
		} else {
			return resp.status(500).send({
				success: false,
				message: 'Unable to create Interview!',
				data: {},
			});
		}
	}

	async findAll(request: any, response: any) {
		const result = await this.hasuraService.getAll(
			this.table,
			this.returnFields,
			request,
		);
		if (result?.data?.data) {
			return response.status(200).send({
				success: true,
				message: 'Interview list found successfully!',
				data: result?.data?.data,
			});
		} else {
			return response.status(500).send({
				success: false,
				message: 'Data Not Found !',
				data: {},
			});
		}
	}

	async findOne(id: number, response: any) {
		const result = await this.hasuraService.getOne(
			+id,
			this.table,
			this.returnFields,
		);
		if (result) {
			return response.status(200).send({
				success: true,
				message: 'Interview found successfully!',
				data: result.interviews,
			});
		} else {
			return response.status(500).send({
				success: false,
				message: 'Data Not Found !',
				data: {},
			});
		}
	}

	async update(id: number, req: any, response: any) {
		const result = await this.hasuraService.update(
			+id,
			this.table,
			req,
			this.returnFields,
		);
		if (result) {
			return response.status(200).send({
				success: true,
				message: 'Interview updated successfully!',
				data: result.interviews,
			});
		} else {
			return response.status(500).send({
				success: false,
				message: 'Unable to update Interview!',
				data: {},
			});
		}
	}

	async update_rsvp(id: number, req: any, response: any) {
		const result = await this.hasuraService.update(
			+id,
			this.table,
			req,
			this.returnFields,
		);
		if (result) {
			return response.status(200).send({
				success: true,
				message: 'Rsvp updated successfully!',
				data: result.interviews,
			});
		} else {
			return response.status(500).send({
				success: false,
				message: 'Unable to update Rsvp!',
				data: {},
			});
		}
	}

	remove(id: number) {
		return this.hasuraService.delete(this.table, { id: +id });
	}
}
