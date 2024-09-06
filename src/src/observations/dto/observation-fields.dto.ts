import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class ObservationFieldsDto {
	@IsNotEmpty()
	@IsNumber()
	observation_id: number;

	@IsNotEmpty()
	@IsString()
	context: string;

	@IsNotEmpty()
	@IsNumber()
	fields_sequence: number;

	@IsNotEmpty()
	@IsNumber()
	context_id: number;

	@IsNotEmpty()
	@IsNumber()
	field_id: number;
}
