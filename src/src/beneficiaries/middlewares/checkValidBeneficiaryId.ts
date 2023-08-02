import {
	Injectable,
	NestMiddleware,
	UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { HasuraService } from '../../services/hasura/hasura.service';

@Injectable()
export class CheckValidBeneficiaryIdMiddleware implements NestMiddleware {
	constructor(private hasuraServiceFromServices: HasuraService) {}
	async use(req: any, res: Response, next: NextFunction) {
		const data = {
			query: `query searchById {
				users_by_pk(id: ${req.params.id}) {
					id
					program_beneficiaries {
						id
						facilitator_id
						facilitator_user {
							program_faciltators {
								parent_ip
							}
						}
					}
				}
			}`,
		};

		const response = await this.hasuraServiceFromServices.getData(data);
		let result: any = response?.data?.users_by_pk;
		// const canAccess =
		// 	result &&
		// 	(result.program_beneficiaries[0]?.facilitator_id ===
		// 		req.mw_userid ||
		// 		result.program_beneficiaries[0]?.facilitator_user
		// 			?.program_faciltators[0]?.parent_ip === req.mw_userid ||
		// 		req.mw_roles.includes('program_owner'));
		const canAccess =
			result &&
			result.program_beneficiaries[0]?.facilitator_id === req.mw_userid;
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
