import { Injectable } from '@nestjs/common';
const crypto = require('crypto');
@Injectable()
export class UserHelperService {
	public generateRandomPassword() {
		let length = 8;
		let charset =
			'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let password_value = '';

		for (let i = 0; i < length; i++) {
			const randomIndex = crypto.randomBytes(1)[0] % charset.length;
			password_value += charset[randomIndex];
		}
		return password_value;
	}

	public async getAdminKeycloakToken() {
		let axios = require('axios');

		let data = {
			username: 'admin',
			client_id: 'admin-cli',
			grant_type: 'client_credentials',
			password: process.env.KEYCLOAK_ADMIN_PASSWORD,
			client_secret: process.env.KEYCLOAK_ADMIN_CLI_CLIENT_SECRET,
		};

		let config = {
			method: 'post',
			url: `${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			data: data,
		};

		return axios(config);
	}
}
