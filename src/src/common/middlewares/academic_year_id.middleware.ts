import {
	BadRequestException,
	Injectable,
	NestMiddleware,
} from '@nestjs/common';
import { Response } from 'express';
import { Method } from '../method/method';

@Injectable()
export class AcademicYearIdMiddleware implements NestMiddleware {
	constructor(
		private method:Method,
	){}
	async use(req: any, res: Response, next: () => void) {
		if (req?.headers && req?.headers?.['x-academic-year-id']) {
			// @TODO Ensure that the cohort_id obtained from the headers is validated or sanitized before being used to prevent potential security issues such as header injection attacks.
			req.mw_academic_year_id = req.headers['x-academic-year-id'];

			const academic_year_id = parseInt(req.mw_academic_year_id, 10);
			
			if (isNaN(academic_year_id)) {
				throw new BadRequestException('Invalid academic_year_id');
			}
			const hasAccess = await this.method.isUserHasAccessForAcademicYearId(req);
			if(!hasAccess){
				return res.json({
					success:false,
					message:'User does not access',
				})
			}
			next();
		} else {			
			return res.status(403).send({
				success: false,
				message: 'Academic year ID / Cohort ID is required',
			});
		}
	}
}
