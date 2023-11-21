import { Injectable } from "@nestjs/common";
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class CohortService {
    constructor(
        private hasuraServiceFromService: HasuraServiceFromServices,
    ){}
    public async getCohortList(res:any){
        let data = {
            query : `query MyQuery {
                academic_years {
                  name
                  id
                  end_date
                  created_by
                }
              }`
        }
        const response = await this.hasuraServiceFromService.getData(data);
        return res.status(200).send({
            success: true,
            message: 'Success',
            data: response.data,
        });
    }
}