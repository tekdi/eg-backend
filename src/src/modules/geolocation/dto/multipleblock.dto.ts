import { ArrayNotEmpty, IsString } from 'class-validator';
export class MultipleBlocksDto {
	@ArrayNotEmpty()
	@IsString({ each: true })
	readonly districts: string[];
}
