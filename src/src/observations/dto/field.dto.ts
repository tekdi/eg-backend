import { IsNotEmpty, IsString } from 'class-validator';

export class FieldDto {
	@IsNotEmpty()
	@IsString()
	name: string;

	@IsNotEmpty()
	@IsString()
	data_type: string;

	@IsNotEmpty()
	@IsString()
	title: string;
}
