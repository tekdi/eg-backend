import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class FieldSearchDto {
	@IsNotEmpty()
	@IsObject()
	filters: any;
}
