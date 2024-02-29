import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { UserService } from 'src/user/user.service';
import jwt_decode from 'jwt-decode';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
	constructor(private userService: UserService) {}
	async use(req: any, res: Response, next: NextFunction) {
		req.mw_roles = [];
		req.mw_userid = null;

		if (req.headers.authorization) {
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

			try {
				const decoded: any = jwt_decode(authToken);
				let keycloak_id = decoded.sub;
				let userId;

				const roles = decoded.resource_access.hasura.roles || [];
				//check if role is program_owner set x-ip-user-id in userId
				if (roles.includes('program_owner')) {
					if (req?.headers && req?.headers?.['x-ip-user-id']) {
						userId = req.headers['x-ip-user-id'];
						req.mw_userid = userId;
					}
					req.mw_roles = roles; //pass role if x-ip-user-id is not send
				} else {
					// const user = await this.userService.ipUserInfo(req);
					userId = await this.userService.getUserIdFromKeycloakId(
						keycloak_id,
					);
					req.mw_userid = userId;
				}
				if (userId) {
					req.mw_roles = roles;
				}
			} catch (error) {
				req.mw_userid = null;
			}
		}

		next();
	}
}
