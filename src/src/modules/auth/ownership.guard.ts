// ownership.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { CampCoreService } from 'src/camp/camp.core.service';

@Injectable()
export class OwnershipGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private campcoreservice: CampCoreService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.get('data', context.getHandler());

		if (!required) {
			return true; // No requirement specified, allow access
		}

		const request = context.switchToHttp().getRequest();
		const id = request?.params?.id;
		const roles = request.mw_roles; // Assuming user data is attached to the request
		const user_id = request.mw_userid; // Assuming user data is attached to the request
		const academic_year_id = request.mw_academic_year_id;
		const program_id = request.mw_program_id;

		switch (required?.entity) {
			case 'camps': {
				// Use async/await to properly handle asynchronous operation
				const result = await this.campcoreservice.cehckOwnership({
					roles,
					camp_id: id,
					user_id,
					program_id,
					academic_year_id,
				});
				console.log('user roles-->>', id, roles, user_id, result);

				// Return the result of the ownership check
				return result;
			}
			case 'facilitator':
				break;
			case 'beneficiary':
				// Handle other cases if needed
				break;

			default:
				// Handle default case if needed
				break;
		}

		// Default to allowing access
		return true;
	}
}
