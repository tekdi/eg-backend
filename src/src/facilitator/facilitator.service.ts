import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createObjectCsvStringifier } from 'csv-writer';
import jwt_decode from 'jwt-decode';
import { AuthService } from 'src/modules/auth/auth.service';
import { UploadFileService } from 'src/upload-file/upload-file.service';
import { UserService } from 'src/user/user.service';
import { EnumService } from '../enum/enum.service';
import {
	HasuraService,
	HasuraService as HasuraServiceFromServices,
} from '../services/hasura/hasura.service';
import { S3Service } from '../services/s3/s3.service';
import { FacilitatorCoreService } from './facilitator.core.service';
import { Method } from '../common/method/method';
@Injectable()
export class FacilitatorService {
	constructor(
		private readonly httpService: HttpService,
		private authService: AuthService,
		private enumService: EnumService,
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private userService: UserService,
		private s3Service: S3Service,
		private uploadFileService: UploadFileService,
		private facilitatorCoreService: FacilitatorCoreService,
		private method: Method,
	) {}

	allStatus = this.enumService.getEnumValue('FACILITATOR_STATUS').data;

	private isValidString(str: String) {
		return typeof str === 'string' && str.trim();
	}

	public table = 'core_faciltators';
	public fillable = [
		'user_id',
		'pan_no',
		'device_type',
		'device_ownership',
		'sourcing_channel',
		'refreere',
		'updated_by',
		'created_by',
	];
	public returnFields = [
		'id',
		'user_id',
		'pan_no',
		'device_type',
		'device_ownership',
		'sourcing_channel',
		'refreere',
		'updated_by',
		'created_by',
	];

	create(req: any) {
		// return this.hasuraService.create(this.table, req, this.returnFields);
	}

	findAll(request: any) {
		// return this.hasuraService.getAll(this.table, this.returnFields, request);
	}

	findOne(id: number) {
		// return this.hasuraService.getOne(+id, this.table, this.returnFields);
	}

	async getFacilitatorsForOrientation(
		request: any,
		body: any,
		response: any,
	) {
		const program_id = request.mw_program_id;
		const academic_year_id = request.mw_academic_year_id;
		const user = await this.userService.getIpRoleUserById(
			request.mw_userid,
			{ program_id, academic_year_id },
		);

		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);

		let skip = page > 1 ? limit * (page - 1) : 0;
		let filterQueryArray = [];

		let status;
		switch (body?.type) {
			case 'pragati_orientation': {
				status = `status: { _in: ["applied" ]}`;
				break;
			}
			case 'pcr_training': {
				status = `status: { _in: ["pragati_mobilizer","selected_for_onboarding" ]}`;
				break;
			}
			case 'main_camp_execution_training': {
				status = `status: { _in: ["selected_for_onboarding","selected_prerak" ]}`;
				break;
			}
			case 'drip_training': {
				status = `status: { _in: ["applied","pragati_mobilizer","selected_for_onboarding" ]}`;
				break;
			}
		}

		filterQueryArray.push(
			`	program_faciltators: {
				parent_ip: { _eq: "${user?.program_users[0]?.organisation_id}" },academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}},
				${status}}`,
		);

		if (body.search && body.search !== '') {
			let first_name = body.search.split(' ')[0];
			let last_name = body.search.split(' ')[1] || '';

			if (last_name?.length > 0) {
				filterQueryArray.push(`
				first_name: { _ilike: "%${first_name}%" }, 
			  last_name: { _ilike: "%${last_name}%" } 
				  `);
			} else {
				filterQueryArray.push(
					`first_name: { _ilike: "%${first_name}%" }`,
				);
			}
		}

		if (body?.district && body?.district.length > 0) {
			filterQueryArray.push(
				`district:{_in: ${JSON.stringify(body?.district)}}`,
			);
		}

		if (body?.block && body?.block.length > 0) {
			filterQueryArray.push(
				`block:{_in: ${JSON.stringify(body?.block)}}`,
			);
		}
		if (body?.village && body?.village.length > 0) {
			filterQueryArray.push(
				`village:{_in: ${JSON.stringify(body?.village)}}`,
			);
		}

		let filterQuery = '' + filterQueryArray.join(',') + '';

		const data = {
			query: `
				query MyQuery($limit:Int, $offset:Int) {
					users_aggregate (
						where: {
							_and: [
								{
									${filterQuery}
								},
							]
						}
					) {
						aggregate {
						  count
						}
					}

					users(
						where: {
							_and: [
								{
									${filterQuery}
								},
							]
						},
						limit: $limit,
						offset: $offset,
						order_by: {created_at: desc}
					) {
						id
						first_name
						middle_name
						last_name
						gender
						mobile
						state
						district
						block
						village
						grampanchayat
						program_faciltators(where:{academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}}}) {
							id
							user_id
							status
						}						
					}
				}
			`,
			variables: {
				limit: limit,
				offset: skip,
			},
		};

		const hasuraResponse = await this.hasuraService.getData(data);

		let usersList = hasuraResponse?.data?.users;

		const count =
			hasuraResponse?.data?.users_aggregate?.aggregate?.count || 0;

		const totalPages = Math.ceil(count / limit);

