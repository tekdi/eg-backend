import { ArrayNotEmpty, IsArray } from 'class-validator';

export class EditRequestDto {
	@IsArray()
	@ArrayNotEmpty()
	fields: string;
}
