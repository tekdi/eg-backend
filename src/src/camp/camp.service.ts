// camp.service.ts
import { Injectable } from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { UploadFileService } from 'src/upload-file/upload-file.service';
import { S3Service } from '../services/s3/s3.service';
import { AttendancesService } from '../attendances/attendances.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { BeneficiariesCoreService } from 'src/beneficiaries/beneficiaries.core.service';

import { EnumService } from '../enum/enum.service';
import { CampCoreService } from './camp.core.service';

@Injectable()
export class CampService {
	constructor(
		private userService: UserService,
		private hasuraService: HasuraService,
		private attendancesService: AttendancesService,
		private enumService: EnumService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private uploadFileService: UploadFileService,
		private s3Service: S3Service,
		private campcoreservice: CampCoreService,
		private beneficiariesService: BeneficiariesService,
		private beneficiariesCoreService: BeneficiariesCoreService,
	) {}

	public returnFieldsgroups = ['id', 'name', 'type', 'status'];

	public returnFieldscamps = [
		'kit_received',
		'kit_was_sufficient',
		'kit_ratings',
		'kit_feedback',
		'group_id',
	];

	public returnFieldsconsents = [
		'id',
		'user_id',
		'document_id',
		'facilitator_id',
	];
	public returnFieldsgroupUsers = ['group_id', 'id'];

	public returnFieldsProperties = ['id'];

