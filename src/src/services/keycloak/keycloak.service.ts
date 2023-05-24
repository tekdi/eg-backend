import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import { lastValueFrom, map } from 'rxjs';


@Injectable()
export class KeycloakService {

    public keycloak_url = this.configService.get<string>('KEYCLOAK_URL');
    public keycloak_admin_cli_client_secret = this.configService.get<string>('KEYCLOAK_ADMIN_CLI_CLIENT_SECRET');
    public realm_name = this.configService.get<string>('REALM_NAME');

    constructor(private configService: ConfigService, private readonly httpService: HttpService) { }

    public async getAdminKeycloakToken(data, realm) {
        console.log("inside getAdminKeycloakToken")

        const url = `${this.keycloak_url}/realms/${realm}/protocol/openid-connect/token`;

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

    public async createUser(userData): Promise<{ [key: string]: any }>  {
        const data = {
            username: 'admin',
            client_id: 'admin-cli',
            grant_type: 'client_credentials',
            password: this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD'),
            client_secret: this.configService.get<string>('KEYCLOAK_ADMIN_CLI_CLIENT_SECRET'),
        };
        try {
            const adminResultData = await this.getAdminKeycloakToken(data, 'master');

            if (adminResultData?.access_token) {
                let url = `${this.configService.get<string>('KEYCLOAK_URL')}/admin/realms/eg-sso/users`;
                let data = userData;

                const { headers, status } = await lastValueFrom(
                    this.httpService.post(url, data, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminResultData.access_token}`,
                    }
                    })
                    .pipe(map((res) => res))
                );
                return {
                    headers,
                    status
                };
            } else {
                throw new BadRequestException('Error while creating user !');
            }
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

}
