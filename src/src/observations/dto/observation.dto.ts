import { IsNotEmpty, IsString } from 'class-validator';

export class ObservationDto {
	@IsNotEmpty()
	@IsString()
	name: string;
}
