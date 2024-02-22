// role.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.get<string[]>(
			'roles',
			context.getHandler(),
		);
		console.log('requiredRoles-->>', requiredRoles);

		if (!requiredRoles) {
			return true; // No roles required, allow access
		}

		const request = context.switchToHttp().getRequest();
		const user = request.mw_roles; // Assuming user data is attached to the request

		console.log('user roles-->>', user, request?.params, request?.body);
		if (!user) {
			return false; // User is not authenticated
		}

		// Check if the user has at least one of the required roles
		const hasRequiredRole = requiredRoles.some((role) =>
			user.includes(role),
		);

		return hasRequiredRole;
	}
}
