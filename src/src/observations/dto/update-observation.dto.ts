import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateObservationDto {
	@IsNotEmpty()
	@IsString()
	name: string;
}
