import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';


@Injectable()
export class KitMaterialsCoreService {
	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		
	) {}



public async list(body: any) {
  
  let query = `query MyQuery {
    kit_materials_checklist_aggregate {
      aggregate {
        count
      }
    }
    kit_materials_checklist{
      id
      camp_id
      user_id
      list_of_materials
      date
      created_at
      updated_at
    }
  }
  `;

  const response = await this.hasuraServiceFromServices.getData({
    query: query,
  });


  const kit_data = response?.data?.kit_materials_checklist;

  return { kit_data };
}

}