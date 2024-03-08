import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AclHelper } from 'src/common/helpers/acl.helper';
('@nestjs/common');

@Injectable()
export class AclGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private aclHelper: AclHelper,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const aclGuardData = this.reflector.get<object>(
			'aclGuardData',
			context.getHandler(),
		);

		// If no ACL guard data set, allow access
		if (!aclGuardData) {
			return true;
		}

		// If no entity passed, allow access
		if (!aclGuardData['entity']) {
			return true;
		}

		// If no required permissions passed, allow access
		if (!aclGuardData['permissionsRequired']) {
			return true;
		}

		const entity = aclGuardData['entity'];
		const permissionsRequired = aclGuardData['permissionsRequired'];
		const request = context.switchToHttp().getRequest();

		return await this.aclHelper.validateAccess(
			request,
			entity,
			permissionsRequired,
		);
	}
}
