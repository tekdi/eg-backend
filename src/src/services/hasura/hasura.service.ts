import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';


@Injectable()
export class HasuraService {

    constructor(private configService: ConfigService, private readonly httpService: HttpService) {}
    
    async postData(query) {

        const data = JSON.stringify(query);

        
        const url = this.configService.get<string>('HASURA_BASE_URL')
            
        const config: AxiosRequestConfig = {
            headers: {
                'x-hasura-admin-secret': this.configService.get<string>('HASURA_ADMIN_SECRET'),
                'Content-Type': 'application/json'
            },
        };
        
        try {
            const observable = this.httpService.post(url, data, config);

            const promise = observable.toPromise();

            const response = await promise;

            return response.data;
        } catch (e) {
            console.log("post data error", e.message)
        }
    }
}
