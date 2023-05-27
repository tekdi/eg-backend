import { Injectable } from '@nestjs/common';
import { CreateSubjectslistDto } from './dto/create-subjectslist.dto';
import { UpdateSubjectslistDto } from './dto/update-subjectslist.dto';
import { HasuraService } from 'src/hasura/hasura.service';

@Injectable()
export class SubjectslistService {
  public table = 'subjects';
  public fillable = [
    'name',
    'language_or_medium',
    'board',
    'created_by',
    'updated_by',
    'code',
  ];
  public returnFields = [
    'id',
    'name',
    'language_or_medium',
    'board',
    'created_by',
    'updated_by',
    'code',
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

  // remove(id: number) {
  //   return this.hasuraService.delete(this.table, { id: +id });
  // }
}
