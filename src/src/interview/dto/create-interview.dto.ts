import { IsArray, IsNotEmpty, IsString } from 'class-validator';
export class CreateInterviewDto {
	@IsArray()
	@IsNotEmpty()
	public reminder: [];

	@IsString()
	@IsNotEmpty()
	public start_time: string;

	@IsString()
	@IsNotEmpty()
	public end_time: string;

	@IsString()
	@IsNotEmpty()
	public date: string;

	@IsString()
	@IsNotEmpty()
	public location_type: string;

	@IsString()
	@IsNotEmpty()
	public location: string;

	@IsString()
	@IsNotEmpty()
	public user_id: string;
}
