import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';


@Injectable()
export class KeycloakService {
    
    public keycloak_url = this.configService.get<string>('KEYCLOAK_URL');
    public keycloak_admin_cli_client_secret = this.configService.get<string>('KEYCLOAK_ADMIN_CLI_CLIENT_SECRET');
    public realm_name = this.configService.get<string>('REALM_NAME');

    constructor(private configService: ConfigService, private readonly httpService: HttpService) { }

    public async getAdminKeycloakToken() {
        console.log("inside getAdminKeycloakToken")
        const data = {
            username: 'admin',
            client_id: 'admin-cli',
            grant_type: 'client_credentials',
            client_secret: this.keycloak_admin_cli_client_secret
        };


        const url = `${this.keycloak_url}/realms/master/protocol/openid-connect/token`;

        const config: AxiosRequestConfig = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        };

        try {
            const observable = this.httpService.post(url, data, config);

            const promise = observable.toPromise();

            const response = await promise;

            return response.data;
        } catch (e) {
            console.log("getAdminKeycloakToken", e.message)
        }
    }

    public async resetPassword(keycloak_id, token, password) {
        console.log("resetPassword")
        const data = {
            "temporary": false,
            "type": "password",
            "value": password
        }


        const url = `${this.keycloak_url}/admin/realms/${this.realm_name}/users/${keycloak_id}/reset-password`;

        const config: AxiosRequestConfig = {
            headers: {
                'Authorization': `bearer ${token}`,
                'Content-Type': 'application/json'
            },
        };

        try {
            const observable = this.httpService.put(url, data, config);

            const promise = observable.toPromise();

            const response = await promise;
            console.log("password updated")
            return "password updated";
        } catch (e) {
            console.log("getAdminKeycloakToken", e.message)
        }
        
    }
}
