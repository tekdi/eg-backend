import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class FieldResponsesSearchDto {
	@IsNotEmpty()
	@IsObject()
	filters: any;
}
