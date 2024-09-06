import { IsNotEmpty, IsObject } from 'class-validator';

export class ObservationFieldSearchDto {
	@IsNotEmpty()
	@IsObject()
	filters: any;
}
