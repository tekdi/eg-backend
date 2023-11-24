import { Exclude, Expose } from 'class-transformer';
import {
	MaxLength,
	IsNotEmpty,
	IsEmail,
	IsString,
	IsNumber,
} from 'class-validator';

export class LSMTestDto {
	//generated fields
	@Expose()
	id: string;
	@Expose()
	user_id: number;
	@Expose()
	test_id: string;
	@Expose()
	spent_time: number;
	@Expose()
	score: string;
	@Expose()
	status: string;
	@Expose()
	created_at: string;
	@Expose()
	created_by: number;
	@Expose()
	score_details: any;

	constructor(partial: Partial<LSMTestDto>) {
		Object.assign(this, partial);
	}
}
