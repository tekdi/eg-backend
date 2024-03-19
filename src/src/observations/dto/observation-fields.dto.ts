import { IsNotEmpty, IsString, IsNumber, IsObject } from 'class-validator';

export class ObservationFieldsDto {
	@IsNotEmpty()
	@IsNumber()
	observation_id: number;

	@IsNotEmpty()
	@IsString()
	context: string;

	@IsNotEmpty()
	@IsString()
	title: string;

	@IsNotEmpty()
	@IsNumber()
	fields_sequence: string;

	@IsNotEmpty()
	@IsNumber()
	context_id: number;

	@IsNotEmpty()
	@IsNumber()
	field_id: number;
}
