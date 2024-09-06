import { IsNotEmpty, IsObject } from 'class-validator';

export class ObservationSearchDto {
	@IsNotEmpty()
	@IsObject()
	filters: any;
}
