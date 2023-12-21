import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class CohortMiddleware implements NestMiddleware {
	async use(req: any, res: Response, next: () => void) {
		if (req.headers && req.headers.cohort_id) {
			req.mw_cohort_id = req.headers.cohort_id;

			next();
		} else {
			return res.status(403).send({
				success: false,
				message: 'cohort_id is required',
			});
		}
	}
}
