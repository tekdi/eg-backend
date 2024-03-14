import {
	BadRequestException,
	Injectable,
	NestMiddleware,
} from '@nestjs/common';
import { Response } from 'express';
import { Method } from '../method/method';

@Injectable()
export class CohortMiddleware implements NestMiddleware {
	constructor(private method: Method) {}
	async use(req: any, res: Response, next: () => void) {
		let goToNextMw = false;
		//check IP User ID is present or not [x-ip-user-id]
		// if (
		// 	req?.headers?.['x-ip-org-id'] ||
		// 	req?.mw_roles?.includes('program_owner')
		// ) {
		// 	req.mw_ip_user_id = req.headers['x-ip-org-id'];

		// 	const ip_user_id = parseInt(req.mw_ip_user_id, 10);
		// 	if (isNaN(ip_user_id)) {
		// 		return res.json({
		// 			success: false,
		// 			message: `${
		// 				req.mw_ip_user_id ? 'Invalid' : 'Required'
		// 			} Ip org Id`,
		// 		});
		// 	}
		// }

		if (req?.headers?.['x-program-id']) {
			req.mw_program_id = req.headers['x-program-id'];
			const program_id = parseInt(req.mw_program_id, 10);
			if (isNaN(program_id)) {
				throw new BadRequestException('Invalid Program Id');
			}

			// Validate access
			const hasAccess = await this.method.isUserHasAccessForProgram(req);
			if (!hasAccess) {
				return res.json({
					success: false,
					message: 'User does not have access to this Program Id',
				});
			}
		} else {
			return res.status(403).send({
				success: false,
				message: 'Program Id is required',
			});
		}

		if (req?.headers?.['x-academic-year-id']) {
			req.mw_academic_year_id = req.headers['x-academic-year-id'];
			const academic_year_id = parseInt(req.mw_academic_year_id, 10);
			if (isNaN(academic_year_id)) {
				throw new BadRequestException('Invalid academic_year_id');
			}

			// Validate access
			const hasAccess =
				await this.method.isUserHasAccessForAcademicYearId(req);
			if (!hasAccess) {
				return res.json({
					success: false,
					message:
						'User does not have access to this Academic_year Id',
				});
			}
			goToNextMw = true;
		} else {
			return res.status(403).send({
				success: false,
				message: 'Academic year ID is required',
			});
		}

		if (goToNextMw) {
			next();
		}
	}
}
