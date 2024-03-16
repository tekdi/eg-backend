import { IsNotEmpty, IsString, IsObject, IsNumber } from 'class-validator';

export class FieldResponsesDto {
	@IsNotEmpty()
	@IsNumber()
	observation_id: number;

	@IsNotEmpty()
	@IsNumber()
	field_id: number;

	@IsNotEmpty()
	@IsString()
	response_value: string;

	@IsNotEmpty()
	@IsString()
	context: string;

	@IsNotEmpty()
	@IsNumber()
	context_id: number;
}
