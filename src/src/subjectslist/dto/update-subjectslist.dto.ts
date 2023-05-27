import { PartialType } from '@nestjs/mapped-types';
import { CreateSubjectslistDto } from './create-subjectslist.dto';

export class UpdateSubjectslistDto extends PartialType(CreateSubjectslistDto) {}
