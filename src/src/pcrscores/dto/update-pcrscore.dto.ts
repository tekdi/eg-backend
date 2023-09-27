import { PartialType } from '@nestjs/mapped-types';
import { CreatePcrscoreDto } from './create-pcrscore.dto';

export class UpdatePcrscoreDto extends PartialType(CreatePcrscoreDto) {}
