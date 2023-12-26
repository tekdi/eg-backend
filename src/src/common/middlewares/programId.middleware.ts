import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class ProgramIdMiddleware implements NestMiddleware {
	async use(req: any, res: Response, next: () => void) {
		if (req?.headers && req?.headers?.['x-program-id']) {
			// @TODO Ensure that the program_id obtained from the headers is validated or sanitized before being used to prevent potential security issues such as header injection attacks.
			req.mw_program_id = req.headers['x-program-id'];

			next();
		} else {
			return res.status(403).send({
				success: false,
				message: 'Program Id is required',
			});
		}
	}
}
