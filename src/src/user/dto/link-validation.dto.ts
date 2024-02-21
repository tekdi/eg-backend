import { IsNotEmpty, IsNumber } from 'class-validator';

export class LinkValidationDTO {
	@IsNumber()
	@IsNotEmpty()
	public program_id: number;

	@IsNumber()
	@IsNotEmpty()
	public organisation_id: number;

	@IsNumber()
	@IsNotEmpty()
	public academic_year_id: number;
}
