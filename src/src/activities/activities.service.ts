import { Injectable } from '@nestjs/common';
import { ActivitiesCoreService } from './activities.core.service';
import { EnumService } from 'src/enum/enum.service';


@Injectable()
export class ActivitiesService {
    constructor(
        private activitiesCoreService: ActivitiesCoreService,
        private enumService: EnumService,
    ) {}
    allStatus = this.enumService.getEnumValue('LEARNING_ACTIVITIES').data;
    public async create(request: any,body:any, resp: any){
        let facilitator_id = request.mw_userid;
		let user_id = body?.user_id;
        let academic_year_id = body?.academic_year_id || 1;
        let program_id = body?.program_id || 1;
		const response = this.activitiesCoreService.create(body,user_id,facilitator_id,academic_year_id,program_id);
        if(response != null){
            return resp.json({
                status: 200,
                message: 'Successfully updated camp details',
                data: [],
            });
        }
         
        
    }
    public async update(request:any,body:any,id:any,res:any){
        let facilitator_id = request.mw_userid;
		let user_id = body?.user_id;
        let updated_response = this.activitiesCoreService.update(body,id,facilitator_id,user_id);
    }
    public async getById(id:any, body:any, request:any, response:any){

    }
    public async getList(request:any,response:any){

    }
}