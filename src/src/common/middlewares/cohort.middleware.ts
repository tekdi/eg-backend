import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class CohortMiddleware implements NestMiddleware {
	async use(req: any, res: Response, next: () => void) {
		if (req?.headers && req?.headers?.academic_year_id) {
			// @TODO Ensure that the cohort_id obtained from the headers is validated or sanitized before being used to prevent potential security issues such as header injection attacks.
			req.mw_academic_year_id = req.headers.academic_year_id;

			next();
		} else {
			return res.status(403).send({
				success: false,
				message: 'Academic year ID / Cohort ID is required',
			});
		}
	}
}
