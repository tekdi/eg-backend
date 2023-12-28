import {
	BadRequestException,
	Injectable,
	NestMiddleware,
} from '@nestjs/common';
import { Response } from 'express';
import { Method } from '../method/method';

@Injectable()
export class ProgramMiddleware implements NestMiddleware {
	constructor(
		private method : Method,
	){}
	async use(req: any, res: Response, next: () => void) {
		if (req?.headers && req?.headers?.['x-program-id']) {
			// @TODO Ensure that the program_id obtained from the headers is validated or sanitized before being used to prevent potential security issues such as header injection attacks.
			req.mw_program_id = req.headers['x-program-id'];

			const program_id = parseInt(req.mw_program_id, 10);
			if (isNaN(program_id)) {
				throw new BadRequestException('Invalid program_id');
			}
			const hasAccess =await this.method.isUserHasAccessForProgram(req);
			if(!hasAccess){
				return res.json({
					success:false,
					message:'User does not have access',
				})
			}
			next();
		} else {
			return res.status(403).send({
				success: false,
				message: 'Program Id is required',
			});
		}
	}
}