	public returnFieldsGroups = ['status', 'id'];

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
					message: 'CAMP_ACCESS_ERROR',
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
					message:
						'CAMP_VALIDATION_MESSAGE_REGISTRATION_LIMIT_EXCEED',
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
					message: 'CAMP_VALIDATION_MESSAGE_LEARNER_ID_DOESNT_EXIST',
				});
			}

			// Check if facilitator_id and learner_data have the same length
			if (learner_ids.length !== learner_data.length) {
				return response.status(400).json({
					success: false,
					message:
						'CAMP_VALIDATION_MESSAGE_LEARNER_ALREADY_ADDED_WITH_ANOTHER_PRERAK',
				});
			}

			const count =
				faciltator_camp_data?.data?.camps_aggregate?.aggregate?.count +
				1;
			const formattedCount = count?.toString().padStart(2, '0');
			const campName = `camp${formattedCount}`;

			let create_group_object = {
				name: campName,
				type: 'camp',
				status: 'camp_initiated',
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
					message: 'CAMP_VALIDATION_MESSAGE_CREATING_CAMP_DETAILS',
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
					message: 'CAMP_VALIDATION_MESSAGE_CREATING_USER_FOR_CAMP',
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
				user_type: 'Facilitator',
				context: 'camp.added',
				context_id: camp_id,
				oldData: {
					group_id: group_id,
					status: 'camp_initiated',
					learner_id: [learner_ids],
				},
				newData: {
					group_id: group_id,
					status: 'camp_initiated',
					learner_id: [learner_ids],
				},
				subject: 'camp',
				subject_id: camp_id,
				log_transaction_text: `Facilitator ${facilitator_id} created camp ${camp_id} with learners ${[
					learner_ids,
				]}`,
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
		let status = ['selected_prerak', 'selected_for_onboarding'];

		let query = `query MyQuery {
      users_aggregate(where: {id: {_eq: ${facilitator_id}}, program_faciltators: {status: {_in:${status}}, program_id: {_eq:${facilitator_id_program_id}}, academic_year_id: {_eq:${facilitator_id_academic_id}}}}) {
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
				status
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
			data: newQdata || { camps: [] },
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
				status
			  }
			  faciltator: group_users(where: {member_type: {_eq: "owner"}, status: {_eq: "active"}}) {
				user {
					id
					first_name
					middle_name
					last_name
					mobile
					state
					district
					village
					block
					profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
						id
						name
						doument_type
						document_sub_type
						path
					}
				}
			}
			  properties{
				lat
				long
				street
				state
				district
				block
				village
				grampanchayat
				property_type
				property_facilities
				property_photo_building
				property_photo_classroom
				property_photo_other
				photo_other {
					id
					name
				  }
				  photo_building {
					id
					name
				  }
				  photo_classroom {
					id 
					name
				  }
			  }
			  
			  group_users(where: {member_type: {_neq: "owner"}, status: {_eq: "active"}}) {
				user {
				  id
				  state
				  district
				  block
				  village
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

		if (!newQdata || newQdata?.length == 0) {
			return resp.status(400).json({
				success: false,
				message: 'Camp data not found!',
				data: {},
			});
		}

		const userData = await Promise.all(
			newQdata?.map(async (item) => {
				item.faciltator = await Promise.all(
					item?.faciltator?.map(async (item, key) => {
						const userObj = item.user;
						let profilePhoto = userObj.profile_photo_1?.[0] || {};

						if (profilePhoto?.id) {
							const { success, data: fileData } =
								await this.uploadFileService.getDocumentById(
									profilePhoto.id,
								);
							if (success && fileData?.fileUrl) {
								userObj.profile_photo_1 = {
									...profilePhoto,
									fileUrl: fileData.fileUrl,
								};
							}
						} else {
							userObj.profile_photo_1 = profilePhoto;
						}
						return userObj;
					}),
				);
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
				let properties = item?.properties;
				const { photo_building, photo_classroom, photo_other } =
					item?.properties || {};
				if (photo_building?.id) {
					const { success, data: fileData } =
						await this.uploadFileService.getDocumentById(
							photo_building?.id,
						);
					if (success && fileData?.fileUrl) {
						properties = {
							...properties,
							photo_building: {
								...photo_building,
								fileUrl: fileData?.fileUrl,
							},
						};
					}
				}

				if (photo_classroom?.id) {
					const { success, data: fileData } =
						await this.uploadFileService.getDocumentById(
							photo_classroom?.id,
						);
					if (success && fileData?.fileUrl) {
						properties = {
							...properties,
							photo_classroom: {
								...photo_classroom,
								fileUrl: fileData?.fileUrl,
							},
						};
					}
				}

				if (photo_other?.id) {
					const { success, data: fileData } =
						await this.uploadFileService.getDocumentById(
							photo_other?.id,
						);
					if (success && fileData?.fileUrl) {
						properties = {
							...properties,
							photo_other: {
								...photo_other,
								fileUrl: fileData?.fileUrl,
							},
						};
					}
				}

				return { ...item, properties, group_users };
			}),
		);
		const userResult = userData?.[0];
		if (!userResult?.properties) {
			userResult.properties = {
				lat: null,
				long: null,
				street: null,
				state: null,
				district: null,
				block: null,
				village: null,
				grampanchayat: null,
				property_type: null,
				property_facilities: null,
				property_photo_building: null,
				property_photo_classroom: null,
				property_photo_other: null,
			};
		}
		return resp.status(200).json({
			success: true,
			message: 'Data found successfully!',
			data: userResult || {},
		});
	}

	public async updateCampDetailsForIp(
		id: any,
		body: any,
		request: any,
		response: any,
	) {
		const user = await this.userService.ipUserInfo(request);

		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return response.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}

		let parent_ip_id = user?.data?.program_users?.[0]?.organisation_id;

		// get facilitator for the provided camp id

		let query = `query MyQuery {
			camps(where: {id: {_eq:${id}}, group_users: {member_type: {_eq: "owner"}, status: {_eq: "active"}, user: {program_faciltators: {parent_ip: {_eq: "${parent_ip_id}"}}}}}) {
			  group_users(where: {member_type: {_eq: "owner"}, status: {_eq: "active"}}) {
				user_id
			  }
			}
		  }
		  
		  `;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let facilitator_id =
			hasura_response?.data?.camps?.[0]?.group_users?.[0]?.user_id;

		if (!facilitator_id) {
			return response.json({
				status: 400,
				data: {},
				message: 'CAMP_INVALID_ERROR',
			});
		}

		body.facilitator_id = facilitator_id;
		const data = await this.updateCampDetails(id, body, request, response);
		return response.status(data?.status || 400).json(data);
	}

	public async updateCampDetailsForFacilitatore(
		id: any,
		body: any,
		request: any,
		response: any,
	) {
		body.facilitator_id = request?.mw_userid;

		const data = await this.updateCampDetails(id, body, request, response);
		return response.status(data?.status || 400).json(data);
	}

	public async updateCampDetails(
		id: any,
		body: any,
		request: any,
		response: any,
	) {
		let camp_id = id;
		let facilitator_id = body?.facilitator_id;
		let status = 'active';
		let member_type = 'owner';
		let update_body = body;
		let academic_year_id = body?.academic_year_id || 1;
		let program_id = body?.program_id || 1;
		let audit_logs_details;

		let PAGE_WISE_UPDATE_TABLE_DETAILS = {
			edit_location: {
				properties: [
					'lat',
					'long',
					'street',
					'grampanchayat',
					'state',
					'district',
					'block',
					'village',
					'property_type',
				],
			},
			edit_facilities: {
				properties: ['property_facilities'],
			},
			edit_kit: {
				kit_received: ['kit_received'],
				kit_details: [
					'kit_received',
					'kit_was_sufficient',
					'kit_ratings',
					'kit_feedback',
				],
			},
			edit_photo_details: {
				properties: [
					'property_photo_building',
					'property_photo_classroom',
					'property_photo_other',
				],
			},
			edit_camp_status: {
				groups: ['status'],
			},
		};

		// check if the camp for camp_id exists

		let query = `query MyQuery {
			camps_by_pk(id:${camp_id}) {
			  id
			  group_id
			  property_id
			  kit_received
              kit_was_sufficient
			  kit_ratings
			  kit_feedback
			  properties {
				lat
				long
				street
				state
				district
				block
				village
				grampanchayat
				property_photo_building
				property_photo_classroom
				property_photo_other
				property_facilities
			  }
			  group_users(where: {user_id: {_eq:${facilitator_id}}, member_type: {_eq:${member_type}}, status: {_eq:${status}}}) {
				id
				user_id
				
			  }
			  group{
				id
				status
			  }
			}
		  }
		  
		  `;

		const data = { query: query };
		const hasura_response = await this.hasuraServiceFromServices.getData(
			data,
		);
		const campData = hasura_response?.data.camps_by_pk;

		if (!campData?.id) {
			return {
				status: 400,
				success: false,
				message: 'CAMP_NOT_EXISTS_ERROR',
				data: {},
			};
		}

		if (campData?.group_users[0]?.user_id != facilitator_id) {
			return {
				status: 401,
				success: false,
				message: 'CAMP_UPDATE_ACTION_DENIED',
				data: {},
			};
		}

		let property_id = campData?.property_id;
		let group_id = campData?.group_id;

		if (!property_id) {
			const { data, status, message } = await this.createPropertyDetails(
				camp_id,
				{
					created_by: facilitator_id,
					updated_by: facilitator_id,
				},
				['created_by', 'updated_by'],
			);
			if (status === 500) {
				return {
					status,
					success: false,
					message,
					data,
				};
			} else {
				property_id = data?.property_id;
			}
		}

		switch (update_body.edit_page_type) {
			case 'edit_camp_location': {
				let bodyData = update_body;
				let location_body = {
					...bodyData,
					updated_by: facilitator_id,
				};
				const location_arr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_location.properties;

				//get old data for camp location

				let old_location_body = {
					...campData.properties,
				};

				let new_location_body = {
					...bodyData,
				};

				let auditData = {
					userId: request.mw_userid,
					mw_userid: request.mw_userid,
					user_type: 'Facilitator',
					context: 'camp.update.properties',
					context_id: property_id,
					subject: 'camp',
					subject_id: camp_id,
					log_transaction_text: `Facilitator ${facilitator_id} updated camp location of camp ${camp_id}`,
					oldData: old_location_body,
					newData: new_location_body,
					tempArray: [
						'lat',
						'long',
						'street',
						'state',
						'district',
						'block',
						'village',
						'grampanchayat',
					],
					action: 'update',
				};

				await this.updatepropertyDetails(
					camp_id,
					property_id,
					location_body,
					[...location_arr, 'updated_by'],
					response,
					auditData,
				);

				break;
			}

			case 'edit_kit_details': {
				let camp_body = {
					...update_body,
				};

				let no_kit_body = {
					...update_body,
					kit_was_sufficient: null,
					kit_ratings: null,
					kit_feedback: null,
				};
				const kit_arr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_kit.kit_details;

				let camp_details =
					camp_body.kit_received === 'yes' ? camp_body : no_kit_body;

				let old_kit_details = {
					kit_received: campData?.kit_received,
					kit_was_sufficient: campData?.kit_was_sufficient,
					kit_ratings: campData?.kit_ratings,
					kit_feedback: campData?.kit_feedback,
				};

				let auditData = {
					userId: request.mw_userid,
					user_type: 'Facilitator',
					mw_userid: request.mw_userid,
					context: 'camp.update.kit_details',
					context_id: camp_id,
					subject: 'camp',
					subject_id: camp_id,
					log_transaction_text: `Facilitator ${facilitator_id} updated camp kit details of camp ${camp_id}`,
					oldData: old_kit_details,
					newData: camp_details,
					tempArray: [
						'kit_received',
						'kit_was_sufficient',
						'kit_ratings',
						'kit_feedback',
					],
					action: 'update',
				};

				await this.updateCampData(
					camp_id,
					camp_details,
					kit_arr,
					response,
					auditData,
				);

				break;
			}

			case 'edit_photo_details': {
				const photo_details_arr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_photo_details
						.properties;
				let photo_details_body = {
					...update_body,
					updated_by: facilitator_id,
				};

				let old_photos_details = {
					property_photo_building:
						campData?.properties?.property_photo_building,
					property_photo_classroom:
						campData?.properties?.property_photo_classroom,
					property_photo_other:
						campData?.properties?.property_photo_other,
				};

				let auditData = {
					userId: request.mw_userid,
					user_type: 'Facilitator',
					mw_userid: request.mw_userid,
					context: 'camp.update.property.photos',
					context_id: property_id,
					subject: 'camp',
					subject_id: camp_id,
					log_transaction_text: `Facilitator ${facilitator_id} updated camp photos of camp ${camp_id}`,
					oldData: old_photos_details,
					newData: photo_details_body,
					tempArray: [
						'property_photo_building',
						'property_photo_classroom',
						'property_photo_other',
					],
					action: 'update',
				};

				await this.updatepropertyDetails(
					camp_id,
					property_id,
					photo_details_body,
					[...photo_details_arr, 'updated_by'],
					response,
					auditData,
				);
				break;
			}

			case 'edit_property_facilities': {
				let camp_facilities = {
					property_facilities: update_body?.property_facilities
						? JSON.stringify(
								update_body.property_facilities,
						  ).replace(/"/g, '\\"')
						: '',
				};
				const facilities_arr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_facilities.properties;

				let old_facilities_body = {
					property_facilities: JSON.parse(
						campData?.properties?.property_facilities,
					),
				};

				let auditData = {
					userId: request.mw_userid,
					user_type: 'Facilitator',
					mw_userid: request.mw_userid,
					context: 'camp.update.property.facilities',
					context_id: property_id,
					subject: 'camp',
					subject_id: camp_id,
					log_transaction_text: `Facilitator ${facilitator_id} updated camp facilities of camp ${camp_id}`,
					oldData: old_facilities_body,
					newData: update_body,
					tempArray: ['property_facilities'],
					action: 'update',
				};

				await this.updatepropertyDetails(
					camp_id,
					property_id,
					{ ...camp_facilities, updated_by: facilitator_id },
					[...facilities_arr, 'updated_by'],
					response,
					auditData,
				);

				break;
			}

			case 'edit_learners': {
				let learner_ids = body?.learner_ids;
				let resultCreate = [];
				let resultActive = [];
				let resultInactive = [];
				let qury = `query MyQuery {
					camps_by_pk(id:${camp_id})  {
					group_id
					group {
						id
						status
					  }
					  group_users(where:{member_type:{_eq:"member"}}){
						id
						user_id
						status
					  }
					}
				  }
				  `;
				const qdata = { query: qury };

				const res = await this.hasuraServiceFromServices.getData(qdata);
				const group_id = res?.data?.camps_by_pk?.group_id;
				const camp_status = res?.data?.camps_by_pk?.group?.status;
				const group_users = res?.data?.camps_by_pk?.group_users;
				const returnFields = [
					'status',
					'member_type',
					'user_id',
					'created_by',
					'updated_by',
				];

				// add new beneficiary Ids
				const createData = learner_ids
					.filter(
						(id) =>
							!group_users.filter((item) => item.user_id === id)
								.length,
					)
					.map((user_id) => ({
						status: 'active',
						member_type: 'member',
						user_id,
						group_id,
						created_by: facilitator_id,
						updated_by: facilitator_id,
					}));

				//get primary id of user_id to be deactivated
				const deactivateIds = group_users
					.filter(
						(item) =>
							item.status === 'active' &&
							!learner_ids.includes(item.user_id),
					)
					.map((item) => item.id);

				//get learner_ids that is user_id to be deactivated
				const deactiveLearnerIds = group_users
					.filter(
						(item) =>
							item.status === 'active' &&
							!learner_ids.includes(item.user_id),
					)
					.map((item) => item.user_id);

				if (deactivateIds.length > 0 && camp_status == 'registered') {
					return {
						status: 422,
						message:
							'Cannot remove learners from a registered camp',
						data: {
							ids: deactiveLearnerIds,
						},
					};
				}

				if (createData?.length > 0) {
					resultCreate = await this.hasuraServiceFromServices.qM(
						'insert_group_users',
						createData,
						[],
						returnFields,
					);
				}

				const createAuditData = learner_ids
					.filter(
						(id) =>
							!group_users.filter((item) => item.user_id === id)
								.length,
					)
					.map((user_id) => ({
						user_id: facilitator_id,
						user_type: 'Facilitator',
						updated_by_user: facilitator_id,
						context: 'campBeneficiaryAdded',
						context_id: camp_id,
						subject: 'beneficiary',
						subject_id: user_id,
						log_transaction_text: JSON.stringify(
							`Facilitator ${facilitator_id} added beneficiary ${user_id}to camp ${camp_id}`,
						),
						old_data: '"{}"',
						new_data: JSON.stringify(`{ learner_id: ${user_id} }`),
						action: 'create',
					}));

				if (createAuditData?.length > 0) {
					resultCreate = await this.hasuraServiceFromServices.qM(
						'insert_audit_logs',
						createAuditData,
						[],
						['id'],
					);
				}

				// update inactive to active user
				const activeIds = group_users
					.filter(
						(item) =>
							learner_ids.includes(item.user_id) &&
							item.status === 'inactive',
					)
					.map((item) => item.id);

				if (activeIds?.length > 0) {
					resultActive = await this.hasuraServiceFromServices.update(
						null,
						'group_users',
						{
							status: 'active',
							updated_by: facilitator_id,
						},
						[],
						returnFields,
						{ where: `{id:{_in:[${activeIds}]}}` },
					);
				}

				const activeIdsAuditData = group_users
					.filter(
						(item) =>
							learner_ids.includes(item.user_id) &&
							item.status === 'inactive',
					)
					.map((item) => ({
						user_id: facilitator_id,
						user_type: 'Facilitator',
						updated_by_user: facilitator_id,
						context: 'campBeneficiaryActivated',
						context_id: camp_id,
						subject: 'beneficiary',
						subject_id: item.user_id,
						log_transaction_text: JSON.stringify(
							`Facilitator ${facilitator_id} added beneficiary  ${item.user_id} back to camp ${camp_id}`,
						),
						old_data: JSON.stringify(
							`{ learner_id: ${item.user_id},status:"inactive" }`,
						),
						new_data: JSON.stringify(
							`{ learner_id: ${item.user_id},status:"active }`,
						),
						action: 'create',
					}));

				if (activeIdsAuditData?.length > 0) {
					resultCreate = await this.hasuraServiceFromServices.qM(
						'insert_audit_logs',
						activeIdsAuditData,
						[],
						['id'],
					);
				}

				// update active to inactive user

				if (deactivateIds?.length > 0) {
					resultInactive =
						await this.hasuraServiceFromServices.update(
							null,
							'group_users',
							{
								status: 'inactive',
								updated_by: facilitator_id,
							},
							[],
							returnFields,
							{
								where: `{id:{_in:[${deactivateIds}]}}`,
							},
						);
				}

				const deactiveLearnerIdsAuditData = group_users
					.filter(
						(item) =>
							item.status === 'active' &&
							!learner_ids.includes(item.user_id),
					)
					.map((item) => ({
						user_id: facilitator_id,
						user_type: 'Facilitator',
						updated_by_user: facilitator_id,
						context: 'campBeneficiariesRemoved',
						context_id: camp_id,
						subject: 'beneficiary',
						subject_id: item.user_id,
						log_transaction_text: JSON.stringify(
							`Facilitator ${facilitator_id} removed beneficiary  ${item.user_id} from camp ${camp_id}`,
						),
						old_data: JSON.stringify(
							`{ learner_id: ${item.user_id},status:"active" }`,
						),
						new_data: JSON.stringify(
							`{ learner_id: ${item.user_id},status:"inactive" }`,
						),
						action: 'create',
					}));

				if (deactiveLearnerIdsAuditData?.length > 0) {
					resultCreate = await this.hasuraServiceFromServices.qM(
						'insert_audit_logs',
						deactiveLearnerIdsAuditData,
						[],
						['id'],
					);
				}

				if (learner_ids?.length > 0) {
					let update_beneficiaries_array = [];
					let status = 'enrolled_ip_verified';
					body.program_id = program_id;
					body.academic_year_id = academic_year_id;
					for (const learnerId of learner_ids) {
						let result =
							await this.beneficiariesCoreService.getBeneficiaryDetailsById(
								learnerId,
								status,
								body,
							);
						update_beneficiaries_array.push(result);
					}

					const update_body = {
						status: 'registered_in_camp',
					};

					await this.beneficiariesCoreService.updateBeneficiaryDetails(
						update_beneficiaries_array,
						update_body,
					);
				}

				if (deactiveLearnerIds?.length > 0) {
					let update_beneficiaries_array = [];
					let status = 'registered_in_camp';
					body.program_id = program_id;
					body.academic_year_id = academic_year_id;
					for (const deactivateId of deactiveLearnerIds) {
						let result =
							await this.beneficiariesCoreService.getBeneficiaryDetailsById(
								deactivateId,
								status,
								body,
							);
						update_beneficiaries_array.push(result);
					}

					const update_body = {
						status: 'enrolled_ip_verified',
					};

					await this.beneficiariesCoreService.updateBeneficiaryDetails(
						update_beneficiaries_array,
						update_body,
					);
				}

				return {
					status: 200,
					success: true,
					message: 'Successfully updated camp details',
					data: { resultCreate, resultActive, resultInactive },
				};
			}

			case 'edit_camp_status': {
				let program_id = update_body?.program_id
					? update_body?.program_id
					: 1;

				let academic_year_id = update_body.academic_year_id
					? update_body?.academic_year_id
					: 1;

				let query = `
				query MyQuery {
					camps(where: {id: {_eq:${camp_id}}, group: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}}) {
					  kit_received
					  properties {
						lat
						long
						state
						district
						block
						village
						property_type
						property_facilities
					  }
					}
				  }
				  `;
				const qdata = { query: query };

				const res = await this.hasuraServiceFromServices.getData(qdata);

				if (res?.data?.camps?.length == 0) {
					return {
						status: 400,
						success: false,
						message: 'INVALID_CAMP_ERROR',
						data: {},
					};
				}
				let { kit_received, properties } = res?.data?.camps[0] ?? {
					kit_received: null,
					properties: null,
				};

				if (kit_received == 'no' || kit_received == null) {
					return {
						status: 400,
						success: false,
						message: 'Please fill valid kit details',
						data: {},
					};
				} else if (!properties?.property_facilities) {
					return {
						status: 400,
						success: false,
						message:
							'Please fill valid property facilities details',
						data: {},
					};
				} else if (
					!properties?.lat ||
					!properties.long ||
					!properties.district ||
					!properties.block ||
					!properties.state ||
					!properties.village ||
					!properties.property_type
				) {
					return {
						status: 400,
						success: false,
						message: 'Please fill valid location details',
						data: {},
					};
				} else if (group_id) {
					let group_update_body = {
						status: update_body?.status,
						updated_by: facilitator_id,
					};
					const group_update_array =
						PAGE_WISE_UPDATE_TABLE_DETAILS.edit_camp_status.groups;
					await this.hasuraService.q(
						'groups',
						{
							...group_update_body,
							id: group_id,
						},
						group_update_array,
						true,
						[...this.returnFieldsGroups, 'id', 'status'],
					);

					let old_camp_status = {
						status: campData?.group?.status,
					};
					let auditData = {
						userId: facilitator_id,
						mw_userid: facilitator_id,
						user_type: 'Facilitator',
						context: 'camp.update.status',
						context_id: camp_id,
						subject: 'camp',
						subject_id: camp_id,
						log_transaction_text: `Facilitator ${facilitator_id} updated camp status of camp ${camp_id}`,
						oldData: old_camp_status,
						newData: group_update_body,
						tempArray: ['status'],
						action: 'update',
					};

					//add audit logs
					await this.userService.addAuditLogAction(auditData);

					return {
						status: 200,
						success: true,
						message: 'Successfully updated camp details',
						data: camp_id,
					};
				} else {
					return {
						status: 400,
						success: false,
						message: 'CAMP_UPDATE_FAILURE_ERROR',
						data: {},
					};
				}
			}
		}
	}

	async createPropertyDetails(camp_id: any, body: any, create_arr: any) {
		let create_response = await this.hasuraService.q(
			'properties',
			body,
			create_arr,
			false,
			[...this.returnFieldsProperties, 'id'],
		);

		let property_id = create_response?.properties?.id;

		if (!property_id) {
			return {
				status: 500,
				message: 'Error creating property details',
				data: {},
			};
		}

		const camp_update_body = {
			property_id: property_id,
		};

		const update_response = await this.hasuraService.q(
			'camps',
			{
				...camp_update_body,
				id: camp_id,
			},
			[],
			true,
			[...this.returnFieldscamps, 'property_id', 'id'],
		);

		const update_camp_id = update_response?.camps?.id;

		if (!update_camp_id) {
			if (property_id) {
				await this.hasuraService.delete('properties', {
					id: property_id,
				});
			}

			return {
				status: 500,
				message: 'Error updating camps property details',
				data: {},
			};
		}

		return {
			status: 200,
			message: 'Updated camp details successfully  ',
			data: update_response?.camps,
		};
	}

	async updatepropertyDetails(
		camp_id: any,
		property_id: any,
		body: any,
		update_array: any,
		response: any,
		auditData: any,
	) {
		await this.hasuraService.q(
			'properties',
			{
				...body,
				id: property_id,
			},
			update_array,
			true,
			[...this.returnFieldsProperties, 'id'],
		);

		let audit = await this.userService.addAuditLogAction(auditData);

		return response.json({
			status: 200,
			message: 'Successfully updated camp details',
			data: camp_id,
		});
	}

	async updateCampData(
		camp_id: any,
		camp_body: any,
		update_arr: any,
		response: any,
		auditData: any,
	) {
		await this.hasuraService.q(
			'camps',
			{
				...camp_body,
				id: camp_id,
			},
			update_arr,
			true,
			[...this.returnFieldscamps, 'id'],
		);

		//add audit logs
		await this.userService.addAuditLogAction(auditData);

		return response.json({
			status: 200,
			message: 'Successfully updated camp details',
			data: camp_id,
		});
	}

	//Create Consents
	async createConsentBenficiaries(body: any, request: any, resp: any) {
		let user_id = body?.user_id;
		let camp_id = body?.camp_id;
		let facilitator_id = body?.facilitator_id;
		let program_id = body?.program_id || 1;
		let academic_year_id = body?.academic_year_id || 1;
		let document_id = body?.document_id;

		let response;

		const tableName = 'consents';
		let query = `query MyQuery {
			consents(where: {user_id: {_eq:${user_id}},status:{_eq:"active"}, facilitator_id: {_eq:${facilitator_id}},camp_id: {_eq:${camp_id}},academic_year_id: {_eq:${academic_year_id}},program_id: {_eq:${program_id}}}) {
			  id
			  document_id
			  document{
				id
				name
			  }
			}
		  }`;
		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		let consent_id = hasura_response?.data?.consents?.[0]?.id;
		let consent_document_id =
			hasura_response?.data.consents?.[0]?.document_id;

		if (document_id != consent_document_id) {
			let consent_document_name =
				hasura_response?.data.consents?.[0]?.document?.name;
			if (consent_document_name) {
				try {
					await this.s3Service.deletePhoto(consent_document_name);
				} catch (e) {}
			}
			await this.hasuraService.delete('documents', {
				id: consent_document_id,
			});
		}

		if (consent_id) {
			response = await this.hasuraService.q(
				tableName,
				{
					...body,
					id: consent_id,
				},
				['document_id', 'camp_id'],
				true,
				[
					...this.returnFieldsconsents,
					'id',
					'user_id',
					'document_id',
					'camp_id',
					'facilitator_id',
				],
			);
		} else {
			response = await this.hasuraServiceFromServices.create(
				tableName,
				{
					...body,
					program_id,
					academic_year_id,
					user_id,
					facilitator_id,
					updated_by: facilitator_id,
					created_by: facilitator_id,
					status: 'active',
				},
				[
					'user_id',
					'program_id',
					'academic_year_id',
					'document_id',
					'camp_id',
					'facilitator_id',
					'created_by',
					'updated_by',
					'status',
				],
				['id', 'user_id', 'document_id', 'camp_id', 'facilitator_id'],
			);
		}

		const consent_response = response?.consents;

		if (!consent_response?.id) {
			return resp.status(400).json({
				success: false,
				message: 'consents data not found!',
				data: response,
			});
		} else {
			return resp.json({
				status: 200,
				message: 'Successfully updated consents details',
				data: { consent_response },
			});
		}
	}

	async createConsentBenficiariesForAdmin(
		body: any,
		request: any,
		response: any,
	) {
		const user = await this.userService.ipUserInfo(request);
		const camp_id = body?.camp_id;

		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return response.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}

		let parent_ip_id = user?.data?.program_users?.[0]?.organisation_id;

		// get facilitator for the provided camp id

		let query = `query MyQuery {
			camps(where: {id: {_eq:${camp_id}}, group_users: {member_type: {_eq: "owner"}, status: {_eq: "active"}, user: {program_faciltators: {parent_ip: {_eq: "${parent_ip_id}"}}}}}) {
			  group_users(where: {member_type: {_eq: "owner"}, status: {_eq: "active"}}) {
				user_id
			  }
			}
		  }
		  
		  `;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let facilitator_id =
			hasura_response?.data?.camps?.[0]?.group_users?.[0]?.user_id;

		if (!facilitator_id) {
			return response.json({
				status: 400,
				data: {},
				message: 'CAMP_INVALID_ERROR',
			});
		}

		body.facilitator_id = facilitator_id;
		await this.createConsentBenficiaries(body, request, response);
	}

	async createConsentBenficiariesForFacilitator(
		body: any,
		request: any,
		response: any,
	) {
		body.facilitator_id = request?.mw_userid;

		await this.createConsentBenficiaries(body, request, response);
	}

	async getConsentBenficiariesForFacilitators(
		body: any,
		request: any,
		response: any,
	) {
		body.facilitator_id = request?.mw_userid;
		await this.getConsentBenficiaries(body, request, response);
	}
	//Get consents List
	async getConsentBenficiaries(body: any, request: any, resp: any) {
		let camp_id = body?.camp_id;
		let facilitator_id = body?.facilitator_id;
		let program_id = body?.program_id || 1;
		let academic_year_id = body?.academic_year_id || 1;

		let query = `query MyQuery {
			consents(where: {facilitator_id: {_eq:${facilitator_id}},camp_id: {_eq:${camp_id}}, status: {_eq: "active"},academic_year_id: {_eq:${academic_year_id}},program_id: {_eq:${program_id}}}) {
			  id
			  document_id
			  user_id
			  document{
				id
				name
			  }
			}
		  }`;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const consent_response = hasura_response?.data;
		if (!consent_response?.consents?.length) {
			return resp.status(200).json({
				success: true,
				message: 'consents data not found!',
				data: {},
			});
		} else {
			const resultData = await Promise.all(
				consent_response?.consents?.map(async (item) => {
					if (item?.document?.name) {
						item.document.fileUrl = await this.s3Service.getFileUrl(
							item.document.name,
						);
					}
					return item;
				}),
			);
			return resp.json({
				status: 200,
				message: 'Successfully updated consents details',
				data: resultData,
			});
		}
	}

	async getAdminConsentBenficiaries(body: any, request: any, resp: any) {
		let camp_id = body?.camp_id;

		const user = await this.userService.ipUserInfo(request);

		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}

		//get facilitator_id from camp_id

		let parent_ip_id = user?.data?.program_users?.[0]?.organisation_id;

		// get facilitator for the provided camp id

		let query = `query MyQuery {
			camps(where: {id: {_eq:${camp_id}}, group_users: {user: {program_faciltators: {parent_ip: {_eq: "${parent_ip_id}"}}}}}) {
			  group_users(where: {member_type: {_eq: "owner"}, status: {_eq: "active"}}) {
				user_id
			  }
			}
		  }
		  
		  `;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let facilitator_id =
			hasura_response?.data?.camps?.[0]?.group_users?.[0]?.user_id;

		if (!facilitator_id) {
			return resp.json({
				status: 400,
				data: {},
				message: 'CAMP_INVALID_ERROR',
			});
		}

		body.facilitator_id = facilitator_id;

		//check if faciltator comes under given IP

		let qury = `query MyQuery {
			users(where: {program_faciltators: {parent_ip: {_eq:"${user?.data?.program_users?.[0]?.organisation_id}"}, user_id: {_eq:${facilitator_id}}}}){
			  id
			}
		  }
		  `;
		const validation_response =
			await this.hasuraServiceFromServices.getData({
				query: qury,
			});
		const users = validation_response?.data?.users;
		if (users?.length == 0) {
			return resp.json({
				status: 401,
				message: 'IP access denied for this faciltator',
				data: [],
			});
		}

		await this.getConsentBenficiaries(body, request, resp);
	}

	async updateCampStatus(id: any, body: any, req: any, resp: any) {
		let facilitator_id = body?.facilitator_id;
		let camp_id = id;

		const user = await this.userService.ipUserInfo(req);

		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}

		let ip_id = user?.data?.id;

		const facilitator_validation_query = `query MyQuery {
				users_aggregate(where: {id: {_eq:${facilitator_id}},program_faciltators: {user_id: {_is_null: false}, parent_ip: {_eq: "${user?.data?.program_users[0]?.organisation_id}"}}}) {
				  aggregate {
					count
				  }
				}
			  }
			  `;

		const facilitator_validation_data = {
			query: facilitator_validation_query,
		};
		const facilitator_data = await this.hasuraServiceFromServices.getData(
			facilitator_validation_data,
		);

		if (facilitator_data?.data?.users_aggregate?.aggregate.count < 1) {
			return resp.json({
				status: 401,
				success: false,
				message: 'Faciltator doesnt belong to IP',
				data: {},
			});
		}

		let query = `query MyQuery {
			camps_by_pk(id:${camp_id}) {
			   group_users(where: {member_type: {_eq: "owner"}, user_id: {_eq: ${facilitator_id}}}) {
				group {
				  id
				}
			  }
			}
		  }`;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const group_id =
			hasura_response?.data?.camps_by_pk?.group_users?.[0]?.group?.id;

		if (!group_id) {
			return resp.json({
				status: 400,
				message: 'CAMP_INVALID_ERROR',
				data: [],
			});
		} else {
			let group_update_body = {
				status: body?.status,
				updated_by: ip_id,
			};
			const group_update_array = ['status'];

			await this.hasuraService.q(
				'groups',
				{
					...group_update_body,
					id: group_id,
				},
				group_update_array,
				true,
				[...this.returnFieldsGroups, 'id', 'status'],
			);

			return resp.json({
				status: 200,
				message: 'Successfully updated camp details',
				data: camp_id,
			});
		}
	}

	async getCampList(body: any, req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}
		body.parent_ip_id = user?.data?.program_users?.[0]?.organisation_id;
		const data = await this.campcoreservice.list(body);

		if (data) {
			return resp.json({
				status: 200,
				message: 'Camp Data Found Successfully',
				data: data,
			});
		} else {
			return resp.json({
				status: 500,
				message: 'IP_CAMP_LIST_ERROR',
				data: {},
			});
		}
	}

	async getCampDetailsForAdmin(id: any, req: any, resp: any) {
		let camp_id = id;
		try {
			if (!camp_id) {
				return resp.json({
					status: 400,
					message: 'INVALID_CAMP_DETAILS_INPUT_ERROR',
					data: [],
				});
			}
			const user = await this.userService.ipUserInfo(req);

			if (!user?.data?.program_users?.[0]?.organisation_id) {
				return resp.status(404).send({
					success: false,
					message: 'Invalid Ip',
					data: {},
				});
			}

			let query = `query MyQuery {
				camps_by_pk(id:${camp_id}) {
					id
					kit_received
					kit_was_sufficient
					kit_ratings
					kit_feedback
				  group {
						name
						status
					}
					faciltator: group_users(where: {member_type: {_eq: "owner"}, status: {_eq: "active"}}) {
						user {
							id
							first_name
							middle_name
							last_name
							mobile
							state
							district
							village
							block
							profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
								id
								name
								doument_type
								document_sub_type
								path
							}
						}
					}
					beneficiaries: group_users(where: {member_type: {_eq: "member"}, status: {_eq: "active"}}) {
						user {
							id
							first_name
							middle_name
							last_name
							mobile
							state
							district
							block
							village
							lat
							long
							profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
								id
								name
								doument_type
								document_sub_type
								path
							}
							program_beneficiaries{
								enrollment_number
								enrollment_first_name
								enrollment_middle_name
								enrollment_last_name
							}
							
						}
					}
					properties {
						lat
						long
						state
						district
						village
						block
						street
						property_type
						landmark
						grampanchayat
						property_facilities
						property_photo_building
						property_photo_classroom
						property_photo_other
						photo_other {
							id
							name
						}
						photo_building {
							id
							name
						}
						photo_classroom {
							id
							name
						}
					}
			  }
			}`;

			const hasura_response =
				await this.hasuraServiceFromServices.getData({
					query: query,
				});
			const {
				data: { camps_by_pk: camp },
			} = hasura_response || {};

			camp.faciltator = await Promise.all(
				camp?.faciltator?.map(async (item, key) => {
					const userObj = item.user;
					let profilePhoto = userObj.profile_photo_1?.[0] || {};

					if (profilePhoto?.id) {
						const { success, data: fileData } =
							await this.uploadFileService.getDocumentById(
								profilePhoto.id,
							);
						if (success && fileData?.fileUrl) {
							userObj.profile_photo_1 = {
								...profilePhoto,
								fileUrl: fileData.fileUrl,
							};
						}
					} else {
						userObj.profile_photo_1 = profilePhoto;
					}
					return userObj;
				}),
			);

			camp.beneficiaries = await Promise.all(
				camp?.beneficiaries?.map(async (item, key) => {
					const userObj = item.user;
					let profilePhoto = userObj.profile_photo_1?.[0] || {};

					if (profilePhoto?.id) {
						const { success, data: fileData } =
							await this.uploadFileService.getDocumentById(
								profilePhoto.id,
							);
						if (success && fileData?.fileUrl) {
							userObj.profile_photo_1 = {
								...profilePhoto,
								fileUrl: fileData.fileUrl,
							};
						}
					} else {
						userObj.profile_photo_1 = profilePhoto;
					}
					return userObj;
				}),
			);
			let properties = camp?.properties || {};

			if (properties) {
				await Promise.all(
					['photo_building', 'photo_classroom', 'photo_other'].map(
						async (item) => {
							const photo = properties?.[item] || {};
							if (photo?.id) {
								const { success, data: fileData } =
									await this.uploadFileService.getDocumentById(
										photo?.id,
									);
								if (success && fileData?.fileUrl) {
									camp.properties[item] = {
										...photo,
										fileUrl: fileData?.fileUrl,
									};
								} else {
									camp.properties[item] = {};
								}
							}
						},
					),
				);
			}

			properties = {
				lat: null,
				long: null,
				street: null,
				state: null,
				district: null,
				block: null,
				village: null,
				grampanchayat: null,
				property_type: null,
				property_facilities: null,
				property_photo_building: null,
				property_photo_classroom: null,
				property_photo_other: null,
			};
			camp.properties = {
				...properties,
				...(camp?.properties || {}),
			};

			if (camp) {
				return resp.json({
					status: 200,
					message: 'Camp Data Found Successfully',
					data: { camp },
				});
			} else {
				return resp.json({
					status: 404,
					message: 'IP_CAMP_NOT_FOUND_ERROR',
					data: { camp: {} },
				});
			}
		} catch (error) {
			return resp.json({
				status: 500,
				message: 'IP_CAMP_DETAILS_ERROR' + error?.message,
				data: {},
			});
		}
	}

	async markCampAttendance(body: any, req: any, resp: any) {
		const camp_attendance_body = {
			...body,
			context: 'camps',
		};

		const response = await this.attendancesService.createAttendance(
			camp_attendance_body,
			req,
			resp,
		);

		if (!response?.attendance?.id) {
			return resp.json({
				status: 500,
				message: 'CAMP_ATTENDANCE_ERROR',
				data: {},
			});
		} else {
			return resp.json({
				status: 200,
				message: 'CAMP_ATTENDANCE_SUCCESS',
				data: response,
			});
		}
	}

	async updateCampAttendance(id: any, body: any, req: any, resp: any) {
		let UPDATE_TABLE_DETAILS = {
			edit_attendance: {
				attendance: ['lat', 'long', 'status', 'photo_1', 'photo_2'],
			},
		};

		// Update the camp_attendance_body object with the retrieved names
		const camp_attendance_body = {
			...body,
		};

		let attendance_array = UPDATE_TABLE_DETAILS.edit_attendance.attendance;
		const response = await this.attendancesService.updateAttendance(
			id,
			camp_attendance_body,
			[...attendance_array, 'updated_by'],
			req,
			resp,
		);

		if (!response?.attendance?.id) {
			return resp.json({
				status: 500,
				message: 'CAMP_ATTENDANCE_ERROR',
				data: {},
			});
		} else {
			return resp.json({
				status: 200,
				message: 'CAMP_ATTENDANCE_SUCCESS',
				data: response,
			});
		}
	}

	async getCampAttendanceById(id, body, req, res) {
		let camp_attendance_body = { ...body };

		const setStartAndEndDate = () => {
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Set the time to the beginning of the day (00:00:00.000).

			const year = today.getFullYear();
			const month = (today.getMonth() + 1).toString().padStart(2, '0');
			const day = today.getDate().toString().padStart(2, '0');

			return `${year}-${month}-${day}`;
		};

		if (
			(!camp_attendance_body.end_date &&
				!camp_attendance_body.start_date) ||
			(camp_attendance_body.start_date === '' &&
				camp_attendance_body.end_date === '')
		) {
			const formattedDate = setStartAndEndDate();
			camp_attendance_body.start_date = formattedDate + `T00:00:00.000Z`;
			camp_attendance_body.end_date = formattedDate + `T23:59:59.999Z`;
		} else if (
			camp_attendance_body?.start_date &&
			camp_attendance_body?.end_date
		) {
			camp_attendance_body.start_date = `${camp_attendance_body.start_date}T00:00:00.000Z`;
			camp_attendance_body.end_date = `${camp_attendance_body.end_date}T23:59:59.999Z`;
		} else {
			if (
				!camp_attendance_body.start_date ||
				camp_attendance_body.start_date === ''
			) {
				const formattedStartDate = setStartAndEndDate();
				camp_attendance_body.start_date =
					formattedStartDate + `T00:00:00.000Z`;
				camp_attendance_body.end_date = `${camp_attendance_body.end_date}T23:59:59.999Z`;
			}

			if (
				!camp_attendance_body.end_date ||
				camp_attendance_body.end_date === ''
			) {
				const formattedDate = setStartAndEndDate();
				camp_attendance_body.end_date =
					formattedDate + `T23:59:59.999Z`;
				camp_attendance_body.start_date = `${camp_attendance_body.start_date}T00:00:00.000Z`;
			}
		}

		let response = await this.attendancesService.getCampAttendance(
			id,
			camp_attendance_body,
			req,
			res,
		);

		let attendance_data = response?.data?.attendance;

		if (attendance_data?.length == 0) {
			return res.json({
				status: 200,
				message: 'ATTENDANCE_DATA_NOT_FOUND',
				data: [],
			});
		} else {
			return res.json({
				status: 200,
				message: 'ATTENDANCE_DATA_FOUND_SUCCESS',
				data: attendance_data,
			});
		}
	}

	async getAttendanceList(body, req, res) {
		let attendance_body = { ...body };

		if (attendance_body?.start_date && attendance_body?.end_date) {
			attendance_body.start_date = `${attendance_body.start_date}T00:00:00.000Z`;
			attendance_body.end_date = `${attendance_body.end_date}T23:59:59.999Z`;
		}

		let response = await this.attendancesService.getAttendances(
			attendance_body,
			req,
			res,
		);

		let attendance_data = response;

		if (attendance_data?.length == 0) {
			return res.json({
				status: 200,
				message: 'ATTENDANCE_DATA_NOT_FOUND',
				data: [],
			});
		} else {
			return res.json({
				status: 200,
				message: 'ATTENDANCE_DATA_FOUND_SUCCESS',
				data: attendance_data,
			});
		}
	}

	public async getStatuswiseCount(req: any, body: any, resp: any) {
		const status = this.enumService
			.getEnumValue('GROUPS_STATUS')
			.data.map((item) => item.value);

		const variables: any = {};

		let filterQueryArray = [];

		if (body.search && body.search !== '') {
			filterQueryArray.push(`{_or: [
        { first_name: { _ilike: "%${body.search}%" } },
        { last_name: { _ilike: "%${body.search}%" } },
        { email_id: { _ilike: "%${body.search}%" } }
      ]} `);
		}

		if (body?.district && body?.district.length > 0) {
			filterQueryArray.push(
				`{properties:{district:{_in: ${JSON.stringify(
					body?.district,
				)}}}}`,
			);
		}

		if (body?.block && body?.block.length > 0) {
			filterQueryArray.push(
				`{properties:{block:{_in: ${JSON.stringify(body?.block)}}}}`,
			);
		}
		if (body.facilitator && body.facilitator.length > 0) {
			filterQueryArray.push(
				`{group_users: {user:{id:{_in: ${JSON.stringify(
					body.facilitator,
				)}}}}}`,
			);
		}

		let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';

		const response = await this.campcoreservice.getStatuswiseCount(
			filterQuery,
			filterQueryArray,
			status,
			variables,
		);

		const newQdata = response?.data;
		const res = ['all', ...status].map((item) => {
			return {
				status: item,
				count: newQdata?.[item]?.aggregate?.count,
			};
		});

		return resp.status(200).json({
			success: true,
			message: 'Data found successfully!',
			data: res,
		});
	}

	async getFilter_By_Camps(body: any, req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}
		body.parent_ip_id = user?.data?.program_users?.[0]?.organisation_id;
		const data = await this.campcoreservice.list(body);

		const faciltatorIds = new Set();
		data?.camps?.forEach((item) => {
			if (item?.faciltator?.user?.faciltator_id) {
				faciltatorIds.add(item.faciltator.user.faciltator_id);
			}
		});

		// Convert the Set to an array if needed
		const uniqueFaciltatorIds = [...faciltatorIds];

		let searchQuery = '';
		if (body.search && body.search !== '') {
			let first_name = body.search.split(' ')[0];
			let last_name = body.search.split(' ')[1] || '';

			if (last_name?.length > 0) {
				searchQuery = `_and:[{first_name: { _ilike: "%${first_name}%" }}, {last_name: { _ilike: "%${last_name}%" }}],`;
			} else {
				searchQuery = `_or:[{first_name: { _ilike: "%${first_name}%" }}, {last_name: { _ilike: "%${first_name}%" }}],`;
			}
		}
		const query = `query MyQuery{
				users(where:{id:{_in:[${uniqueFaciltatorIds}]},${searchQuery}}){
					id
					first_name
					last_name
				}
			}`;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		if (hasura_response?.data?.users) {
			return resp.json({
				status: 200,
				message: 'Camp Data Found Successfully',
				data: hasura_response?.data || { users: [] },
			});
		} else {
			return resp.json({
				status: 500,
				message: 'IP_CAMP_LIST_ERROR',
				data: {},
			});
		}
	}

	async reassignBeneficiarytoCamp(id: any, body: any, req: any, resp: any) {
		let camp_id = id;
		let academic_year_id = body?.academic_year_id || 1;
		let program_id = body?.program_id || 1;
		let create_response;
		let update_response;
		const user = await this.userService.ipUserInfo(req);
		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}
		let ip_id = user?.data?.program_users?.[0]?.organisation_id;

		//validation to check if camp already have the user to be assigned
		let query = `query MyQuery {
			camps(where: {id: {_eq: ${camp_id}}, group: {academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq:${program_id}}}}) {
			  group {
				id
				group_users(where: {user_id: {_eq:${body?.learner_id}}, member_type: {_eq: "member"}, status: {_eq: "active"}}) {
				  id
				  user_id
				  status
				}
			  }
			}
		  }
		  
		  `;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let result = hasura_response?.data?.camps?.[0];

		if (result?.group?.group_users?.length > 0) {
			return resp.json({
				status: 401,
				success: false,
				message: 'DUPLICATE_CAMP_BENEFICIARY_ASSIGNMENT',
				data: {},
			});
		} else {
			let new_group_id = result?.group?.id;

			//get old group_id for the learner to be reassigned to new camp

			let query3 = `query MyQuery {
				group_users(where: {user_id: {_eq:${body?.learner_id} }, status: {_eq: "active"}, member_type: {_eq: "member"}, group: {academic_year_id: {_eq:${academic_year_id} }, program_id: {_eq:${program_id}}}}) {
				  group_id
				  group{
					group_users_aggregate(where:{user_id:{_neq:${body?.learner_id}}, member_type:{_eq:"member"},status:{_eq:"active"}}){
					  aggregate{
						count
					  }
					}
				  }
				  camps {
					id
					consents(where: {_or: [{status: {_eq: "active"}}, {status: {_is_null: true}}],program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}} ,user_id: {_eq:${body?.learner_id}}}) {
					  id
					}
				  }
				}
			  }
			  `;

			const old_camp_details_repsonse =
				await this.hasuraServiceFromServices.getData({
					query: query3,
				});

			let old_group_id =
				old_camp_details_repsonse?.data?.group_users?.[0].group_id;

			let old_consent_id =
				old_camp_details_repsonse?.data?.group_users?.[0]?.camps
					?.consents?.[0]?.id;

			let old_camp_id =
				old_camp_details_repsonse?.data?.group_users?.[0]?.camps?.id;

			let query = `query MyQuery {
				group_users(where: {user_id: {_eq:${body?.learner_id}},member_type:{_eq:"member"},status:{_eq:"active"}}){
				  id
				  user_id
				  status
				}
			  }
			  `;

			const hasura_response =
				await this.hasuraServiceFromServices.getData({
					query: query,
				});

			let id = hasura_response?.data?.group_users?.[0]?.id;

			//get new camp's inactive data if present for the given beneficiary to be reassigned

			let query4 = `query MyQuery {
				camps(where: {id: {_eq: ${camp_id}}, group: {academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq:${program_id}}}}) {
				  group {
					id
					group_users(where: {user_id: {_eq:${body?.learner_id}}, member_type: {_eq: "member"}, status: {_eq: "inactive"}}) {
					  id
					  user_id
					  status
					}
				  }
				}
			  }`;

			const new_response = await this.hasuraServiceFromServices.getData({
				query: query4,
			});

			//inactive record for the new camp with same beneficiary

			let new_result = new_response?.data?.camps?.[0]?.group?.group_users;

			let update_inactive_body = {
				status: 'inactive',
				updated_by: ip_id,
			};

			let create_active_body = {
				status: 'active',
				created_by: ip_id,
				updated_by: ip_id,
				member_type: 'member',
				user_id: body?.learner_id,
				group_id: new_group_id,
			};

			let update_array = ['status', 'updated_by'];

			update_response = await this.campcoreservice.updateCampUser(
				id,
				update_inactive_body,
				update_array,
				['id', 'status', 'updated_by'],
				req,
				resp,
			);

			if (new_result.length > 0) {
				let group_user_id = new_result?.[0]?.id;
				let update_array = ['status', 'updated_by'];
				let update_active_body = {
					status: 'active',
					updated_by: ip_id,
				};

				create_response = await this.campcoreservice.updateCampUser(
					group_user_id,
					update_active_body,
					update_array,
					['id', 'status', 'updated_by'],
					req,
					resp,
				);
			} else {
				create_response = await this.campcoreservice.createCampUser(
					create_active_body,
					['id', 'status', 'updated_by'],
					req,
					resp,
				);
			}

			//get facilitator_id of new camp  to which beneficiary is to be assigned

			let new_query = `query MyQuery {
				camps(where: {id: {_eq:${camp_id}}}) {
				  group_users(where: {member_type: {_eq: "owner"}, status: {_eq: "active"}}){
					user_id
				  }
				}
			  }
			  `;

			const new_hasura_response =
				await this.hasuraServiceFromServices.getData({
					query: new_query,
				});

			let new_facilitator_id =
				new_hasura_response?.data?.camps?.[0]?.group_users?.[0].user_id;

			const updatedResult =
				await this.beneficiariesService.reassignBeneficiary(
					body?.learner_id,
					new_facilitator_id,
					false,
				);
			if (!updatedResult.success)
				result.data.unsuccessfulReassignmentIds.push(body?.learner_id);

			if (old_consent_id) {
				let consent_body = {
					status: 'inactive',
					consent_id: old_consent_id,
					update_arr: ['status'],
				};
				await this.campcoreservice.updateConsentDetails(consent_body);
			}

			if (
				old_camp_details_repsonse?.data?.group_users?.[0].group
					?.group_users_aggregate?.aggregate?.count == 0
			) {
				await this.campcoreservice.updateCampGroup(
					old_group_id,
					{
						status: 'inactive',
					},
					['status'],
					['id', 'status'],
					req,
					resp,
				);
			}

			const auditData = {
				userId: req?.mw_userid,
				mw_userid: req?.mw_userid,
				user_type: 'IP',
				context: 'camp.beneficiary.reassign',
				context_id: camp_id,
				oldData: {
					camp_id: old_camp_id,
					learner_id: body?.learner_id,
				},
				newData: {
					camp_id: camp_id,
					learner_id: body?.learner_id,
				},
				subject: 'beneficiary',
				subject_id: body?.learner_id,
				log_transaction_text: `IP ${req.mw_userid} reassigned leaner  ${body?.learner_id} from camp ${old_camp_id} to new camp ${camp_id}`,
				tempArray: ['learner_id', 'camp_id'],
				action: 'create',
			};

			await this.userService.addAuditLogAction(auditData);
			if (
				update_response?.group_users?.id &&
				create_response?.group_users?.id
			) {
				return resp.json({
					status: 200,
					message: 'Camp reassigned successfully',
					data: create_response?.group_users?.id,
				});
			} else {
				return resp.json({
					status: 500,
					message: 'CAMP_REASSIGN_FAILURE',
					data: {},
				});
			}
		}
	}

	async reassignFaciltatorToCamp(id: any, body: any, req: any, resp: any) {
		//get IP information from token
		const user = await this.userService.ipUserInfo(req);

		//check for availability of IP from token
		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}
		let ip_id = user?.data?.program_users?.[0]?.organisation_id;
		let camp_id = id;

		//validation to check if the facilitator comes under the IP

		let access_check_query = `query MyQuery {
			users(where: {id: {_eq:${body?.facilitator_id}}, program_faciltators: {parent_ip: {_eq: "${ip_id}"}}}){
			  id
			}
		  }
		  `;
		const access_check_response =
			await this.hasuraServiceFromServices.getData({
				query: access_check_query,
			});

		let access_check_result = access_check_response?.data?.users?.[0]?.id;

		if (!access_check_result) {
			return resp.json({
				status: 401,
				success: false,
				message: 'FACILITATOR_REASSIGNMENT_ACCESS_DENIED_ERROR',
				data: {},
			});
		}

		//validation to check if the facilitator status is suitable for re-assignment
		let status = ['selected_for_onboarding', 'selected_prerak'];
		let status_check_query = `query MyQuery {
			users(where: {id: {_eq:${body?.facilitator_id}}, program_faciltators: {status: {_in:[${status}]}}}) {
			  id
			}
		  }
		  `;

		const status_check_response =
			await this.hasuraServiceFromServices.getData({
				query: status_check_query,
			});

		let status_check_result = status_check_response?.data?.users?.[0]?.id;

		if (!status_check_result) {
			return resp.json({
				status: 401,
				success: false,
				message: 'FACILITATOR_ASSIGNMENT_DENIED',
				data: {},
			});
		}

		//validation to check if the facilitator is assigned to more than one camp

		let camp_count_query = `query MyQuery {
			camps(where: {group_users: {member_type: {_eq: "owner"}, status: {_eq: "active"}, user_id: {_eq:${body?.facilitator_id}}}}){
			id
			}
		  }
		  `;

		const camp_count_response =
			await this.hasuraServiceFromServices.getData({
				query: camp_count_query,
			});

		let camp_count_result = camp_count_response?.data?.camps;

		if (camp_count_result?.length > 1) {
			return resp.json({
				status: 401,
				success: false,
				message: 'FACILITATOR_CAMP_ASSIGNMENT_LIMIT_EXCEEDING_ERROR',
				data: {},
			});
		}

		//validation to check if camp already have the same facilitator to be assigned
		let query = `query MyQuery {
			camps(where: {id: {_eq:${id}}, group_users: {member_type: {_eq: "owner"}, user_id: {_eq:${body?.facilitator_id}}, status: {_eq: "active"}}}) {
			  id
			}
		  }
		  
		  `;

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let result = hasura_response?.data?.camps[0]?.id;

		if (result) {
			return resp.json({
				status: 401,
				success: false,
				message: 'DUPLICATE_FACILITATOR_ASSIGNMENT_ERROR',
				data: {},
			});
		} else {
			//get group_user id and  for updating and creating new record with beneficiary data

			let query = `query MyQuery2 {
				camps(where: {id: {_eq:${camp_id}}}) {
				  facilitator_data:group_users(where:{member_type:{_eq:"owner"},status:{_eq:"active"}}) {
					id
					group_id
					user_id
				  }
				  beneficiaries_data: group_users(where: {member_type: {_eq: "member"}, status: {_eq: "active"}}) {
					user_id
				  }
					
				}
			  }
			  
			 `;

			const hasura_response =
				await this.hasuraServiceFromServices.getData({
					query: query,
				});

			let group_user_id =
				hasura_response?.data?.camps?.[0]?.facilitator_data?.[0].id;
			let group_id =
				hasura_response?.data?.camps?.[0]?.facilitator_data?.[0]
					.group_id;

			let old_facilitator_id =
				hasura_response?.data?.camps?.[0]?.facilitator_data?.[0]
					.user_id;
			let beneficiaries_id = [];

			let beneficiaries_data =
				hasura_response?.data?.camps?.[0]?.beneficiaries_data;

			//map all the beneficiary id's into an array
			beneficiaries_data?.map((beneficiary) => {
				beneficiaries_id.push(beneficiary.user_id);
			});

			//json body to update old camp data for old facilitator
			let update_inactive_body = {
				status: 'inactive',
				updated_by: ip_id,
			};

			//json body to create new body for new facilitator for given camp
			let create_active_body = {
				status: 'active',
				created_by: ip_id,
				updated_by: ip_id,
				member_type: 'owner',
				user_id: body?.facilitator_id,
				group_id: group_id,
			};

			let update_array = ['status', 'updated_by'];

			//array to push failed reassignments for beneficiaries to new facilitator
			let unsuccessfulReassignmentIds = [];

			// update previous camp record of the old facilitator
			let update_response = await this.campcoreservice.updateCampUser(
				group_user_id,
				update_inactive_body,
				update_array,
				['id', 'status', 'updated_by'],
				req,
				resp,
			);

			//create new facilitator record for the same camp
			let create_response = await this.campcoreservice.createCampUser(
				create_active_body,
				['id', 'status', 'updated_by'],
				req,
				resp,
			);

			// reassign beneficiaries to new facilitator for given camp
			for (const benId of beneficiaries_id) {
				const updatedResult =
					await this.beneficiariesService.reassignBeneficiary(
						benId,
						body?.facilitator_id,
						false,
					);
				if (!updatedResult.success)
					unsuccessfulReassignmentIds.push(benId);
			}

			const auditData = {
				userId: req?.mw_userid,
				mw_userid: req?.mw_userid,
				user_type: 'IP',
				context: 'camp.facilitator.reassign',
				context_id: camp_id,
				oldData: {
					camp_id: camp_id,
					facilitator_id: old_facilitator_id,
				},
				newData: {
					camp_id: camp_id,
					facilitator_id: body?.facilitator_id,
				},
				subject: 'facilitator',
				subject_id: body?.facilitator_id,
				log_transaction_text: `IP ${req.mw_userid} reassigned facilitator  ${body?.facilitator_id} for camp ${camp_id}`,
				tempArray: ['facilitator_id', 'camp_id'],
				action: 'create',
			};

			await this.userService.addAuditLogAction(auditData);
			if (
				update_response?.group_users?.id &&
				create_response?.group_users?.id
			) {
				return resp.json({
					status: 200,
					message: 'Camp reassigned successfully',
					data: {
						camp_id: camp_id,
						unsuccessfulReassignmentIds:
							unsuccessfulReassignmentIds,
					},
				});
			} else {
				return resp.json({
					status: 500,
					message: 'CAMP_REASSIGN_FAILURE',
					data: {},
				});
			}
		}
	}

	async getAvailableFacilitatorList(body: any, req: any, resp: any) {
		const page = isNaN(body?.page) ? 1 : parseInt(body?.page);
		const limit = isNaN(body?.limit) ? 15 : parseInt(body?.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;
		const user = await this.userService.ipUserInfo(req);
		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}
		let parent_ip_id = user?.data?.program_users?.[0]?.organisation_id;
		let response = await this.campcoreservice.getFacilitatorsForCamp(
			parent_ip_id,
			limit,
			offset,
		);

		let users = response?.data?.users;

		let userDataPromises = await users.map(async (user) => {
			const campLearnerCount = await this.calculateCampLearnerCountSum(
				user,
			);

			user.sum_camp_learner_count = campLearnerCount;
			return user;
		});

		let userData = await Promise.all(userDataPromises);

		const count = response?.data?.users_aggregate?.aggregate?.count;

		const totalPages = Math.ceil(count / limit);

		if (users?.length == 0) {
			return resp.json({
				status: 200,
				message: 'FACILITATOR_DATA_NOT_FOUND',
				data: [],
			});
		} else {
			return resp.json({
				status: 200,
				message: 'FACILITATOR_DATA_FOUND_SUCCESS',
				data: userData,
				totalCount: count,
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			});
		}
	}

	async calculateCampLearnerCountSum(user) {
		if (user.camp_learner_count && user.camp_learner_count.length > 0) {
			return user.camp_learner_count.reduce((sum, camp) => {
				if (camp?.group && camp?.group?.group_users_aggregate) {
					return (
						sum + camp.group.group_users_aggregate.aggregate.count
					);
				}
				return sum;
			}, 0);
		}
		return 0;
	}
}
