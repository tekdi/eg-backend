// Ownership.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const OwnershipDecorator = (data: object) => SetMetadata('data', data);
