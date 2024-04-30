import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class ObservationSearchDto {
	@IsNotEmpty()
	@IsObject()
	filters: any;
}
