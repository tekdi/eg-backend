import { PartialType } from '@nestjs/mapped-types';
import { CreateOnestusertrackDto } from './create-onestusertrack.dto';

export class UpdateOnestusertrackDto extends PartialType(CreateOnestusertrackDto) {}
