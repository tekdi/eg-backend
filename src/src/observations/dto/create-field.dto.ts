import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFieldDto {
	@IsNotEmpty()
	@IsString()
	name: string;

	@IsNotEmpty()
	@IsString()
	data_type: string;

	@IsNotEmpty()
	@IsString()
	description: string;

	@IsNotEmpty()
	@IsString()
	extra_all_info: string;
}
