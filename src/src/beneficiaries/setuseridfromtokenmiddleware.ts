import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from 'src/user/user.service';

@Injectable()
export class SetUserIdFromTokenMiddleware implements NestMiddleware {
	constructor(private userService: UserService) {}
	async use(req: any, res: Response, next: NextFunction) {
		if (req.headers.authorization) {
			const user = await this.userService.ipUserInfo(req);
			req.mw_userid = user.data?.id;
		}

		next();
	}
}
