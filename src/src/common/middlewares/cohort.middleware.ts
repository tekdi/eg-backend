import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class CohortMiddleware implements NestMiddleware {
	async use(req: any, res: Response, next: () => void) {
		let goToNextMw = false;

		if (req?.headers && req?.headers?.['x-program-id']) {
			// @TODO Sanitize, validate x-program-id
			req.mw_program_id = req.headers['x-program-id'];
		} else {
			return res.status(403).send({
				success: false,
				message: 'Program Id is required',
			});
		}
		const program_id = parseInt(req.mw_program_id, 10);
		if (req?.headers && req?.headers?.['x-academic-year-id']) {
			// @TODO Sanitize, validate x-academic-year-id
			req.mw_academic_year_id = req.headers['x-academic-year-id'];
			goToNextMw = true;
		} else {
			return res.status(403).send({
				success: false,
				message: 'Academic year ID / Cohort ID is required',
			});
		}
		const academic_year_id = parseInt(req.mw_academic_year_id, 10);
		if (isNaN(program_id) || isNaN(academic_year_id)) {
			throw new BadRequestException('Invalid program_id or academic_year_id');
		}

		if (goToNextMw) {
			next();
		}
	}
}
