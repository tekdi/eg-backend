import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';
import { Method } from '../method/method';

@Injectable()
export class IpMiddleware implements NestMiddleware {
	constructor(private method: Method) {}
	async use(req: any, res: Response, next: () => void) {
		//check IP User ID is present or not [x-ip-user-id]
		if (
			req?.headers?.['x-ip-org-id'] ||
			req?.mw_roles?.includes('program_owner')
		) {
			req.mw_ip_user_id = req.headers['x-ip-org-id'];

			const ip_user_id = parseInt(req.mw_ip_user_id, 10);
			if (isNaN(ip_user_id)) {
				return res.json({
					success: false,
					message: `${
						req.mw_ip_user_id ? 'Invalid' : 'Required'
					} Ip org Id`,
				});
			}
		}

		next();
	}
}
