// camp.service.ts
import { Injectable } from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { UploadFileService } from 'src/upload-file/upload-file.service';
import { S3Service } from '../services/s3/s3.service';
import { AttendancesService } from '../attendances/attendances.service';

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

		if (newQdata?.length == 0) {
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

	public async updateCampDetails(
		id: any,
		body: any,
		request: any,
		response: any,
	) {
		let camp_id = id;
		let facilitator_id = request.mw_userid;
		let status = 'active';
		let member_type = 'owner';
		let update_body = body;

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
			  properties {
				lat
				long
			  }
			  group_users(where: {user_id: {_eq:${facilitator_id}}, member_type: {_eq:${member_type}}, status: {_eq:${status}}}) {
				id
				user_id
				
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
			return response.status(400).json({
				success: false,
				message: 'CAMP_NOT_EXISTS_ERROR',
				data: {},
			});
		}

		if (campData?.group_users[0]?.user_id != facilitator_id) {
			return response.status(401).json({
				success: false,
				message: 'CAMP_UPDATE_ACTION_DENIED',
				data: {},
			});
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
				return response.status(status).json({
					success: false,
					message,
					data,
				});
			} else {
				property_id = data?.property_id;
			}
		}

		switch (update_body.edit_page_type) {
			case 'edit_camp_location': {
				let bodyData = update_body;
				if (campData?.properties?.lat || campData?.properties?.long) {
					let { lat, long, ...otherData } = update_body;
					bodyData = otherData;
				}
				let location_body = {
					...bodyData,
					updated_by: facilitator_id,
				};
				const location_arr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_location.properties;

				await this.updatepropertyDetails(
					camp_id,
					property_id,
					location_body,
					[...location_arr, 'updated_by'],
					response,
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

				await this.updateCampData(
					camp_id,
					camp_details,
					kit_arr,
					response,
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
				await this.updatepropertyDetails(
					camp_id,
					property_id,
					photo_details_body,
					[...photo_details_arr, 'updated_by'],
					response,
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

				await this.updatepropertyDetails(
					camp_id,
					property_id,
					{ ...camp_facilities, updated_by: facilitator_id },
					[...facilities_arr, 'updated_by'],
					response,
				);

				break;
			}

			case 'edit_learners': {
				let learner_ids = body.learner_ids;
				let resultCreate = [];
				let resultActive = [];
				let resultInactive = [];
				let qury = `query MyQuery {
					camps_by_pk(id:${camp_id})  {
					group_id
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

				if (createData?.length > 0) {
					resultCreate = await this.hasuraServiceFromServices.qM(
						'insert_group_users',
						createData,
						[],
						returnFields,
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

				// update active to inactive user
				const deactivateIds = group_users
					.filter(
						(item) =>
							item.status === 'active' &&
							!learner_ids.includes(item.user_id),
					)
					.map((item) => item.id);

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

				return response.json({
					status: 200,
					message: 'Successfully updated camp details',
					data: { resultCreate, resultActive, resultInactive },
				});
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
					return response.json({
						status: 400,
						message: 'INVALID_CAMP_ERROR',
						data: {},
					});
				}
				let { kit_received, properties } = res?.data?.camps[0] ?? {
					kit_received: null,
					properties: null,
				};

				if (kit_received == 'no' || kit_received == null) {
					return response.json({
						status: 400,
						message: 'Please fill valid kit details',
						data: {},
					});
				} else if (!properties?.property_facilities) {
					return response.json({
						status: 400,
						message:
							'Please fill valid property facilities details',
						data: {},
					});
				} else if (
					!properties?.lat ||
					!properties.long ||
					!properties.district ||
					!properties.block ||
					!properties.state ||
					!properties.village ||
					!properties.property_type
				) {
					return response.json({
						status: 400,
						message: 'Please fill valid location details',
						data: {},
					});
				} else if (group_id) {
					let group_update_body = {
						status: update_body.status,
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

					return response.json({
						status: 200,
						message: 'Successfully updated camp details',
						data: camp_id,
					});
				} else {
					return response.json({
						status: 400,
						message: 'CAMP_UPDATE_FAILURE_ERROR',
						data: {},
					});
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
		let facilitator_id = request.mw_userid;
		let program_id = body?.program_id || 1;
		let academic_year_id = body?.academic_year_id || 1;
		let document_id = body?.document_id;
		let response;

		const tableName = 'consents';
		let query = `query MyQuery {
			consents(where: {user_id: {_eq:${user_id}}, facilitator_id: {_eq:${facilitator_id}},camp_id: {_eq:${camp_id}},academic_year_id: {_eq:${academic_year_id}},program_id: {_eq:${program_id}}}) {
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
				} catch (e) {
					console.log('s3 file not found', e.message);
				}
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

	//Get consents List
	async getConsentBenficiaries(body: any, request: any, resp: any) {
		let camp_id = body?.camp_id;
		let facilitator_id = request.mw_userid;
		let program_id = body?.program_id || 1;
		let academic_year_id = body?.academic_year_id || 1;

		let query = `query MyQuery {
			consents(where: {facilitator_id: {_eq:${facilitator_id}},camp_id: {_eq:${camp_id}},academic_year_id: {_eq:${academic_year_id}},program_id: {_eq:${program_id}}}) {
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
		let facilitator_id = body?.facilitator_id;
		let program_id = body?.program_id || 1;
		let academic_year_id = body?.academic_year_id || 1;

		const user = await this.userService.ipUserInfo(request);

		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}

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
		let query = `query MyQuery {
			consents(where: {facilitator_id: {_eq:${facilitator_id}},camp_id: {_eq:${camp_id}},academic_year_id: {_eq:${academic_year_id}},program_id: {_eq:${program_id}}}) {
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
							profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
								id
								name
								doument_type
								document_sub_type
								path
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
				attendance: ['photo_1', 'photo_2'],
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

	async getCampAttendanceById(id: any, req: any, res: any) {
		let response = await this.attendancesService.getCampAttendance(
			id,
			req,
			res,
		);

		let attendance_data = response?.data?.attendance;

		if (attendance_data?.length == 0) {
			return res.json({
				status: 200,
				message: 'ATTENDANCE_DATA_NOT_FOUND',
				data: [{}],
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
		const data = await this.campcoreservice.list(body);

		const faciltatorIds = new Set();
		data?.camps?.forEach((item) => {
			if (item?.faciltator?.user?.faciltator_id) {
				faciltatorIds.add(item.faciltator.user.faciltator_id);
			}
		});

		// Convert the Set to an array if needed
		const uniqueFaciltatorIds = [...faciltatorIds];

		const query = `query MyQuery{
				users(where:{id:{_in:[${uniqueFaciltatorIds}]}}){
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
}
