import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
const moment = require('moment');

@Injectable()
export class KitMaterialsCoreService {
	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		
	) {}



public async list(body: any,camp_id:any) {
  
  
  const currentDate = moment().format('YYYY-MM-DD');
  const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
  const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');
  let query = `query MyQuery {
    kit_materials_checklist(where: {camp_id: {_eq: ${camp_id}},date: {_gte: "${startOfMonth}",_lte: "${endOfMonth}"}},order_by:{created_at:desc}) {
      id
      date
      camp_id
      list_of_materials
      user_id
    }}`;
  const result = await this.hasuraServiceFromServices.getData({
    query,
  });


  const kit = result?.data?.kit_materials_checklist?.[0];

  return { kit };
}

}