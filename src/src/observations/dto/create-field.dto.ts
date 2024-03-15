import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFieldDto {
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
