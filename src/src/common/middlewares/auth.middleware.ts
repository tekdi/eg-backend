import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { UserService } from 'src/user/user.service';
import jwt_decode from 'jwt-decode';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
	constructor(private userService: UserService) {}
	async use(req: any, res: Response, next: NextFunction) {
		if (req.headers.authorization) {
			req.mw_roles = [];
			req.mw_userid = null;

			let bearerToken = null;
			let bearerTokenTemp = null;

			// Get userid from  auth/login jwt token
			const authToken = req?.headers?.authorization;
			const authTokenTemp = req?.headers?.authorization.split(' ');

			// If Bearer word not found in auth header value
			if (authTokenTemp[0] !== 'Bearer') {
				req.mw_userid = null;
			}
			// Get trimmed Bearer token value by skipping Bearer value
			else {
				bearerToken = authToken
					.trim()
					.substr(7, authToken.length)
					.trim();
			}

			// If Bearer token value is not passed
			if (!bearerToken) {
				req.mw_userid = null;
			}
			// Lets split token by dot (.)
			else {
				bearerTokenTemp = bearerToken.split('.');
			}

			// Since JWT has three parts - seperated by dots(.), lets split token
			if (bearerTokenTemp.length < 3) {
				req.mw_userid = null;
			}

			const decoded: any = jwt_decode(authToken);
			let keycloak_id = decoded.sub;

			// const user = await this.userService.ipUserInfo(req);
			const userId = await this.userService.getUserIdFromKeycloakId(
				keycloak_id,
			);

			req.mw_userid = userId;

			if (userId) {
				const decoded: any = jwt_decode(req.headers.authorization);
				req.mw_roles = decoded.resource_access.hasura.roles || [];
			}
		} else {
			req.mw_userid = null;
		}

		next();
	}
}
