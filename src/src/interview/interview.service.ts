import { Injectable } from '@nestjs/common';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { HasuraService } from 'src/hasura/hasura.service';

@Injectable()
export class InterviewService {
  public table = 'interviews';
  public fillable = [
    'title',
    'user_id',
    'owner_user_id',
    'start_date_time',
    'end_date_time',
    'comment',
    'status',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at',
    'location_type',
    'location',
  ];
  public returnFields = [
    'id',
    'title',
    'user_id',
    'owner_user_id',
    'start_date_time',
    'end_date_time',
    'comment',
    'status',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at',
    'location_type',
    'location',
  ];
  constructor(private readonly hasuraService: HasuraService) {}
  create(req: any) {
    return this.hasuraService.create(this.table, req, this.returnFields);
  }

  findAll(request: any) {
    return this.hasuraService.getAll(this.table, this.returnFields, request);
  }

  findOne(id: number) {
    return this.hasuraService.getOne(+id, this.table, this.returnFields);
  }

  update(id: number, req: any) {
    return this.hasuraService.update(+id, this.table, req, this.returnFields);
  }

  remove(id: number) {
    return this.hasuraService.delete(this.table, { id: +id });
  }
}