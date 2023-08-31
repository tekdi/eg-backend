import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	mixin,
} from '@nestjs/common';
import Role from 'src/casl/enums/roles';

export const RoleGuard = (allowedRoles: `${Role}`[]) => {
	class RoleGuardMixin implements CanActivate {
		canActivate(context: ExecutionContext) {
			const { mw_roles } = context.switchToHttp().getRequest();
			console.log('mw_user', mw_roles);

			const hasAccess = mw_roles.some((userRole) =>
				allowedRoles.includes(userRole),
			);

			if (!hasAccess)
				throw new ForbiddenException({
					success: false,
					message: 'Forbidden resource',
				});
			return true;
		}
	}

	const guard = mixin(RoleGuardMixin);
	return guard;
};
