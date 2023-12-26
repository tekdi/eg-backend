import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';

@Injectable()
export class SubjectsService {
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
	findAll(request: any) {
		return this.hasuraService.getAll(
			this.table,
			this.returnFields,
			request,
		);
	}
}
