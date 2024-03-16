import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class FieldDto {
	@IsNotEmpty()
	@IsString()
	name: string;

	@IsNotEmpty()
	@IsString()
	data_type: string;

	description: string;

	extra_all_info: string;

	@IsNotEmpty()
	@IsString()
	title: string;

	enum: string;
}
