// aclguarddata.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const AclGuardData = (entity: string, permissionsRequired: string[]) => {
	return SetMetadata('aclGuardData', { entity, permissionsRequired });
};
