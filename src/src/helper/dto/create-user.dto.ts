// src/articles/dto/create-article.dto.ts
import { IsNotEmpty } from 'class-validator';

export class CreateUserDto {
	@IsNotEmpty()
	first_name: string;

	last_name: string;

	@IsNotEmpty()
	mobile: number;

	//@IsNotEmpty()
	parent_ip: number;

	qualification_master_id: string;
}
