import { PartialType } from '@nestjs/mapped-types';
import { CreateKitMaterialDto } from './create-kit-material.dto';

export class UpdateKitMaterialDto extends PartialType(CreateKitMaterialDto) {}
