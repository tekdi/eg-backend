// camp.service.ts
import { Injectable } from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { UploadFileService } from 'src/upload-file/upload-file.service';

@Injectable()
export class CampService {
	constructor(
		private userService: UserService,
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private uploadFileService: UploadFileService,
	) {}

	public returnFieldsgroups = ['id', 'name', 'type', 'status'];

	public returnFieldscamps = [
		'kit_received',
		'kit_was_sufficient',
		'kit_ratings',
		'kit_feedback',
		'group_id',
	];

	public returnFieldsgroupUsers = ['group_id', 'id'];

	async create(body: any, request: any, response: any) {
		try {
			let facilitator_id = request.mw_userid;
			let learner_ids = body?.learner_ids;
			let program_id = body?.program_id || 1;
			let academic_year_id = body?.academic_year_id || 1;
			let beneficiary_status = 'enrolled_ip_verified';
			let createcampResponse: any;
			let creategroupwoner: any;

			let facilitator_status = await this.checkFaciltatorStatus(
				facilitator_id,
				program_id,
				academic_year_id,
			);
			if (
				facilitator_status?.data?.users_aggregate?.aggregate?.count == 0
			) {
				return response.status(401).json({
					success: false,
					data: {},
					message: 'Faciltator access denied ',
				});
			}

			// check if faciltator have more than one camps

			let faciltator_camp_data = await this.checkCampInformation(
				facilitator_id,
				program_id,
				academic_year_id,
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

			//check if learners belongs to same prerak and have status 'enrolled_ip_verified'

			let query = `query MyQuery {
				users(where:{program_beneficiaries:{user_id: {_in:[${learner_ids}]},status:{_eq:${beneficiary_status}}, facilitator_id: {_eq:${facilitator_id}}}}){
				  id
				}
			  }`;

			const data = { query: query };
			const res = await this.hasuraServiceFromServices.getData(data);
			let learner_data = res?.data?.users;

			// Check if learner_data is defined
			if (
				!learner_data ||
				!Array.isArray(learner_data) ||
				learner_data.length === 0
			) {
				return response.status(400).json({
					success: false,
					message: 'No learner data found or an error occurred.',
				});
			}

			// Check if facilitator_id and learner_data have the same length
			if (learner_ids.length !== learner_data.length) {
				return response.status(400).json({
					success: false,
					message:
						'Learners do not belong to the corresponding facilitator.',
				});
			}

			let create_group_object = {
				name:
					'camp ' +
					faciltator_camp_data?.data?.camps_aggregate?.aggregate
						?.count +
					1,
				type: 'camp',
				status: 'not_registered',
				program_id: body?.program_id || 1,
				academic_year_id: body?.academic_year_id || 1,
				created_by: facilitator_id,
				updated_by: facilitator_id,
			};
			let createresponse = await this.hasuraService.q(
				'groups',
				{
					...create_group_object,
				},
				[],
				false,
				[...this.returnFieldsgroups, 'id', 'name', 'type', 'status'],
			);

			let group_id = createresponse?.groups?.id;
			if (group_id) {
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

			if (!camp_id) {
				if (group_id) {
					await this.hasuraService.delete('groups', {
						id: group_id,
					});
				}

				return response.status(500).json({
					success: false,
					message: 'Camp registration failed.',
					data: {},
				});
			}

			// Add group user details for owner or faciltator

			let group_user_owner = {
				group_id: group_id,
				user_id: facilitator_id,
				member_type: 'owner',
				status: 'active',
				created_by: facilitator_id,
				updated_by: facilitator_id,
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
					message: 'error occured during creating group user.',
					data: {},
				});
			}

			let group_user_member = {
				group_id: group_id,
				member_type: 'member',
				status: 'active',
				created_by: facilitator_id,
				updated_by: facilitator_id,
			};

			//add learners to the group users

			learner_ids.forEach(async (id) => {
				await this.hasuraService.q(
					'group_users',
					{
						...group_user_member,
						user_id: id,
					},
					[],
					false,
					[...this.returnFieldsgroupUsers, 'group_id', 'id'],
				);
			});

			const auditData = {
				userId: facilitator_id,
				mw_userid: facilitator_id,
				context: 'camp',
				context_id: camp_id,
				oldData: {
					group_id: group_id,
					status: 'not_registered',
					learner_id: [learner_ids],
				},
				newData: {
					group_id: group_id,
					status: 'not_registered',
					learner_id: [learner_ids],
				},
				tempArray: ['group_id', 'status', 'learner_id'],
				action: 'create',
			};

			await this.userService.addAuditLogAction(auditData);

			return response.status(200).json({
				success: true,
				data: { camp: createcampResponse.camps },
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

	async checkCampInformation(
		id: any,
		program_id: any,
		academic_year_id: any,
	) {
		let facilitator_id = id;
		let facilitator_id_program_id = program_id;
		let facilitator_id_academic_id = academic_year_id;
		let query = `query MyQuery {
			camps_aggregate(where: {group_users: {status: {_eq: "active"}, member_type: {_eq: "owner"}, user_id: {_eq: ${facilitator_id}}, group: {academic_year_id: {_eq:${facilitator_id_academic_id}}, program_id: {_eq:${facilitator_id_program_id}}}}}) {
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

	async checkFaciltatorStatus(
		id: any,
		program_id: any,
		academic_year_id: any,
	) {
		let facilitator_id = id;
		let facilitator_id_program_id = program_id;
		let facilitator_id_academic_id = academic_year_id;
		let status = 'shortlisted_for_orientation';

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

	public async campList(body: any, req: any, resp) {
		const facilitator_id = req.mw_userid;
		let program_id = body?.program_id || 1;
		let academic_year_id = body?.academic_year_id || 1;
		let member_type = 'owner';
		let status = 'active';

		let qury = `query MyQuery {
			camps(where: {group_users: {group: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}, user: {}, member_type: {_eq:${member_type}}, status: {_eq:${status}}, user_id: {_eq:${facilitator_id}}}}) {
			  id
			  kit_ratings
			  kit_feedback
			  kit_received
			  kit_was_sufficient
			  group{
				name
				description
			  }
			  
			  group_users(where: {member_type: {_neq: "owner"}}) {
				user_id
				status
				member_type
				
			  }
			}
		  }`;

		const data = { query: qury };
		const response = await this.hasuraServiceFromServices.getData(data);
		const newQdata = response?.data;

		return resp.status(200).json({
			success: true,
			message: 'Data found successfully!',
			data: newQdata,
		});
	}

	public async campById(id: any, body: any, req: any, resp) {
		const camp_id = id;
		const facilitator_id = req.mw_userid;
		let program_id = body?.program_id || 1;
		let academic_year_id = body?.academic_year_id || 1;
		let member_type = 'owner';
		let status = 'active';

		let qury = `query MyQuery {
			camps(where: {id:{_eq:${camp_id}},group_users: {group: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}},member_type: {_eq:${member_type}}, status: {_eq:${status}}, user_id: {_eq:${facilitator_id}}}}) {
			  id
			  kit_ratings
			  kit_feedback
			  kit_received
			  kit_was_sufficient
			  group{
				name
				description
			  }
			  
			  group_users(where: {member_type: {_neq: "owner"}}) {
				user {
				  id
				  profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
					id
					name
					doument_type
					document_sub_type
					path
				  }
				  program_beneficiaries {
					user_id
					status
					enrollment_first_name
					enrollment_last_name
					enrollment_middle_name
				  }
				}
			  }
			}
		  }
		  
		  
		  `;
		const data = { query: qury };
		const response = await this.hasuraServiceFromServices.getData(data);
		const newQdata = response?.data?.camps;

		if (newQdata.length == 0) {
			return resp.status(400).json({
				success: false,
				message: 'Camp data not found!',
				data: {},
			});
		}

		const userData = await Promise.all(
			newQdata?.map(async (item) => {
				const group_users = await Promise.all(
					item.group_users.map(async (userObj) => {
						userObj = userObj.user;
						let profilePhoto = userObj.profile_photo_1;
						if (profilePhoto?.[0]?.id !== undefined) {
							const { success, data: fileData } =
								await this.uploadFileService.getDocumentById(
									userObj.profile_photo_1[0].id,
								);
							if (success && fileData?.fileUrl) {
								userObj.profile_photo_1 = {
									id: userObj.profile_photo_1[0]?.id,
									name: userObj.profile_photo_1[0]?.name,
									doument_type:
										userObj.profile_photo_1[0]
											?.doument_type,
									document_sub_type:
										userObj.profile_photo_1[0]
											?.document_sub_type,
									path: userObj.profile_photo_1[0]?.path,
									fileUrl: fileData.fileUrl,
								};
							}
						} else {
							userObj.profile_photo_1 = {};
						}

						return userObj;
					}),
				);
				return { ...item, group_users };
			}),
		);

		return resp.status(200).json({
			success: true,
			message: 'Data found successfully!',
			data: userData || {},
		});
	}
}
