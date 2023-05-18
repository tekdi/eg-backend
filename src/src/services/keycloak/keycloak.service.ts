import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class KeycloakService {

    constructor(private configService: ConfigService, private readonly httpService: HttpService) {}

    public async getAdminKeycloakToken() {
        console.log("inside getAdminKeycloakToken")
        const data = {
            username: 'admin',
            client_id: 'admin-cli',
            grant_type: 'client_credentials',
            password: this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD'),
            client_secret: this.configService.get<string>('KEYCLOAK_ADMIN_CLI_CLIENT_SECRET')
          };

        
        const url = this.configService.get<string>('KEYCLOAK_URL') + '/realms/master/protocol/openid-connect/token';
            
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

    public async resetPassword(keycloak_id, token) {
        
    }
}
