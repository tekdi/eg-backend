import { IsString } from 'class-validator';

export class UpdateFieldDto {
	@IsString()
	name: string;

	@IsString()
	data_type: string;

	@IsString()
	description: string;

	@IsString()
	extra_all_info: string;
}