		return response.status(200).json({
			status: true,
			message: 'Facilitators data fetched successfully.',
			data: {
				totalCount: count,
				data: usersList,
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			},
		});
	}

	async updateAddBasicDetails(id: number, body: any) {
		// Update Users table data
		const userArr = ['dob', 'gender'];
		const keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			await this.hasuraService.q(tableName, body, userArr, true);
		}
	}

	async updateAddOtherDetails(id: number, body: any, facilitatorUser: any) {
		// Update Program facilitators table data
		const programFacilitatorArr = ['availability'];
		let keyExist = programFacilitatorArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		if (keyExist.length) {
			const tableName = 'program_faciltators';
			const programDetails = facilitatorUser.program_faciltators;
			await this.hasuraService.q(
				tableName,
				{
					...body,
					id: programDetails?.id ?? null,
				},
				programFacilitatorArr,
				true,
			);
		}

		// Update core_facilitators table data
		const coreFacilitatorsArr = [
			'user_id',
			'device_ownership',
			'device_type',
			'refreere',
		];
		keyExist = coreFacilitatorsArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		if (keyExist.length) {
			const tableName = 'core_faciltators';
			await this.hasuraService.q(
				tableName,
				{
					...body,
					id: facilitatorUser?.core_faciltator?.id ?? null,
					user_id: id,
				},
				coreFacilitatorsArr,
				true,
			);
		}
	}

	async updateBasicDetails(id: number, body: any) {
		// Update Users table data
		const userArr = ['first_name', 'last_name', 'middle_name', 'dob'];
		const keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			const newReq = {
				...body,
				id: id,
				...(body?.dob == '' && { dob: null }),
			};
			await this.hasuraService.q(tableName, newReq, userArr, true);
		}
	}

	async updateAadhaarDetails(id: number, body: any) {
		let aadhaar_no = body.aadhar_no;

		if (typeof aadhaar_no === 'number') {
			aadhaar_no = String(aadhaar_no);
		}
		if (
			typeof aadhaar_no !== 'string' ||
			!aadhaar_no.trim() ||
			aadhaar_no.length !== 12 ||
			aadhaar_no.startsWith('1') ||
			aadhaar_no.startsWith('0')
		) {
			return {
				success: false,
				statusCode: 400,
				message: 'Invalid Aadhaar number!',
			};
		}

		// Check if aadhaar already exists or not
		let hasuraQuery = `
			query MyQuery {
				users_aggregate (
					where: {
						_and: [
							{ id: { _neq: ${id} } },
							{ aadhar_no: { _eq: "${aadhaar_no}" } }
						]
					}
				) {
					aggregate {
						count
					}
				}
			}
		`;

		const data = {
			query: hasuraQuery,
		};

		let hasuraResponse = await this.hasuraService.getData(data);

		const existedUsers =
			hasuraResponse?.data?.users_aggregate?.aggregate?.count;

		if (existedUsers) {
			return {
				success: false,
				statusCode: 400,
				message: 'Aadhaar number already exists!',
			};
		}

		// Update Users table data
		const userArr = ['aadhar_no'];
		const keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			await this.hasuraService.q(tableName, body, userArr, true);
		}
	}

	//status count
	public async getStatuswiseCount(req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		const academic_year_id = req.mw_academic_year_id;
		const program_id = req.mw_program_id;
		const status = (
			await this.enumService.getEnumValue('FACILITATOR_STATUS')
		).data.map((item) => item.value);

		let query = `query MyQuery {
			all:program_faciltators_aggregate(where: {
				parent_ip: {_eq: "${
					user?.data?.program_users[0]?.organisation_id
				}"},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}},
				user: {id: {_is_null: false}}
			})
			{
				aggregate {
					count
				}
			},

			applied: program_faciltators_aggregate(
				where: {
					parent_ip: {_eq: "${
						user?.data?.program_users[0]?.organisation_id
					}"},,academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}},
					user: {id: {_is_null: false}},
					_or: [
						{status: {_nin: ${JSON.stringify(status.filter((item) => item != 'applied'))}}},
						{ status: { _is_null: true } }
				 ]
				}
			) {
				aggregate {
					count
				}
			},
			${status
				.filter((item) => item != 'applied')
				.map(
					(item) => `${item}:program_faciltators_aggregate(where: {
							parent_ip: {_eq: "${user?.data?.program_users[0]?.organisation_id}"},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}}, user: {id: {_is_null: false}}, status: {_eq: "${item}"}
						}) {
						aggregate {
							count
						}}`,
				)}
		}`;
		const response = await this.hasuraServiceFromServices.getData({
			query,
		});
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

	async updateContactDetails(id: number, body: any, facilitatorUser: any) {
		// Update Users table data
		const userArr = ['mobile', 'alternative_mobile_number', 'email_id'];
		let keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			if (typeof body.mobile === 'string' && !body.mobile.trim()) {
				body.mobile = null;
			}
			if (
				typeof body.alternative_mobile_number === 'string' &&
				!body.alternative_mobile_number.trim()
			) {
				body.alternative_mobile_number = null;
			}
			await this.hasuraService.q(tableName, body, userArr, true);
		}

		// Update core_facilitators table data
		const coreFacilitatorsArr = [
			'user_id',
			'device_ownership',
			'device_type',
		];
		keyExist = coreFacilitatorsArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		if (keyExist.length) {
			const tableName = 'core_faciltators';
			await this.hasuraService.q(
				tableName,
				{
					...body,
					id: facilitatorUser?.core_faciltator?.id ?? null,
					user_id: id,
				},
				coreFacilitatorsArr,
				true,
			);
		}
	}

	async updateAddressDetails(id: number, body: any) {
		// Update Users table data
		const userArr = [
			'state',
			'district',
			'block',
			'village',
			'grampanchayat',
			'pincode',
		];
		const keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			await this.hasuraService.q(tableName, body, userArr, true);
		}
	}

	async updatePersonalDetails(id: number, body: any, facilitatorUser: any) {
		// Update Users table data
		const userArr = ['gender'];
		let keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			await this.hasuraService.q(tableName, body, userArr, true);
		}

		// Update Extended Users table data
		const extendedUserArr = [
			...(!facilitatorUser?.extended_users ? ['user_id'] : []),
			'social_category',
			'marital_status',
		];
		keyExist = extendedUserArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			let tableName = 'extended_users';
			await this.hasuraService.q(
				tableName,
				{
					...body,
					id: facilitatorUser?.extended_users?.id ?? null,
					user_id: id,
				},
				extendedUserArr,
				true,
			);
		}
	}

	async updateWorkExperienceDetails(
		id: number,
		body: any,
		facilitatorUser: any,
	) {
		if (!['experience', 'vo_experience'].includes(body.type)) {
			return {
				errorMessage: 'Invalid experience type!',
			};
		}
		let experience_id = body.id;
		if (
			experience_id &&
			!facilitatorUser[body?.type].find(
				(data) => data.id == experience_id,
			)
		) {
			return {
				errorMessage: 'Invalid experience id!',
			};
		}
		// Update experience table data
		const experienceArr = [
			'role_title',
			'organization',
			'description',
			'experience_in_years',
			'related_to_teaching',
			'user_id',
			'type',
		];
		let keyExist = experienceArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		let experienceInfo;
		if (keyExist.length) {
			const tableName = 'experience';
			// If 'experience_id' has any value, then update. Otherwise create a new record.
			experienceInfo = await this.hasuraService.q(
				tableName,
				{
					...body,
					id: experience_id ? experience_id : null,
					user_id: id,
				},
				experienceArr,
				true,
			);
			experienceInfo = experienceInfo.experience;
		}

		if (
			body.reference_details &&
			typeof body.reference_details === 'object' &&
			Object.keys(body.reference_details).length
		) {
			// Update Reference table data
			const referencesArr = [
				'name',
				'contact_number',
				'type_of_document',
				'document_id',
				'context',
				'context_id',
			];
			keyExist = referencesArr.filter((e) =>
				Object.keys(body.reference_details).includes(e),
			);
			let referenceInfo;
			let referenceDetails;
			if (keyExist.length) {
				let tableName = 'references';
				if (experience_id) {
					referenceDetails = facilitatorUser[body.type].find(
						(data) => data.id == experience_id,
					)?.reference;

					if (
						referenceDetails &&
						referenceDetails.document_id !==
							body.reference_details?.document_id
					) {
						if (referenceDetails?.document_reference?.name) {
							await this.s3Service.deletePhoto(
								referenceDetails?.document_reference?.name,
							);
						}

						await this.hasuraService.delete('documents', {
							user_id: id,
							context: 'references',
							context_id: referenceDetails.id,
						});
					}
				}
				referenceInfo = await this.hasuraService.q(
					tableName,
					{
						...body.reference_details,
						...(!isNaN(
							parseInt(body.reference_details?.document_id),
						) && {
							document_id: body.reference_details?.document_id,
						}),
						id: referenceDetails?.id ? referenceDetails?.id : null,

						// If 'experienceInfo' has id then a new experience record has created
						...((experienceInfo?.id || !referenceDetails) && {
							context: 'experience',
						}),
						...((experienceInfo?.id || !referenceDetails) && {
							context_id: experienceInfo.id || experience_id,
						}),
					},
					referencesArr,
					true,
				);
				referenceInfo = referenceInfo.references;
			}

			// Update Documents table data
			if (
				(!referenceDetails && body?.reference_details?.document_id) ||
				(body?.reference_details?.document_id &&
					referenceDetails.document_id !==
						body.reference_details.document_id)
			) {
				const documentsArr = ['context', 'context_id'];
				let tableName = 'documents';
				await this.hasuraService.q(
					tableName,
					{
						id: body?.reference_details?.document_id ?? null,
						context: 'references',
						context_id: referenceInfo?.id
							? referenceInfo?.id
							: referenceDetails?.id
							? referenceDetails?.id
							: null,
					},
					documentsArr,
					true,
				);
			}
		}
	}

	async updateWorkAvailabilityDetails(
		id: number,
		body: any,
		facilitatorUser: any,
	) {
		// Update Program facilitators table data
		const programFacilitatorArr = ['availability'];
		let keyExist = programFacilitatorArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		if (keyExist.length) {
			const tableName = 'program_faciltators';

			const programDetails = facilitatorUser.program_faciltators;

			await this.hasuraService.q(
				tableName,
				{
					...body,
					id: programDetails?.id ?? null,
				},
				programFacilitatorArr,
				true,
			);
		}
	}

	async updateQualificationDetails(
		id: number,
		body: any,
		facilitatorUser: any,
	) {
		// Update Qualifications table data
		const qualificationsArr = [
			'user_id',
			'qualification_master_id',
			'qualification_reference_document_id',
		];
		let keyExist = qualificationsArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		let qualificationDetails = facilitatorUser.qualifications;

		if (
			qualificationDetails.qualification_reference_document_id &&
			qualificationDetails.qualification_reference_document_id !==
				body.qualification_reference_document_id
		) {
			if (qualificationDetails.document_reference?.name) {
				await this.s3Service.deletePhoto(
					qualificationDetails.document_reference.name,
				);
			}

			await this.hasuraService.delete('documents', {
				user_id: id,
				context: 'qualifications',
				context_id: qualificationDetails.id,
			});
		}

		let newCreatedQualificationDetails;

		if (keyExist.length) {
			const tableName = 'qualifications';
			newCreatedQualificationDetails = (
				await this.hasuraService.q(
					tableName,
					{
						...body,
						qualification_reference_document_id:
							body.qualification_reference_document_id
								? body.qualification_reference_document_id
								: null,
						id: qualificationDetails?.id ?? null,
						user_id: id,
					},
					qualificationsArr,
					true,
				)
			).qualifications;
		}

		// Update Program facilitators table data
		const programFacilitatorsArr = ['qualification_ids'];
		const programDetails = facilitatorUser.program_faciltators;
		keyExist = qualificationsArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		if (keyExist.length) {
			const tableName = 'program_faciltators';
			await this.hasuraService.q(
				tableName,
				{
					qualification_ids: JSON.stringify(
						body.qualification_ids,
					).replace(/"/g, '\\"'),
					id: programDetails.id,
				},
				programFacilitatorsArr,
				true,
			);
		}

		if (
			(!qualificationDetails &&
				body?.qualification_reference_document_id) ||
			(body?.qualification_reference_document_id &&
				qualificationDetails.qualification_reference_document_id !==
					body.qualification_reference_document_id)
		) {
			// Update documents table data
			const documentsArr = ['context', 'context_id'];
			let tableName = 'documents';
			await this.hasuraService.q(
				tableName,
				{
					id: body.qualification_reference_document_id ?? null,
					context: 'qualifications',
					context_id: qualificationDetails.id
						? qualificationDetails.id
						: newCreatedQualificationDetails.id
						? newCreatedQualificationDetails.id
						: null,
				},
				documentsArr,
				true,
			);
		}
		// Update core_facilitator table
		const coreFacilitatorsArr = [
			'user_id',
			'has_diploma',
			'diploma_details',
		];
		keyExist = coreFacilitatorsArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		if (keyExist.length) {
			const tableName = 'core_faciltators';
			await this.hasuraService.q(
				tableName,
				{
					has_diploma: body.has_diploma || false,
					diploma_details: body.has_diploma
						? body.diploma_details || null
						: null,
					id: facilitatorUser?.core_faciltator?.id ?? null,
					user_id: id,
				},
				coreFacilitatorsArr,
				true,
			);
		}
	}

	async updateReferenceDetails(id: number, body: any, facilitatorUser: any) {
		const referenceDetails = facilitatorUser?.references;

		// Update References table data
		const referencesArr = [
			'name',
			'contact_number',
			'designation',
			'context',
			'context_id',
		];
		const tableName = 'references';
		await this.hasuraService.q(
			tableName,
			{
				...body,
				id: referenceDetails.id ?? null,
				...(!referenceDetails?.id && { context: 'users' }),
				...(!referenceDetails?.id && { context_id: id }),
			},
			referencesArr,
			true,
		);
	}

	// async updatePhotoDetails(id: number, body: any) {
	//   // Update Users table data
	//   const userArr = [
	//     body.photo_type
	//   ];
	//   body[body.photo_type] = body.url;
	//   delete body.url;
	//   let keyExist = userArr.filter((e) => Object.keys(body).includes(e));
	//   if (keyExist.length) {
	//     const tableName = 'users';
	//     body.id = id;
	//     await this.hasuraService.q(tableName, body, userArr, true);
	//   }
	// }

	async update(id: number, body: any, response: any, req: any) {
		const { data: facilitatorUser } = (
			await this.userById(id, response, req)
		).data;

		const mobile_no = body.mobile;
		switch (body.page_type) {
			case 'add_basic_details': {
				await this.updateAddBasicDetails(id, body);
				break;
			}
			case 'add_other_details': {
				await this.updateAddOtherDetails(id, body, facilitatorUser);
				break;
			}
			case 'basic_details': {
				await this.updateBasicDetails(id, body);
				break;
			}
			case 'contact_details': {
				let qury = `query MyQuery1 {
					users(where: {id: {_neq: ${id}}, mobile: {_eq:${mobile_no}}, program_faciltators: {id: {_is_null: false}}}) {
					  id
					  mobile
					  first_name
					  last_name
					  program_beneficiaries {
						facilitator_id
						status
					  }
					  program_faciltators {
						status
					  }
					}
				  }
				  `;
				const data = { query: qury };
				const resp = await this.hasuraServiceFromServices.getData(data);
				const newQdata = resp?.data;
				if (newQdata.users.length > 0) {
					return response.status(422).send({
						success: false,
						message: 'Mobile Number Already Exist',
						data: {},
					});
				}

				await this.updateContactDetails(id, body, facilitatorUser);
				break;
			}
			case 'address_details': {
				await this.updateAddressDetails(id, body);
				break;
			}
			case 'personal_details': {
				await this.updatePersonalDetails(id, body, facilitatorUser);
				break;
			}
			case 'work_availability_details': {
				await this.updateWorkAvailabilityDetails(
					id,
					body,
					facilitatorUser,
				);
				break;
			}
			case 'work_experience_details': {
				const result = await this.updateWorkExperienceDetails(
					id,
					body,
					facilitatorUser,
				);

				if (result?.errorMessage) {
					return response.status(400).json({
						success: false,
						message: result.errorMessage,
					});
				}
				break;
			}
			case 'qualification_details': {
				await this.updateQualificationDetails(
					id,
					body,
					facilitatorUser,
				);
				break;
			}
			case 'reference_details': {
				await this.updateReferenceDetails(id, body, facilitatorUser);
				break;
			}
			case 'documents_checklist': {
				// Update Document status data in program_faciltators table
				const userArr = ['documents_status'];
				const facilitatorId = facilitatorUser.program_faciltators.id;
				let tableName = 'program_faciltators';
				if (body.documents_status) {
					await this.hasuraService.q(
						tableName,
						{
							...body,
							id: facilitatorId,
							user_id: id,
							documents_status: JSON.stringify(
								body.documents_status,
							).replace(/"/g, '\\"'),
						},
						userArr,
						true,
					);
				}
				break;
			}
			case 'aadhaar_details': {
				let isAdharExist = await this.hasuraService.findAll('users', {
					aadhar_no: body?.aadhar_no,
				});
				let userExist = isAdharExist?.data?.users;
				const isDuplicateAdhar = userExist.some(
					(data) => data.id !== id,
				);
				if (userExist.length > 0 && isDuplicateAdhar) {
					return response.status(422).send({
						success: false,
						message: 'Aadhaar Number Already Exist',
						data: {},
					});
				}

				const result = await this.updateAadhaarDetails(id, body);
				if (result && !result.success) {
					return response.status(result.statusCode).json({
						success: result.success,
						message: result.message,
					});
				}
				break;
			}
			// case 'profile_photos': {
			//   await this.updatePhotoDetails(id, body);
			//   break;
			// }
		}
		const { data: updatedUser } = await this.userById(id, response, req);
		return response.status(200).json({
			success: true,
			message: 'User data fetched successfully!',
			data: updatedUser,
		});
	}

	async removeExperience(id: number, body: any, response: any) {
		try {
			const deletedExperienceData = (
				await this.hasuraService.delete('experience', { id })
			)?.experience;

			if (deletedExperienceData.affected_rows == 0) {
				return response.status(400).json({
					success: false,
					message: 'Experience Id does not exists!',
				});
			}

			const deletedReferenceData = (
				await this.hasuraService.delete(
					'references',
					{ context: 'experience', context_id: id },
					[],
					['id'],
				)
			)?.references;

			if (
				deletedReferenceData &&
				deletedReferenceData.affected_rows > 0
			) {
				const referenceId = deletedReferenceData.returning[0].id;

				const deletedDocumentData = (
					await this.hasuraService.delete(
						'documents',
						{ context: 'references', context_id: referenceId },
						[],
						['id', 'name'],
					)
				)?.documents;

				if (
					deletedDocumentData &&
					deletedDocumentData.affected_rows > 0
				) {
					const fileName = deletedDocumentData.returning[0].name;
					if (
						fileName &&
						typeof fileName === 'string' &&
						fileName.trim()
					) {
						await this.s3Service.deletePhoto(fileName);
					}
				}
			}

			return response.status(200).json({
				success: true,
				message: 'Experience deleted successfully!',
			});
		} catch (error) {
			return response.status(500).json({
				success: false,
				message: error.message,
			});
		}
	}

	remove(id: number) {
		// return this.hasuraService.delete(this.table, { id: +id });
	}

	filterFacilitatorsBasedOnExperience(
		arr,
		experience_type,
		experience_value,
	) {
		return arr.filter((facilitator) => {
			if (
				facilitator?.experience &&
				Array.isArray(facilitator?.experience)
			) {
				if (facilitator.experience.length) {
					const sum = facilitator?.experience.reduce((acc, curr) => {
						if (curr.type === experience_type) {
							acc += Number(curr.experience_in_years);
						}
						return acc;
					}, 0);
					if (experience_value === '5+' && sum > 5) {
						return true;
					} else if (Number(experience_value) <= sum) {
						return true;
					} else {
						return false;
					}
				} else {
					if (Number(experience_value) === 0) {
						return true;
					} else {
						return false;
					}
				}
			} else {
				return false;
			}
		});
	}
	async exportFileToCsv(req: any, body: any, resp: any) {
		try {
			const user = await this.userService.ipUserInfo(req);
			const program_id = req.mw_program_id;
			const academic_year_id = req.mw_academic_year_id;
			const decoded: any = jwt_decode(req?.headers?.authorization);
			if (!user?.data?.program_users?.[0]?.organisation_id) {
				return resp.status(400).send({
					success: false,
					message: 'Invalid User',
					data: {},
				});
			}

			const variables: any = {};

			let filterQueryArray = [];
			let paramsQueryArray = [];

			if (
				body.hasOwnProperty('qualificationIds') &&
				body.qualificationIds.length
			) {
				paramsQueryArray.push('$qualificationIds: [Int!]');
				filterQueryArray.push(
					'{qualifications: {qualification_master_id: {_in: $qualificationIds}}}',
				);
				variables.qualificationIds = body.qualificationIds;
			}
			if (body.search && body.search !== '') {
				filterQueryArray.push(`{_or: [
		{ first_name: { _ilike: "%${body.search}%" } },
		{ last_name: { _ilike: "%${body.search}%" } },
		{ email_id: { _ilike: "%${body.search}%" } }
	  ]} `);
			}
			if (
				body.hasOwnProperty('status') &&
				this.isValidString(body.status) &&
				this.allStatus.map((obj) => obj.value).includes(body.status)
			) {
				paramsQueryArray.push('$status: String');
				filterQueryArray.push(
					'{program_faciltators: {status: {_eq: $status}}}',
				);
				variables.status = body.status;
			}

			if (body.hasOwnProperty('state') && body.state.length) {
				paramsQueryArray.push('$state: [String!]');
				filterQueryArray.push('{state: { _in: $state }}');
				variables.state = body.state;
			}

			if (body.hasOwnProperty('district') && body.district.length) {
				paramsQueryArray.push('$district: [String!]');
				filterQueryArray.push('{district: { _in: $district }}');
				variables.district = body.district;
			}
			if (body.hasOwnProperty('block') && body.block.length) {
				paramsQueryArray.push('$block: [String!]');
				filterQueryArray.push('{block: { _in: $block }}');
				variables.block = body.block;
			}

			filterQueryArray.unshift(
				`{program_faciltators: {id: {_is_null: false}, parent_ip: {_eq: "${user?.data?.program_users[0]?.organisation_id}"},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}}}}`,
			);

			let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';
			let paramsQuery = '';
			if (paramsQueryArray.length) {
				paramsQuery = '(' + paramsQueryArray.join(',') + ')';
			}
			let sortQuery = `{ created_at: desc }`;
			const data = {
				query: `query MyQuery ${paramsQuery}{
					users(where:${filterQuery}, order_by: ${sortQuery}){
						id
						first_name
						last_name
						district
						mobile
						aadhar_no
						aadhar_verified
						aadhaar_verification_mode
						block
						gender
						district
						program_faciltators{
						status
					  }
					  experience {
						description
						end_year
						experience_in_years
						institution
						start_year
						organization
						role_title
						user_id
						type
					  }
					}
				  }
				  `,
				variables: variables,
			};

			const hasuraResponse = await this.hasuraService.getData(data);
			let allFacilitators = hasuraResponse?.data?.users;
			// checking allFacilitators ,body.work_experience available or not and body.work_experience is valid string or not
			if (
				allFacilitators &&
				body.hasOwnProperty('work_experience') &&
				this.isValidString(body.work_experience)
			) {
				const isValidNumberFilter =
					!isNaN(Number(body.work_experience)) ||
					body.work_experience === '5+';
				if (isValidNumberFilter) {
					allFacilitators = this.filterFacilitatorsBasedOnExperience(
						allFacilitators,
						'experience',
						body.work_experience,
					);
				}
			}
			const csvStringifier = createObjectCsvStringifier({
				header: [
					{ id: 'id', title: 'Id' },
					{ id: 'name', title: 'Name' },
					{ id: 'district', title: 'District' },
					{ id: 'block', title: 'Block' },
					{ id: 'mobile', title: 'Mobile Number' },
					{ id: 'status', title: 'Status' },
					{ id: 'gender', title: 'Gender' },
					{ id: 'aadhar_no', title: 'Aadhaar Number' },
					{ id: 'aadhar_verified', title: 'Aadhaar Number Verified' },
					{
						id: 'aadhaar_verification_mode',
						title: 'Aadhaar Verification Mode',
					},
				],
			});

			const records = [];
			for (let data of allFacilitators) {
				const dataObject = {};
				dataObject['id'] = data?.id;
				dataObject['name'] = data?.first_name + ' ' + data?.last_name;
				dataObject['district'] = data?.district;
				dataObject['block'] = data?.block;
				dataObject['mobile'] = data?.mobile;
				dataObject['status'] = data?.program_faciltators[0]?.status;
				dataObject['gender'] = data?.gender;
				dataObject['aadhar_no'] = data?.aadhar_no;
				dataObject['aadhar_verified'] = data?.aadhar_verified
					? data?.aadhar_verified
					: 'no';
				dataObject['aadhaar_verification_mode'] =
					data?.aadhaar_verification_mode;
				records.push(dataObject);
			}
			let fileName = `${decoded?.name.replace(' ', '_')}_${new Date()
				.toLocaleDateString()
				.replace(/\//g, '-')}.csv`;
			const fileData =
				csvStringifier.getHeaderString() +
				csvStringifier.stringifyRecords(records);
			resp.header('Content-Type', 'text/csv');
			return resp.attachment(fileName).send(fileData);
		} catch (error) {
			return resp.status(500).json({
				success: false,
				message: 'File Does Not Export!',
				data: {},
			});
		}
	}

	async getFacilitatorsFromIds(ids: number[], search: string) {
		let searchQuery = '';
		if (search.trim()) {
			if (search.split(' ').length <= 1) {
				searchQuery = `
					{
						_or: [
							{ first_name: { _ilike: "%${search}%" } },
							{ last_name: { _ilike: "%${search}%" } },
						]
					}
				`;
			} else if (search.split(' ').length <= 2) {
				const firstWord = search.split(' ')[0];
				const lastWord = search.split(' ')[1];
				searchQuery = `
					{
						_or: [
							{
								_and: [
									{ first_name: { _ilike: "%${firstWord}%" } },
									{ last_name: { _ilike: "%${lastWord}%" } },
								],
							},
							{
								_and: [
									{ first_name: { _ilike: "%${lastWord}%" } },
									{ last_name: { _ilike: "%${firstWord}%" } },
								]
							}
						]
					}
				`;
			}
		}
		// ${ids.length ? '{ id: { _in: ${JSON.stringify(ids)} } }' : ''},
		const data = {
			query: `query MyQuery {
				users ( where: {
					_and: [
						{ id: { _in: ${JSON.stringify(ids)} } },
						${searchQuery}
					]
				} ) {
					id
					first_name
					last_name
					middle_name
				}
			}`,
		};

		const response = {
			success: false,
			users: null,
			message: '',
		};
		let users;
		try {
			users = (await this.hasuraService.getData(data)).data?.users;
			if (!users) {
				response.message = 'Hasura error';
			}
		} catch (error) {
			response.message = 'Hasura error';
		}

		response.success = true;
		response.users = users;
		return response;
	}

	async getFilter_By_Beneficiaries(body: any, resp: any, req: any) {
		try {
			const page = isNaN(body.page) ? 1 : parseInt(body.page);
			const limit = isNaN(body.limit) ? 10 : parseInt(body.limit);
			let offset = page > 1 ? limit * (page - 1) : 0;

			const user: any = await this.userService.ipUserInfo(req);
			const program_id = req.mw_program_id;
			const academic_year_id = req.mw_academic_year_id;
			if (!user?.data?.program_users?.[0]?.organisation_id) {
				return resp.status(404).send({
					success: false,
					message: 'Invalid User',
					data: {},
				});
			}
			let filterQueryArray = [];
			let status = body?.status;

			filterQueryArray.push(
				`{_not: {
					group_users: {
						status: {_eq: "active"},
						group: {
							status: {
								_in: ["registered", "approved", "change_required"]
							}
						}
					}
				}},{
					program_beneficiaries: {
						facilitator_user: {
						program_faciltators: {
							parent_ip: {
								 _eq: "${user?.data?.program_users[0]?.organisation_id}"
							},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}}
						}
					}
				}}`,
			);

			if (
				body?.enrollment_verification_status &&
				body?.enrollment_verification_status !== ''
			) {
				filterQueryArray.push(
					`{program_beneficiaries:{enrollment_verification_status:{_eq:${body?.enrollment_verification_status}}}}`,
				);
			}

			if (body?.is_deactivated && body?.is_deactivated !== '') {
				filterQueryArray.push(
					`{is_deactivated:{_eq:${body?.is_deactivated}}}`,
				);
			}

			if (body?.is_duplicate && body?.is_duplicate !== '') {
				filterQueryArray.push(
					`{is_duplicate:{_eq:${body?.is_duplicate}}}`,
				);
			}

			if (body?.state && body?.state.length > 0) {
				filterQueryArray.push(
					`{state:{_in: ${JSON.stringify(body?.state)}}}`,
				);
			}

			if (body?.district && body?.district.length > 0) {
				filterQueryArray.push(
					`{district:{_in: ${JSON.stringify(body?.district)}}}`,
				);
			}

			if (body?.block && body?.block.length > 0) {
				filterQueryArray.push(
					`{block:{_in: ${JSON.stringify(body?.block)}}}`,
				);
			}

			if (body.facilitator && body.facilitator.length > 0) {
				filterQueryArray.push(
					`{program_beneficiaries: {facilitator_id:{_in: ${JSON.stringify(
						body.facilitator,
					)}}}}`,
				);
			}

			if (status && status !== '') {
				if (status === 'identified') {
					filterQueryArray.push(`{
						_or: [
							{ program_beneficiaries: { status: { _eq: "identified" } } },
							{ program_beneficiaries: { status: { _is_null: true } } },
							{ program_beneficiaries: { status: { _eq: "" } } },
						]
					}`);
				} else {
					filterQueryArray.push(
						`{program_beneficiaries:{status:{_eq:${status}}}}`,
					);
				}
			}

			let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';

			const dataIds = {
				query: `query MyQuery {
					users(where: ${filterQuery}) {
						program_beneficiaries {
							facilitator_id
							facilitator_user {
								id
								first_name
								middle_name
								last_name
							}
						}
					}
				}`,
			};
			const resultIds = await this.hasuraService.getData(dataIds);
			const ids = resultIds?.data?.users?.map(
				(user) => user?.program_beneficiaries?.[0].facilitator_id,
			);
			let searchQuery = '';
			if (body.search && body.search !== '') {
				let first_name = body.search.split(' ')[0];
				let last_name = body.search.split(' ')[1] || '';

				if (last_name?.length > 0) {
					searchQuery = `_or:[{first_name: { _ilike: "%${first_name}%" }}, {last_name: { _ilike: "%${last_name}%" }}],`;
				} else {
					searchQuery = `_or:[{first_name: { _ilike: "%${first_name}%" }}, {last_name: { _ilike: "%${first_name}%" }}],`;
				}
			}

			const where = `{id:{_in: ${JSON.stringify(ids)}},${searchQuery}}`;
			const data = {
				query: `query MyQuery($limit:Int, $offset:Int) {
					users_aggregate(where:${where}) {
						aggregate {
							count
						}
					}
					users(where: ${where},
						limit: $limit,
						offset: $offset,
					) {
						id
						first_name
						middle_name
						last_name
					}
				}`,
				variables: {
					limit: limit,
					offset: offset,
				},
			};
			const result = await this.hasuraService.getData(data);
			const extractedData = result?.data?.users;
			const count = result?.data?.users_aggregate?.aggregate?.count;
			const totalPages = Math.ceil(count / limit);

			if (extractedData?.length == 0) {
				resp.status(404).json({
					message: 'BENEFICIARY_DATA_NOT_FOUND_ERROR',
					data: { users: [] },
				});
			} else {
				resp.status(200).json({
					message: 'Data found successfully',
					data: {
						totalCount: count,
						data: extractedData || [],
						limit,
						currentPage: page,
						totalPages,
					},
				});
			}
		} catch (error) {
			return resp.status(500).json({
				message: 'BENEFICIARIES_LIST_ERROR',
				data: {},
			});
		}
	}

	async getFacilitators(req: any, body: any, resp: any) {
		const academic_year_id = req.mw_academic_year_id;
		const program_id = req.mw_program_id;

		if (req.mw_roles?.includes('program_owner')) {
			req.parent_ip_id = req.mw_ip_user_id;
		} else {
			const user = await this.userService.ipUserInfo(req);
			if (req.mw_roles?.includes('staff')) {
				req.parent_ip_id =
					user?.data?.program_users?.[0]?.organisation_id;
			} else if (req.mw_roles?.includes('facilitator')) {
				req.parent_ip_id = user?.data?.program_faciltators?.parent_ip;
			}
		}
		if (!req.parent_ip_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}

		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 10 : parseInt(body.limit);

		let skip = page > 1 ? limit * (page - 1) : 0;

		const variables: any = {};

		let filterQueryArray = [];
		let paramsQueryArray = [];

		if (
			body.hasOwnProperty('qualificationIds') &&
			body.qualificationIds.length
		) {
			paramsQueryArray.push('$qualificationIds: [Int!]');
			filterQueryArray.push(
				'{qualifications: {qualification_master_id: {_in: $qualificationIds}}}',
			);
			variables.qualificationIds = body.qualificationIds;
		}
		if (body.search && body.search !== '') {
			filterQueryArray.push(`{_or: [
		{ first_name: { _ilike: "%${body.search}%" } },
		{ last_name: { _ilike: "%${body.search}%" } },
		{ email_id: { _ilike: "%${body.search}%" } }
	  ]} `);
		}
		if (body.hasOwnProperty('status')) {
			if (
				Array.isArray(body?.status) &&
				body?.status?.length > 0 &&
				body?.status?.filter((e) =>
					this.allStatus.map((obj) => obj.value).includes(e),
				).length > 0
			) {
				paramsQueryArray.push('$status: [String!]');
				filterQueryArray.push(
					'{program_faciltators: {status: { _in: $status }}}',
				);
				variables.status = body.status;
			} else if (
				this.isValidString(body.status) &&
				this.allStatus.map((obj) => obj.value).includes(body?.status)
			) {
				paramsQueryArray.push('$status: String');
				filterQueryArray.push(
					'{program_faciltators: {status: { _eq: $status }}}',
				);
				variables.status = body.status;
			}
		}

		if (body.hasOwnProperty('state') && body.state.length) {
			paramsQueryArray.push('$state: [String!]');
			filterQueryArray.push('{state: { _in: $state }}');
			variables.state = body.state;
		}

		if (body.hasOwnProperty('district') && body.district.length) {
			paramsQueryArray.push('$district: [String!]');
			filterQueryArray.push('{district: { _in: $district }}');
			variables.district = body.district;
		}

		if (body.hasOwnProperty('block') && body.block.length) {
			paramsQueryArray.push('$block: [String!]');
			filterQueryArray.push('{block: { _in: $block }}');
			variables.block = body.block;
		}

		filterQueryArray.unshift(
			`{program_faciltators: {id: {_is_null: false}, parent_ip: {_eq: "${req.parent_ip_id}"}, academic_year_id: {_eq: ${academic_year_id}},program_id:{_eq:${program_id}}}}`,
		);

		let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';
		let paramsQuery = '';
		if (paramsQueryArray.length) {
			paramsQuery = '(' + paramsQueryArray.join(',') + ')';
		}
		let sortQuery = `{ created_at: desc }`;

		if (body.hasOwnProperty('sort')) {
			// Supported sortings: name, qualification, region, eligibility, status, comments
			let sortField = body.sort.split('|')[0]?.trim();
			let sortType = body.sort.split('|')[1]?.trim();
			let possibleSortFields = [
				'name',
				'qualification',
				'region',
				'eligibility',
				'status',
				'comments',
			];
			let possibleSortTypes = ['asc', 'desc'];
			if (
				possibleSortFields.includes(sortField) &&
				possibleSortTypes.includes(sortType)
			) {
				switch (sortField) {
					case 'name': {
						sortQuery = `{ first_name: ${sortType} }`;
						break;
					}
					case 'qualification': {
						sortQuery = `{ qualifications_aggregate: { count: ${sortType} } }`;
						break;
					}
					case 'region': {
						sortQuery = `{ block: ${sortType} }`;
						break;
					}
					case 'eligibility': {
						break;
					}
					case 'status': {
						sortQuery = `{ program_faciltators_aggregate: { count: ${sortType} } }`;
						break;
					}
					case 'comments': {
						break;
					}
				}
			}
		}

		const data = {
			query: `query MyQuery ${paramsQuery} {
		users_aggregate (where: ${filterQuery}) {
		  aggregate {
			count
		  }
		}

		users ( where: ${filterQuery}, order_by: ${sortQuery} ) {
		  first_name
		  id
		  last_name
		  middle_name
		  dob
		  aadhar_token
		  address
		  aadhar_verified
		  block_village_id
		  created_by
		  email_id
		  gender
		  lat
		  long
		  mobile
		  updated_by
		  state
		  district
		  block
		  village
		  grampanchayat
		  profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
			id
			name
			doument_type
			document_sub_type
			path
		  }
		  program_users {
			id
			organisation_id
			academic_year_id
			program_id
			role_id
			status
			user_id
		  }
		  core_faciltator {
			device_ownership
			device_type
			id
			sourcing_channel
			user_id
			has_diploma
			diploma_details
		  }
		  experience {
			description
			end_year
			experience_in_years
			institution
			start_year
			organization
			role_title
			user_id
			type
		  }
		  program_faciltators(where: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}},status:{_in:[${body?.status}]}}) {
			parent_ip
			availability
			id
			program_id
			user_id
			status
			form_step_number
			created_by
			updated_by
			academic_year_id
		  }
		  qualifications {
			end_year
			id
			qualification_master_id
			start_year
			user_id
			qualification_master {
			  id
			  name
			  type
			}
		  }
		  interviews {
			id
			title
			user_id
			owner_user_id
			date
			start_time
			end_time
			interviewer_name
			status
			comment
			reminder
			rsvp
			location_type
			location
			created_at
			created_by
			updated_at
			updated_by
			owner {
			  first_name
			  last_name
			  id
			}
		  }
		  events(where: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}) {
			context
			context_id
			created_by
			end_date
			end_time
			id
			location
			location_type
			start_date
			start_time
			updated_by
			user_id
		  }
		}
	  }`,
			variables: variables,
		};

		console.log('query--->>', data?.query);
		let response;
		try {
			response = await this.hasuraService.getData(data);
		} catch (error) {
			throw new InternalServerErrorException(error.message);
		}

		let mappedResponse = response?.data?.users;

		if (!mappedResponse) {
			throw new InternalServerErrorException('Hasura Error!');
		}

		if (
			mappedResponse &&
			body.hasOwnProperty('work_experience') &&
			this.isValidString(body.work_experience)
		) {
			const isValidNumberFilter =
				!isNaN(Number(body.work_experience)) ||
				body.work_experience === '5+';
			if (isValidNumberFilter) {
				mappedResponse = this.filterFacilitatorsBasedOnExperience(
					mappedResponse,
					'experience',
					body.work_experience,
				);
			}
		}

		if (
			mappedResponse &&
			body.hasOwnProperty('vo_experience') &&
			this.isValidString(body.vo_experience)
		) {
			const isValidNumberFilter =
				!isNaN(Number(body.vo_experience)) ||
				body.vo_experience === '5+';
			if (isValidNumberFilter) {
				mappedResponse = this.filterFacilitatorsBasedOnExperience(
					mappedResponse,
					'vo_experience',
					body.vo_experience,
				);
			}
		}

		let responseWithPagination = mappedResponse.slice(skip, skip + limit);

		responseWithPagination = await Promise.all(
			responseWithPagination?.map(async (obj) => {
				let mappedData = {
					...obj,
					['program_faciltators']:
						obj?.['program_faciltators']?.[0] || {},
					['qualifications']: obj?.['qualifications']?.[0] || {},
					['profile_photo_1']: obj?.['profile_photo_1']?.[0] || {},
				};
				if (mappedData?.profile_photo_1?.id) {
					const { success, data: fileData } =
						await this.uploadFileService.getDocumentById(
							mappedData?.profile_photo_1?.id,
						);
					if (success && fileData?.fileUrl) {
						mappedData.profile_photo_1.fileUrl = fileData.fileUrl;
					}
				}
				return mappedData;
			}),
		);

		const count = mappedResponse.length;
		const totalPages = Math.ceil(count / limit);

		return resp.status(200).send({
			success: true,
			message: 'Facilitator data fetched successfully!',
			data: {
				totalCount: count,
				data: responseWithPagination,
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			},
		});
	}

	async userById(id: any, response: any, req?: any) {
		const userData = await this.userService.userById(+id, response, req);

		return {
			message: 'User data fetched successfully.',
			data: userData,
		};
	}

	public async getLearnerStatusDistribution(req: any, body: any, resp: any) {
		let program_id = req?.mw_program_id;
		let academic_year_id = req?.mw_academic_year_id;
		const user = await this.userService.ipUserInfo(req);
		if (!user?.data?.id) {
			return resp.status(401).json({
				success: false,
				message: 'Unauthenticated User!',
			});
		}

		const sortType = body?.sortType ? body?.sortType : 'desc';

		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 10 : parseInt(body.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;
		let filterQueryArray = [];

		filterQueryArray.push(
			`{program_faciltators:{parent_ip:{_eq:"${user?.data?.program_users[0]?.organisation_id}"},academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}}`,
		);

		if (body.search && body.search !== '') {
			let first_name = body.search.split(' ')[0];
			let last_name = body.search.split(' ')[1] || '';

			if (last_name?.length > 0) {
				filterQueryArray.push(`{_and: [
				{first_name: { _ilike: "%${first_name}%" } } 
				{ last_name: { _ilike: "%${last_name}%" } } 
				 ]} `);
			} else {
				filterQueryArray.push(
					`{ first_name: { _ilike: "%${first_name}%" } }`,
				);
			}
		}

		if (body?.district && body?.district.length > 0) {
			filterQueryArray.push(
				`{district:{_in: ${JSON.stringify(body?.district)}}}`,
			);
		}

		if (body?.block && body?.block.length > 0) {
			filterQueryArray.push(
				`{block:{_in: ${JSON.stringify(body?.block)}}}`,
			);
		}

		if (body.facilitator && body.facilitator.length > 0) {
			filterQueryArray.push(
				` {id:{_in: ${JSON.stringify(body.facilitator)}}}`,
			);
		}

		const status = [
			'identified',
			'ready_to_enroll',
			'enrolled',
			'enrolled_ip_verified',
		];

		let filterQuery =
			'{ _and: [' +
			filterQueryArray.join(',') +
			'],_or: [{is_deactivated: {_eq: false}}{is_deactivated:{_is_null:true}}] }';

		let variables = {
			limit: limit,
			offset: offset,
		};

		let qury = `query MyQuery($limit:Int, $offset:Int) {
			users_aggregate(where: ${filterQuery}) {
					aggregate {
						count
					  }
				}
			users(limit: $limit,
				offset: $offset,where: ${filterQuery},order_by:{created_at:${sortType}}) {
	
				first_name
				last_name
				middle_name
				id
				program_faciltators(where:{parent_ip:{_eq:"${
					user?.data?.program_users[0]?.organisation_id
				}"},academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}}){
					status
					learner_total_count: beneficiaries_aggregate(where: {status: {_in: ["identified", "ready_to_enroll", "enrolled", "enrolled_ip_verified"]},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}}, _not: {group_users: {status: {_eq: "active"}}}}) {
						aggregate {
						  count
						}
					  },
					  identified_and_ready_to_enroll: beneficiaries_aggregate(where: {user: {id: {_is_null: false}}, _or: [{status: {_in: ["identified", "ready_to_enroll"]}}, {status: {_is_null: true}}],academic_year_id: {_eq:${academic_year_id}},program_id:{_eq:${program_id}}}) {
						aggregate {
						  count
						}
					  },
					${status
						.filter(
							(item) =>
								item != 'identified' &&
								item !== 'ready_to_enroll',
						)
						.map(
							(item) => `${
								!isNaN(Number(item[0])) ? '_' + item : item
							}:beneficiaries_aggregate(where: {
					_and: [
					  {
					  status: {_eq: "${item}"}
					},
	
						{ user:	{ id: { _is_null: false } } }
	
											 ],
					 academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}}				 
					  _not: {group_users: {status: {_eq: "active"}}}}					 
					
				)
				{
					aggregate {
					  count
					}
				}
				`,
						)}
				}
			}
		  }
		  `;

		const data = { query: qury, variables: variables };
		const response = await this.hasuraServiceFromServices.getData(data);
		const newQdata = response?.data;

		if (newQdata?.users.length > 0) {
			const res = newQdata.users.map((facilitator) => {
				const benefeciaryData = facilitator.program_faciltators.map(
					(benefeciary) => {
						const aggregateCount =
							benefeciary.identified_and_ready_to_enroll.aggregate
								.count;
						const statusCount = status
							.filter(
								(statusKey) => statusKey !== 'ready_to_enroll',
							) // Exclude 'ready_to_enroll'
							.map((statusKey) => ({
								status:
									statusKey === 'identified'
										? 'identified_ready_to_enroll'
										: statusKey,
								count:
									statusKey === 'identified'
										? aggregateCount
										: benefeciary[statusKey]?.aggregate
												?.count || 0,
							}));

						return {
							first_name: facilitator.first_name,
							last_name: facilitator.last_name,
							id: facilitator.id,
							status: benefeciary.status,
							learner_total_count:
								benefeciary.learner_total_count.aggregate.count,
							status_count: statusCount,
						};
					},
				);

				return benefeciaryData;
			});

			const count = newQdata.users_aggregate.aggregate.count;
			const totalPages = Math.ceil(count / limit);
			const flattenedRes = res.flat();

			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: {
					data: flattenedRes,
					totalCount: count,
					totalPages: totalPages,
					currentPage: offset / limit + 1,
					limit: limit,
				},
			});
		} else {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: {
					data: [],
					totalCount: 0,
					totalPages: 0,
					currentPage: offset / limit + 1,
					limit: limit,
				},
			});
		}
	}

	public async getLearnerListByPrerakId(
		req: any,
		id: any,
		query: any,
		resp: any,
	) {
		const user = await this.userService.ipUserInfo(req);
		const academic_year_id = req.mw_academic_year_id;
		const program_id = req.mw_program_id;
		if (!user?.data?.id) {
			return resp.status(401).json({
				success: false,
				message: 'Unauthenticated User!',
			});
		}

		const page = isNaN(query.page) ? 1 : parseInt(query.page);
		const limit = isNaN(query.limit) ? 10 : parseInt(query.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;
		let variables = {
			limit: limit,
			offset: offset,
		};

		let qury = `query MyQuery($limit:Int, $offset:Int) {
			users_aggregate(where: {program_beneficiaries: {facilitator_id: {_eq: ${id}},academic_year_id:{_eq:${academic_year_id}}, program_id: {_eq: ${program_id}}}, _not: {group_users: {status: {_eq: "active"}}}, _or: [{is_deactivated: {_eq: false}}, {is_deactivated: {_is_null: true}}]}) {
			  aggregate {
				count
			  }
			}
			users(limit: $limit,
				offset: $offset,where: {program_beneficiaries: {facilitator_id: {_eq: ${id}},academic_year_id:{_eq:${academic_year_id}}, program_id: {_eq: ${program_id}}}, _not: {group_users: {status: {_eq: "active"}}}, _or: [{is_deactivated: {_eq: false}}, {is_deactivated: {_is_null: true}}]}) {
			  id
			  first_name
			  last_name
			  mobile
			  aadhar_no
			  address
			  address_line_1
			  address_line_2
			  district
			  block
			  program_beneficiaries{
				id
				program_id
				status
				enrollment_dob
				enrollment_date
				enrollment_first_name
				enrollment_last_name
				exam_fee_document_id
				exam_fee_date
				syc_subjects
				is_continued
			  }
			}
		  }`;

		const data = { query: qury, variables: variables };

		const response = await this.hasuraServiceFromServices.getData(data);

		const newQdata = response?.data;

		if (newQdata.users.length > 0) {
			const res = newQdata.users.map((item) => ({
				...item,
				program_beneficiaries: item.program_beneficiaries[0], // Remove the program_beneficiaries property
			}));

			const count = newQdata.users_aggregate.aggregate.count;

			const totalPages = Math.ceil(count / limit);

			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: {
					data: res,
					totalCount: count,
					totalPages: totalPages,
					currentPage: offset / limit + 1,
					limit: limit,
				},
			});
		} else {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: {
					data: [],
					totalCount: 0,
					totalPages: 0,
					currentPage: offset / limit + 1,
					limit: limit,
				},
			});
		}
	}

	public async updatePrerakAadhar(
		id: any,
		req: any,
		body: any,
		response: any,
	) {
		//get IP information from token id
		const user = await this.userService.ipUserInfo(req);

		let facilitator_id = id;
		let aadhaar_no = body?.aadhar_no;

		if (!aadhaar_no || !facilitator_id) {
			return response.json({
				status: 400,
				success: false,
				message: 'Please provide required details',
				data: {},
			});
		}

		if (aadhaar_no.length < 12) {
			return response.json({
				status: 400,
				success: false,
				message: 'Aadhar number should be equal to 12 digits',
				data: {},
			});
		}

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
			return response.json({
				status: 401,
				success: false,
				message: 'Faciltator doesnt belong to IP',
				data: {},
			});
		}

		const query = `query MyQuery {
			users(where: {aadhar_no: {_eq:"${aadhaar_no}"}, _not: {id: {_eq:${facilitator_id}}}}) {
			  id
			  first_name
			  last_name
			  middle_name
			  program_beneficiaries {
				status
				facilitator_user {
				  first_name
				  last_name
				  middle_name
				}
			  }
			  program_faciltators {
				parent_ip
				status
			  }
			}
		  }`;

		const data = { query: query };
		const hashura_response = await this.hasuraServiceFromServices.getData(
			data,
		);
		const newQdata = hashura_response.data;
		if (newQdata?.users?.length > 0) {
			return response.json({
				status: 400,
				success: false,
				message: 'You have already added this Aadhaar number!',
				data: newQdata,
			});
		}

		const userArr = ['aadhar_no'];
		const keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			const res = await this.hasuraService.q(
				tableName,
				body,
				userArr,
				true,
				['id', 'aadhar_no'],
			);
			return response.json({
				status: 200,
				success: true,
				message: 'Data updated successfully!',
				data: res,
			});
		}
	}
	public async updateOkycResponse(req: any, body: any, res: any) {
		const user_id = req?.mw_userid;
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;

		const okyc_gender_data = body?.aadhaar_data?.gender;

		body.aadhaar_data.gender = await this.method.transformGender(
			okyc_gender_data,
		);

		const updated_response =
			await this.facilitatorCoreService.updateOkycResponse(
				body,
				program_id,
				user_id,
				academic_year_id,
			);
		if (updated_response != null) {
			return res.json({
				status: 200,
				message: 'Successfully updated okyc_response details',
				data: [],
			});
		} else {
			return res.json({
				status: 200,
				message: 'Cannot update okyc_response details',
				data: [],
			});
		}
	}

	public async okyc_update(body: any, request: any, res: any) {
		const id = body.id;

		const user = await this.userService.ipUserInfo(request);
		const program_id = request.mw_program_id;
		const academic_year_id = request.mw_academic_year_id;
		let organisation_id = user?.data?.program_users?.[0]?.organisation_id;
		if (!organisation_id) {
			return res.json({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}
		if (!id) {
			return res.json({
				status: 422,
				success: false,
				message: 'Id is required',
			});
		}
		//check validation for id benlongs to same IP under prerak
		let data = {
			query: `query MyQuery {
				users(where: {id: {_eq: ${id}}, program_faciltators: {parent_ip: {_eq: "${organisation_id}"},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}}}}) {
				  id
				  aadhar_verified
				}
			  }
			  `,
		};

		const result = await this.hasuraServiceFromServices.getData(data);

		if (result?.data?.users?.length == 0) {
			return res.json({
				status: 401,
				success: false,
				message: 'IP_ACCESS_DENIED',
				data: {},
			});
		}
		const userData = result?.data?.users?.[0];
		let okyc_response = {};
		let message = 'Okyc Details already Updated';
		let status = 200;
		if (userData?.aadhar_verified === 'yes') {
			// Check and modify the gender field in the body if it's 'M' or 'F' with the utility function
			if (body?.gender) {
				body.gender = await this.method.transformGender(body.gender);
			}

			okyc_response = await this.facilitatorCoreService.updateOkycDetails(
				body,
			);
			if (!okyc_response?.['error']) {
				message = 'Okyc Details Updated successfully';
			} else {
				status = 422;
				message = okyc_response?.['error'];
				okyc_response = {};
			}
		}
		return res.json({
			status,
			message,
			data: okyc_response || {},
		});
	}

	public async createProgramFacilitator(request: any, body: any, res: any) {
		let user_id = request?.mw_userid;

		let { parent_ip, program_id, academic_year_id } = body;

		//validation to check if th faciltator is getting registered for the same program

		let validation_query = `query MyQuery {
			program_faciltators(where: {user_id: {_eq:${user_id}}}){
			  program_id
			  has_social_work_exp
			  availability
			  created_by
			  documents_status
			  eligibility_details
			  eligibility_percentage
			  form_step_number
			  has_social_work_exp
			  okyc_response
			  police_verification_done
			  qualification_ids
			  status
			  status_reason
			  social_background_verified_by_neighbours
			  village_knowledge_test
			}
		  }
		  `;

		const validation_result = await this.hasuraService.getData({
			query: validation_query,
		});

		let program_faciltators = validation_result?.data?.program_faciltators;

		const ids = program_faciltators.map(
			(facilitator) => facilitator.program_id,
		);

		if (!ids.includes(body?.program_id)) {
			return res.status(200).json({
				success: false,
				data: {},
				message: 'Cannot add faciltator for another program',
			});
		}

		// Validation to check if the same faciltator data is present previously.
		let query = `query MyQuery {
			program_faciltators(where: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${parseInt(
			program_id,
		)}}, user_id: {_eq: ${user_id}}}){
			  id
			  program_id
			}
		  }
		  `;

		const result = await this.hasuraService.getData({
			query: query,
		});

		if (result?.data?.program_faciltators?.length > 0) {
			return res.status(200).json({
				message: 'Faciltator data already exists',
				success: false,
				data: {},
			});
		}

		const { okyc_response, ...otherData } = program_faciltators[0] || {};
		let program_faciltator_create = {
			...otherData,
			user_id: user_id,
			academic_year_id: academic_year_id,
			parent_ip: parent_ip,
			program_id: program_id,
			status: 'applied',
			qualification_ids: JSON.stringify(
				JSON.parse(otherData.qualification_ids),
			).replace(/"/g, '\\"'),
		};

		let createresponse = await this.hasuraService.q(
			'program_faciltators',
			{
				...program_faciltator_create,
			},
			[],
			false,
			['id', 'user_id', 'program_id', 'academic_year_id'],
		);

		if (createresponse?.program_faciltators?.id) {
			return res.status(200).json({
				message: 'Successfully added data',
				success: true,
				data: createresponse?.program_faciltator?.id,
			});
		} else {
			return res.status(200).json({
				message: 'Failed  adding data',
				success: true,
				data: {},
			});
		}
	}

	public async statusChangeValidation(request: any, body: any, res: any) {
		let user_id = body?.id;
		let academic_year_id = request?.mw_academic_year_id;
		let program_id = request?.mw_program_id;
		let status = body?.status;

		if (!user_id || !academic_year_id || !program_id || !status) {
			return res
				.status(400)
				.json({ message: 'Missing required parameters' });
		}

		const query = `
    query MyQuery2 {
        users(where: {id: {_eq: ${user_id}}}) {
            id
            first_name
            middle_name
            last_name
            mobile
            dob
            gender
            state
            district
            block
            village
            grampanchayat
            aadhar_no
            pincode
            core_faciltator {
                device_ownership
                device_type
                id
                sourcing_channel
                user_id
                has_diploma
                diploma_details
                has_volunteer_exp
                has_job_exp
            }
            experience {
                description
                experience_in_years
                institution
                start_year
                organization
                role_title
                user_id
                type
                related_to_teaching
            }
            program_faciltators(where: {user_id: {_eq: ${user_id}}, academic_year_id: {_eq: ${academic_year_id}}, program_id: {_eq: ${program_id}}}) {
                availability
                id
                program_id
                social_background_verified_by_neighbours
                user_id
                village_knowledge_test
                status
                form_step_number
                created_by
                updated_by
								qualification_ids
            }
            qualifications {
                end_year
                id
                institution
                qualification_master_id
                start_year
                updated_by
                user_id
                qualification_master {
                    context
                    context_id
                    id
                    name
                    type
                }
            }
            extended_users {
                marital_status
                social_category
            }
            references(where: {context_id: {_eq: ${user_id}}, context: {_eq: "users"}}) {
                id
                name
                contact_number
                designation
                type_of_document
                context
                context_id
                document_id
            }
            documents(where: {user_id: {_eq: ${user_id}}, document_sub_type: {_in: ["qualifications", "profile_photo_1", "profile_photo_2", "profile_photo_3"]}}) {
                id
                user_id
                name
                doument_type
                document_sub_type
            }
        }
    }`;

		const result = await this.hasuraService.getData({ query });

		if (
			!result ||
			!result.data ||
			!result.data.users ||
			result.data.users.length === 0
		) {
			return res.status(400).json({ message: 'User data not found' });
		}

		const userData = result.data.users[0];
		let requiredFields: string[] = [];
		let dataToCheck: any = {};

		switch (status) {
			case 'pragati_mobilizer':
				requiredFields = [
					'first_name',
					'middle_name',
					'last_name',
					'mobile',
					'dob',
					'gender',
					'district',
					'block',
					'village',
					'grampanchayat',
					'extended_users.marital_status',
					'extended_users.social_category',
					'core_faciltator.device_ownership',
					'core_faciltator.device_type',
					'core_faciltator.has_diploma',
					'core_faciltator.diploma_details',
				];
				const documents = userData.documents || [];
				const requiredDocumentTypes = [
					'qualifications',
					'profile_photo_1',
					'profile_photo_2',
					'profile_photo_3',
				];
				requiredDocumentTypes.forEach((docType) => {
					if (
						!documents.some(
							(doc) => doc.document_sub_type === docType,
						)
					) {
						requiredFields.push(`${docType}`);
					}
				});

				const qualifications = userData.qualifications || [];
				if (
					!qualifications.some(
						(qualification: any) =>
							qualification.qualification_master.type ===
							'qualification',
					)
				) {
					requiredFields.push('qualification');
				}
				let program_faciltators = userData.program_faciltators || [];
				if (
					!program_faciltators.every((pf) => {
						try {
							const ids = JSON.parse(pf.qualification_ids);
							return (
								Array.isArray(ids) &&
								ids.length > 0 &&
								ids.every((id: any) => typeof id === 'string')
							);
						} catch (e) {
							return false;
						}
					})
				) {
					requiredFields.push('teaching_degree');
				}

				dataToCheck = userData;
				break;
			case 'selected_for_onboarding':
				requiredFields = ['has_volunteer_exp', 'has_job_exp'];
				dataToCheck = userData;
				program_faciltators = userData.program_faciltators || [];
				if (!program_faciltators.every((pf) => pf.availability)) {
					requiredFields.push('availability');
				}

				const experience = userData.experience || [];
				if (!experience.every((exp) => exp.description)) {
					requiredFields.push('description');
				}
				if (!experience.every((exp) => exp.organization)) {
					requiredFields.push('organization');
				}
				if (!experience.every((exp) => exp.role_title)) {
					requiredFields.push('role_title');
				}
				if (!experience.every((exp) => exp.experience_in_years)) {
					requiredFields.push('experience_in_years');
				}
				if (!experience.every((exp) => exp.related_to_teaching)) {
					requiredFields.push('related_to_teaching');
				}
				const references = userData.references || [];
				if (!references.every((ref) => ref.name)) {
					requiredFields.push('name');
				}
				if (!references.every((ref) => ref.contact_number)) {
					requiredFields.push('contact_number');
				}
				if (!references.every((ref) => ref.designation)) {
					requiredFields.push('designation');
				}
				if (
					!experience.some((exp: any) => exp.type === 'vo_experience')
				) {
					requiredFields.push('type_vo_experience');
				}
				if (!experience.some((exp: any) => exp.type === 'experience')) {
					requiredFields.push('type_experience');
				}
				break;
			case 'selected_prerak':
				requiredFields = ['aadhar_no'];
				dataToCheck = userData;
				break;
			default:
				return res.status(400).json({ message: 'Invalid status' });
		}

		const checkField = (obj: any, path: string): boolean => {
			const keys = path.split('.');
			let current = obj;
			for (const key of keys) {
				if (key.includes('[')) {
					const [arrayKey, index] = key.replace(']', '').split('[');
					if (
						!Array.isArray(current[arrayKey]) ||
						!current[arrayKey][index]
					) {
						return false;
					}
					current = current[arrayKey][index];
				} else {
					if (current[key] === undefined || current[key] === null) {
						return false;
					}
					current = current[key];
				}
			}
			return true;
		};

		const missingFields = requiredFields.filter(
			(field) => !checkField(userData, field),
		);

		if (missingFields.length > 0) {
			return res.status(400).json({
				message: 'The following fields are required:',
				required: missingFields,
			});
		}

		return res.status(200).json({
			status: true,
			message: 'Validation successful',
			required: [],
		});
	}
}
