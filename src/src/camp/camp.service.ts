// camp.service.ts
import {
	Injectable,
} from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';


@Injectable()
export class CampService {
	constructor(
		private userService: UserService,
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	
	) {}

	public returnFieldsgroups = ['id', 'name', 'description', 'type', 'status'];

	public returnFieldscamps = [
		'kit_received',
		'kit_was_sufficient',
		'kit_ratings',
		'kit_feedback',
		'group_id',
	];

	public returnFieldsgroupUsers = ['group_id', 'id'];

	async registerCamp(body: any, request: any, response: any) {
		try {
			let facilitator_id = request.mw_userid;
     	let learner_id = body?.learner_id;
      let program_id = body?.program_id || 1;
      let academic_year_id = body?.academic_year_id || 1;
			let beneficiary_status = 'enrolled_ip_verified';
      let createcampResponse:any;
      let creategroupwoner:any

      let facilitator_status =  await this.checkFaciltatorStatus(facilitator_id,program_id,academic_year_id)
       if(facilitator_status?.data?.users_aggregate?.aggregate?.count == 0 ){
        return response.status(401).json({
					success: false,
					data: {},
					message: 'Faciltator access denied ',
				});
      }


			// check if faciltator have more than one camps
      
    	let faciltator_camp_data = await this.checkCampInformation(
				facilitator_id,
			);
			if (
				faciltator_camp_data?.data?.camps_aggregate?.aggregate?.count >
				1
			) {
				return response.status(401).json({
					success: false,
					data: {},
					message: 'Camp registeration limit exceeded',
				});
			}

			let query = `query MyQuery {
            users(where: {_and: {program_beneficiaries: {_and: {user_id: {_in: [${learner_id}]}},status:{_eq:${beneficiary_status}}, facilitator_id: {_eq:${facilitator_id}}}}}){
              id
              program_beneficiaries{
                user_id
              }
            }
          }`;
          
      
			const data = { query: query };
			const res = await this.hasuraServiceFromServices.getData(data);
      console.log("res-->>",res)
			const newQdata = res?.data?.users;

			// Check if learner_data is defined
			if (
				!newQdata ||
				!Array.isArray(newQdata) ||
				newQdata.length === 0
			) {
				return response.status(400).json({
					success: false,
					message: 'No learner data found or an error occurred.',
				});
			}

			let learner_data = newQdata;

			// Check if facilitator_id and learner_data have the same length
			if (learner_id.length !== learner_data.length) {
				return response.status(400).json({
					success: false,
					message:
						'Learners do not belong to the corresponding facilitator.',
				});
			}

			let create_camp_object = {
				name: body.name,
				description: body.description,
				type: body.type,
				status: body.status,
				program_id: body?.program_id || 1,
				academic_year_id: body?.academic_year_id || 1,
        created_by:facilitator_id,
        updated_by:facilitator_id
			};
			let createresponse = await this.hasuraService.q(
				'groups',
				{
					...create_camp_object,
				},
				[],
				false,
				[
					...this.returnFieldsgroups,
					'id',
					'name',
					'description',
					'type',
					'status',
				],
			);

			let group_id = createresponse?.groups?.id;
			if (createresponse?.groups?.id) {
				let camp_request_json = {
					group_id: createresponse?.groups?.id,
					created_by: facilitator_id,
					updated_by: facilitator_id,
				};

				createcampResponse = await this.hasuraService.q(
					'camps',
					{
						...camp_request_json,
					},
					[],
					false,
					[...this.returnFieldscamps, 'group_id', 'id'],
				);
			}

			let camp_id = createcampResponse?.camps?.id;

			if (!createcampResponse?.camps?.group_id) {
				await this.hasuraService.delete('groups', {
					id: group_id,
				});
				return response.status(500).json({
					success: false,
					data: {},
					message: 'Camp registration failed.',
				});
			}

			// Add group user details for owner or faciltator

			let group_user_owner = {
				group_id: group_id,
				user_id: facilitator_id,
				member_type: 'owner',
				status: 'active',
        created_by:facilitator_id,
        updated_by:facilitator_id
			};

			 creategroupwoner = await this.hasuraService.q(
				'group_users',
				{
					...group_user_owner,
				},
				[],
				false,
				[...this.returnFieldsgroupUsers, 'group_id', 'id'],
			);

			if (!creategroupwoner?.group_users?.id) {
				await this.hasuraService.delete('camps', {
					id: camp_id,
				});

				await this.hasuraService.delete('groups', {
					id: group_id,
				});

				return response.status(500).json({
					success: false,
					data: {},
					message: 'error occured during creating group user.',
				});
			}

			//add learners to the group users
			learner_id.forEach(async (id) => {
				let group_user_member = {
					group_id: group_id,
					user_id: id,
					member_type: 'member',
					status: 'active',
          created_by:facilitator_id,
          updated_by:facilitator_id
				};

				 await this.hasuraService.q(
					'group_users',
					{
						...group_user_member,
					},
					[],
					false,
					[...this.returnFieldsgroupUsers, 'group_id', 'id'],
				);
			});

			const audit = await this.userService.addAuditLog(
				facilitator_id,
				facilitator_id,
				'camp.id',
				camp_id,
        {
					group_id: group_id,
					status: body?.status,
					learner_id: [learner_id],
          
				},
				{
					group_id: group_id,
					status: body?.status,
					learner_id: [learner_id],
				},
				['group_id', 'status','learner_id'],
        'create'
			);

      console.log("audit-->>",audit)

			return response.status(200).json({
				success: true,
				message: 'Camp registered successfully.',
			});

			// Return a success response if everything is okay
		} catch (error) {
			// Handle any other errors that might occur during execution
			return response.status(500).json({
				success: false,
				message: 'An error occurred during camp registration.',
				error: error.message,
			});
		}
	}
  
	async checkCampInformation(id: any) {
		let facilitator_id = id;
		let query = `query MyQuery {
            camps_aggregate(where: {group_users: {status: {_eq: "active"}, member_type: {_eq: "owner"}, user_id: {_eq:${facilitator_id}}}}){
              aggregate{
                count
              }
            }
          }
          
          `;
		const data = { query: query };
		const res = await this.hasuraServiceFromServices.getData(data);
		return res;
	}

  async checkFaciltatorStatus(id: any,program_id:any,academic_year_id:any) {
		let facilitator_id = id;
    let facilitator_id_program_id = program_id;
    let facilitator_id_academic_id = academic_year_id
    let status = "shortlisted_for_orientation"

		let query = `query MyQuery {
      users_aggregate(where: {id: {_eq: ${facilitator_id}}, program_faciltators: {status: {_eq:${status}}, program_id: {_eq:${facilitator_id_program_id}}, academic_year_id: {_eq:${facilitator_id_academic_id}}}}) {
        aggregate {
          count
        }
      }
    }
    
      `;
		const data = { query: query };
		const res = await this.hasuraServiceFromServices.getData(data);
		return res;
	}
}
