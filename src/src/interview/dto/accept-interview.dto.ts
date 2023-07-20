import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInterviewDto {
	@IsString()
	@IsNotEmpty()
	public rsvp: string;
}
