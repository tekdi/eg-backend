import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { UserService } from 'src/user/user.service';
import jwt_decode from 'jwt-decode';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
	constructor(private userService: UserService) {}
	async use(req: any, res: Response, next: NextFunction) {
		if (req.headers.authorization) {
			const user = await this.userService.ipUserInfo(req);
			console.log('user:', user);
			req.mw_userid = user?.data?.id;
			req.mw_user = user?.data;
			if (user) {
				const decoded: any = jwt_decode(req.headers.authorization);
				req.mw_roles = decoded.resource_access.hasura.roles || [];
				req.mw_user.roles = req.mw_roles;
			}
			console.log('req.mw_user:', req.mw_user);
		} else {
			req.mw_userid = null;
		}

		next();
	}
}
