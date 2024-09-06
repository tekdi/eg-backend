import { IsNotEmpty, IsObject } from 'class-validator';

export class FieldSearchDto {
	@IsNotEmpty()
	@IsObject()
	filters: any;
}
