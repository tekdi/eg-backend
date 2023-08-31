import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppAbility, CaslAbilityFactory } from '../casl-ability.factory';
import { CHECK_POLICIES_KEY, PolicyHandler } from '../types/policyHandler.type';
import Role from '../enums/roles';

@Injectable()
export class PoliciesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private caslAbilityFactory: CaslAbilityFactory,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const policyHandlers =
			this.reflector.get<PolicyHandler[]>(
				CHECK_POLICIES_KEY,
				context.getHandler(),
			) || [];

		const { mw_user } = context.switchToHttp().getRequest();
		let ability;
		console.log('mw_user', mw_user);
		if (!mw_user)
			throw new UnauthorizedException({
				success: false,
				message: 'Unauthorized',
			});

		if (mw_user.roles.includes(Role.Facilitator))
			ability = this.caslAbilityFactory.createForFacilitator(mw_user);
		else if (mw_user.roles.includes(Role.ImplementationPartner))
			ability =
				this.caslAbilityFactory.createForImplementationPartner(mw_user);
		else if (mw_user.roles.includes(Role.ProgramOwner))
			ability = this.caslAbilityFactory.createForProgramOwner(mw_user);
		else ability = this.caslAbilityFactory.createForUser(mw_user);

		const hasAccess = policyHandlers.every((handler) =>
			this.execPolicyHandler(handler, ability),
		);

		if (!hasAccess)
			throw new ForbiddenException({
				success: false,
				message: 'Forbidden resource',
			});
		return true;
	}

	private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
		if (typeof handler === 'function') {
			return handler(ability);
		}
		return handler.handle(ability);
	}
}
