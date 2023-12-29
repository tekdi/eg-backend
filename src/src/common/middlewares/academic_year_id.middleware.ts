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
			req.mw_academic_year_id = req.headers['x-academic-year-id'];

			// Validate format
			const academic_year_id = parseInt(req.mw_academic_year_id, 10);
			if (isNaN(academic_year_id)) {
				throw new BadRequestException('Invalid academic_year_id');
			}

			// Validate access
			const hasAccess = await this.method.isUserHasAccessForAcademicYearId(req);
			if(!hasAccess){
				return res.json({
					success:false,
					message:'User does not have access to this Academic_year Id',
				})
			}
			next();
		} else {			
			return res.status(403).send({
				success: false,
				message: 'Academic_year Id is required',
			});
		}
	}
}
