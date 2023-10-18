import { Injectable } from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { HasuraService } from 'src/hasura/hasura.service';
import { AttendancesCoreService } from './attendances.core.service';

@Injectable()
export class AttendancesService {
	public table = 'attendance';
	public fillable = [
		'user_id',
		'context_id',
		'created_by',
		'updated_by',
		'date_time',
		'status',
		'lat',
		'long',
	];
	public returnFields = [
		'id',
		'user_id',
		'context_id',
		'created_by',
		'updated_by',
		'date_time',
		'status',
		'lat',
		'long',
	];
	constructor(
		private readonly hasuraService: HasuraService,
		private readonly attendanceCoreService: AttendancesCoreService,
	) {}
	public async createAttendance(body: any, req: any, res: any) {
		let faciltator_id = req.mw_userid;
		let create_attendance_object = {
			...body,
			updated_by: faciltator_id,
			created_by: faciltator_id,
		};
		let createAttendanceResponse = await this.attendanceCoreService.create(
			create_attendance_object,
			this.returnFields,
			req,
			res,
		);

		return createAttendanceResponse;
	}

	public async updateAttendance(
		id: any,
		body: any,
		update_array: any,
		req: any,
		res: any,
	) {
		let user_id = req.mw_userid;
		let update_attendance_object = {
			...body,
			updated_by: user_id,
			created_by: user_id,
		};
		let updateAttendanceResponse = await this.attendanceCoreService.update(
			update_attendance_object,
			id,
			update_array,
			this.returnFields,
			req,
			res,
		);

		return updateAttendanceResponse;
	}

	public async getCampAttendance(id: any, req: any, res: any) {
		let getCampResponse = await this.attendanceCoreService.getByCampId(
			id,
			req,
			res,
		);

		return getCampResponse;
	}

	findAll(request: any) {
		return this.hasuraService.getAll(
			this.table,
			this.returnFields,
			request,
		);
	}

	findOne(id: number) {
		return this.hasuraService.getOne(+id, this.table, this.returnFields);
	}

	update(id: number, req: any) {
		return this.hasuraService.update(
			+id,
			this.table,
			req,
			this.returnFields,
		);
	}
}
