import { IsNotEmpty, IsString } from 'class-validator';

export class CreateObservationDto {
	@IsNotEmpty()
	@IsString()
	name: string;
}
