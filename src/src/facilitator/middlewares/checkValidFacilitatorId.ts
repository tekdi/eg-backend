import {
	Injectable,
	NestMiddleware,
	UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { HasuraService } from '../../services/hasura/hasura.service';

@Injectable()
export class CheckValidFacilitatorIdMiddleware implements NestMiddleware {
	constructor(private hasuraServiceFromServices: HasuraService) {}
	async use(req: any, res: Response, next: NextFunction) {
		var data = {
			query: `query searchById {
				facilitator_user: users_by_pk(id: ${req.params.id}) {
					id
					program_faciltators {
						parent_ip
					}
				}
				token_user: users_by_pk(id: ${req.mw_userid}) {
					id
					program_users {
						organisation_id
					}
				}
			}`,
		};

		const response = await this.hasuraServiceFromServices.getData(data);
		let facilitatorUser: any = response?.data?.facilitator_user;
		let tokenUser: any = response?.data?.token_user;
		// const canAccess =
		// 	result &&
		// 	(result.program_beneficiaries[0]?.facilitator_id ===
		// 		req.mw_userid ||
		// 		result.program_beneficiaries[0]?.facilitator_user
		// 			?.program_faciltators[0]?.parent_ip === req.mw_userid ||
		// 		req.mw_roles.includes('program_owner'));
		const canAccess =
			facilitatorUser &&
			(facilitatorUser.id == req.mw_userid ||
				(tokenUser &&
					facilitatorUser.program_faciltators[0]?.parent_ip ==
						tokenUser.program_users?.[0]?.organisation_id));
		if (canAccess) {
			next();
		} else {
			next(
				new UnauthorizedException({
					success: false,
					message: 'Unauthorized',
				}),
			);
		}
	}
}
