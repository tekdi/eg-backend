import { Injectable, NestMiddleware } from '@nestjs/common';
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

		if (goToNextMw) {
			next();
		}
	}
}
