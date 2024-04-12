import { HttpService } from '@nestjs/axios';
import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createObjectCsvStringifier } from 'csv-writer';
import { S3Service } from 'src/services/s3/s3.service';
import { UploadFileService } from 'src/upload-file/upload-file.service';
import { UserService } from 'src/user/user.service';
import { EnumService } from '../enum/enum.service';
import { HasuraService } from '../hasura/hasura.service';
import { UserHelperService } from '../helper/userHelper.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { KeycloakService } from '../services/keycloak/keycloak.service';
import { BeneficiariesCoreService } from './beneficiaries.core.service';
@Injectable()
export class BeneficiariesService {
	public url = process.env.HASURA_BASE_URL;

	constructor(
		private readonly s3Service: S3Service,
		private readonly httpService: HttpService,
		private userService: UserService,
		private helper: UserHelperService,
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private keycloakService: KeycloakService,
		private configService: ConfigService,
		private enumService: EnumService,
		private uploadFileService: UploadFileService,
		private beneficiariesCoreService: BeneficiariesCoreService,
	) {}

	allStatus = this.enumService.getEnumValue('BENEFICIARY_STATUS').data;

	public returnFields = [
		'status',
		'user_id',
		'enrollment_number',
		'beneficiaries_found_at',
		'documents_status',
		'enrollment_status',
		'enrolled_for_board',
		'type_of_enrollement',
		'academic_year_id',
		'payment_receipt_document_id',
		'facilitator_id',
		'documents_status',
		'program_id',
		'reason_for_status_update',
		'created_by',
		'updated_by',
		'enrollment_date',
		'enrollment_first_name',
		'enrollment_middle_name',
		'enrollment_last_name',
		'enrollment_dob',
		'enrollment_aadhaar_no',
		'enrollment_verification_reason',
		'enrollment_verification_status',
		'subjects',
		'is_eligible',
		'original_facilitator_id',
	];
	public returnFieldsgroupUsers = ['status', 'id'];
	async getBeneficiariesDuplicatesByAadhaar(
		aadhaarNo: string,
		limit: number,
		skip: number,
	) {
		const beneficiariesByAadhaarQuery = `
			query MyQuery {
				users_aggregate(where: {
					_and: [
						{ aadhar_no: {_eq: "${aadhaarNo}"} },
						{
							_or: [
								{ is_deactivated: {_is_null: true} },
								{ is_deactivated: {_neq: true} },
							]
						},
						{ program_beneficiaries: {} }
					]
				}) {
					aggregate {
						count
					}
				}

				users(where: {
					_and: [
						{ aadhar_no: {_eq: "${aadhaarNo}"} },
						{
							_or: [
								{ is_deactivated: {_is_null: true} },
								{ is_deactivated: {_neq: true} },
							]
						},
						{ program_beneficiaries: {} }
					]
				},
				limit: ${limit},
				offset: ${skip}
				) {
					id
					first_name
					last_name
					created_at
					mobile
					state
					district
					block
					village
					grampanchayat
					is_duplicate
					is_deactivated
					duplicate_reason
					program_beneficiaries {
						status
						facilitator_user {
							id
							first_name
							last_name
							mobile
							program_faciltators {
								parent_ip
							}
						}
					}
				}
			}
		`;

		let resultAllData = (
			await this.hasuraServiceFromServices.getData({
				query: beneficiariesByAadhaarQuery,
			})
		)?.data;
		const allIpIds = new Set();

		const usersData = resultAllData?.users.map((user) => {
			user.program_beneficiaries = user?.program_beneficiaries?.[0] ?? {};
			const parentIp =
				user.program_beneficiaries.facilitator_user
					.program_faciltators[0].parent_ip;
			if (parentIp) {
				allIpIds.add(parseInt(parentIp));
			}
			return user;
		});

		const getIpDataQuery = `
			query MyQuery {
				organisations(
					where: { id: { _in: ${JSON.stringify(Array.from(allIpIds))} } }
				) {
					id
					name
				}
			}
		`;

		const allIpData = (
			await this.hasuraServiceFromServices.getData({
				query: getIpDataQuery,
			})
		).data?.organisations;

		const allIpDataObj = {};
		allIpData.forEach(
			(ipData) => (allIpDataObj[String(ipData.id)] = ipData.name),
		);

		usersData.forEach((userObj) => {
			userObj['IP_name'] =
				allIpDataObj[
					userObj.program_beneficiaries.facilitator_user
						.program_faciltators[0].parent_ip
				] || '';
		});

		const success = Boolean(usersData);
		const count = resultAllData?.users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);
		return {
			success,
			limit,
			currentPage: skip / limit + 1,
			totalPages,
			count,
			result: usersData,
		};
	}

	async isEnrollmentNumberExists(beneficiaryId: string, body: any) {
		let is_deactivated = true;
		const query = `
		query MyQuery {
			program_beneficiaries_aggregate(where: {enrollment_number: {_eq: "${body.enrollment_number}"}, user_id:{_neq: ${beneficiaryId}} , _not: {user: {is_deactivated: {_eq: ${is_deactivated}}}}}) {
			  aggregate {
				count
			  }
			}
		  }
			`;

		const data_exist = (
			await this.hasuraServiceFromServices.getData({ query })
		)?.data?.program_beneficiaries_aggregate;

		// Check wheather user is exist or not based on response
		if (data_exist && data_exist.aggregate.count > 0) {
			return {
				success: false,
				message: 'Enrollment number exist!',
				isUserExist: true,
			};
		} else {
			return {
				success: true,
				message: 'Enrollment number not exist',
				isUserExist: false,
			};
		}
	}

	async exportCsv(req: any, body: any, resp: any) {
		try {
			const user = await this.userService.ipUserInfo(req);
			const academic_year_id = req.mw_academic_year_id;
			const program_id = req.mw_program_id;
			const variables: any = {};

			let filterQueryArray = [];
			let paramsQueryArray = [];

			filterQueryArray.push(
				`{ program_beneficiaries: { facilitator_user: { program_faciltators: { parent_ip: { _eq: "${user?.data?.program_users[0]?.organisation_id}" },academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}} } } } }`,
			);

			if (body.search && body.search !== '') {
				let first_name = body.search.split(' ')[0];
				let last_name = body.search.split(' ')[1] || '';

				if (last_name?.length > 0) {
					filterQueryArray.push(`{_or: [
				{ first_name: { _ilike: "%${first_name}%" } }
				{ last_name: { _ilike: "%${last_name}%" } }
				 ]} `);
				} else {
					filterQueryArray.push(`{_or: [
				{ first_name: { _ilike: "%${first_name}%" } }
				{ last_name: { _ilike: "%${first_name}%" } }
				 ]} `);
				}
			}
			if (body?.status && body?.status !== '') {
				if (body?.status === 'identified') {
					filterQueryArray.push(`{
						_or: [
							{ program_beneficiaries: { status: { _eq: "identified" } } },
							{ program_beneficiaries: { status: { _is_null: true } } },
							{ program_beneficiaries: { status: { _eq: "" } } },
						]
					}`);
				} else {
					filterQueryArray.push(
						`{program_beneficiaries:{status:{_eq:${body?.status}}}}`,
					);
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

			if (body.facilitator && body.facilitator.length > 0) {
				filterQueryArray.push(
					`{program_beneficiaries: {facilitator_id:{_in: ${JSON.stringify(
						body.facilitator,
					)}}}}`,
				);
			}

			let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';

			let paramsQuery = '';
			if (paramsQueryArray.length) {
				paramsQuery = '(' + paramsQueryArray.join(',') + ')';
			}
			let sortQuery = `{ created_at: desc }`;

			const data = {
				query: `query MyQuery ${paramsQuery} {
					users(where:${filterQuery}, order_by: ${sortQuery}){
						first_name
						last_name
						dob
						aadhar_no
						aadhar_verified
						aadhaar_verification_mode
						village
						mobile
						block
						district
						program_beneficiaries{
							user_id
							facilitator_id
							status
							enrollment_number
							enrollment_first_name
							enrollment_last_name
							facilitator_user{
								first_name
								id
								last_name
							}
					  	}
					}
				  }
				  `,
				variables: variables,
			};
			const hasuraResponse = await this.hasuraServiceFromServices.getData(
				data,
			);
			const allBeneficiaries = hasuraResponse?.data?.users;
			const csvStringifier = createObjectCsvStringifier({
				header: [
					{ id: 'name', title: 'Name' },
					{ id: 'user_id', title: 'LearnerId' },
					{ id: 'district', title: 'District' },
					{ id: 'block', title: 'Block' },
					{ id: 'village', title: 'Village' },
					{ id: 'dob', title: 'DOB' },
					{ id: 'prerak', title: 'Prerak' },
					{ id: 'facilitator_id', title: 'FacilitatorId' },
					{ id: 'mobile', title: 'Mobile Number' },
					{ id: 'status', title: 'Status' },
					{ id: 'enrollment_number', title: 'Enrollment Number' },
					{ id: 'aadhar_no', title: 'Aadhaar Number' },
					{ id: 'aadhar_verified', title: 'Aadhaar Number Verified' },
					{
						id: 'aadhaar_verification_mode',
						title: 'Aadhaar Verification Mode',
					},
				],
			});

			const records = [];
			for (let data of allBeneficiaries) {
				const dataObject = {};
				dataObject['name'] =
					data?.program_beneficiaries[0]?.status !==
					'enrolled_ip_verified'
						? [data?.first_name, data?.last_name]
								.filter((e) => e)
								.join(' ')
						: [
								data?.program_beneficiaries[0]
									?.enrollment_first_name,
								data?.program_beneficiaries[0]
									?.enrollment_last_name,
						  ]
								.filter((e) => e)
								.join(' ');
				dataObject['user_id'] = data?.program_beneficiaries[0]?.user_id;
				dataObject['district'] = data?.district;
				dataObject['block'] = data?.block;
				dataObject['village'] = data?.village;
				dataObject['dob'] = data?.dob;
				dataObject['prerak'] =
					data?.program_beneficiaries[0]?.facilitator_user
						?.first_name +
					' ' +
					data?.program_beneficiaries[0]?.facilitator_user?.last_name;
				dataObject['facilitator_id'] =
					data?.program_beneficiaries[0]?.facilitator_id;
				dataObject['mobile'] = data?.mobile;
				dataObject['status'] = data?.program_beneficiaries[0]?.status;
				dataObject['enrollment_number'] =
					data?.program_beneficiaries[0]?.enrollment_number;

				dataObject['aadhar_no'] = data?.aadhar_no;
				dataObject['aadhar_verified'] = data?.aadhar_verified
					? data?.aadhar_verified
					: 'no';
				dataObject['aadhaar_verification_mode'] =
					data?.aadhaar_verification_mode;
				records.push(dataObject);
			}
			let fileName = `${
				user?.data?.first_name + '_' + user?.data?.last_name
			}_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
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

	async exportSubjectCsv(req: any, body: any, resp: any) {
		try {
			const user = await this.userService.ipUserInfo(req);
			const academic_year_id = req.mw_academic_year_id;
			const program_id = req.mw_program_id;
			if (!user?.data?.program_users?.[0]?.organisation_id) {
				return resp.status(404).send({
					success: false,
					message: 'Invalid Ip',
					data: {},
				});
			}
			const sortType = body?.sortType ? body?.sortType : 'desc';
			let status = body?.status;
			let filterQueryArray = [];
			filterQueryArray.push(
				`{ program_beneficiaries: { facilitator_user: { program_faciltators: { parent_ip: { _eq: "${user?.data?.program_users[0]?.organisation_id}" },academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}} } } } }`,
			);

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
			let data = {
				query: `query MyQuery {
					users(where: ${filterQuery},
						order_by: {
						created_at: ${sortType}
						}
					) {
					id
					first_name
					last_name
					district
					block
					mobile
					program_beneficiaries {
					id
					user_id,
					facilitator_id,
					enrolled_for_board
					enrollment_first_name
					enrollment_last_name
					subjects
					facilitator_id
					status

				  	}
				}
			  }`,
			};

			const response = await this.hasuraServiceFromServices.getData(data);
			let result = response?.data?.users;
			let mappedResponse = result;

			const sql = `SELECT
						name,
						array_agg(id)
						FROM
						subjects
						GROUP BY
						name
						;`;
			const subjectGroup = (
				await this.hasuraServiceFromServices.executeRawSql(sql)
			).result;
			let allSubjects =
				this.hasuraServiceFromServices.getFormattedData(subjectGroup);
			const subjects = {};
			const subjectHeader = [];

			for (let data of allSubjects) {
				subjectHeader.push({ id: data.name, title: data.name });
			}
			//create export table columns list
			const csvStringifier = createObjectCsvStringifier({
				header: [
					{ id: 'name', title: 'Name' },
					{ id: 'user_id', title: 'LearnerId' },
					{ id: 'facilitator_id', title: 'FacilitatorId' },
					{ id: 'enrolled_for_board', title: 'Enrolled For Board' },
					...subjectHeader,
				],
			});
			const records = [];
			// getting subject which Ag ha selected

			for (let data of mappedResponse) {
				let selectedSubject = JSON.parse(
					data?.program_beneficiaries[0]?.subjects,
				);

				const dataObject = {};
				dataObject['name'] =
					data?.program_beneficiaries[0]?.status !==
					'enrolled_ip_verified'
						? [data?.first_name, data?.last_name]
								.filter((e) => e)
								.join(' ')
						: [
								data?.program_beneficiaries[0]
									?.enrollment_first_name,
								data?.program_beneficiaries[0]
									?.enrollment_last_name,
						  ]
								.filter((e) => e)
								.join(' ');

				dataObject['user_id'] = data?.program_beneficiaries[0]?.user_id;
				dataObject['facilitator_id'] =
					data?.program_beneficiaries[0]?.facilitator_id;
				dataObject['enrolled_for_board'] =
					data?.program_beneficiaries[0]?.enrolled_for_board;
				// executing loop for all subject ,check if ag has selected subject then mark "Yes" else "No"

				for (let i = 0; i < allSubjects.length; i++) {
					if (selectedSubject) {
						let res = allSubjects[i].array_agg
							.replace(/[{}]/g, '')
							.split(',')
							.some((e) => selectedSubject.includes(e));

						if (res == true) {
							dataObject[allSubjects[i].name] = 'yes';
						} else {
							dataObject[allSubjects[i].name] = 'no';
						}
					} else {
						dataObject[allSubjects[i].name] = 'no';
					}
				}

				records.push(dataObject);
			}

			let fileName = `${
				user?.data?.first_name +
				'_' +
				user?.data?.last_name +
				'_' +
				'subjects'
			}_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
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

	//status count
	public async getStatuswiseCount(body: any, req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;
		if (!user?.data?.id) {
			return resp.status(401).json({
				success: false,
				message: 'Unauthenticated User!',
			});
		}

		const status = (
			await this.enumService.getEnumValue('BENEFICIARY_STATUS')
		).data.map((item) => item.value);

		let qury = `query MyQuery {
		${status.map(
			(item) => `${
				!isNaN(Number(item[0])) ? '_' + item : item
			}:program_beneficiaries_aggregate(where:{
			_and: [
			  {
				facilitator_id: { _eq: ${
					user?.data?.id
				} },program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}}
			  },{
			  status: {_eq: "${item}"}
			},
				{ user:	{ id: { _is_null: false } } }

									 ]
		}) {
		aggregate {
		  count
		}
	  }`,
		)}

	 }`;

		const data = { query: qury };

		const response = await this.hasuraServiceFromServices.getData(data);
		const newQdata = response?.data;
		const res = status.map((item) => {
			return {
				status: item,
				count: newQdata?.[!isNaN(Number(item[0])) ? '_' + item : item]
					?.aggregate?.count,
			};
		});
		return resp.status(200).json({
			success: true,
			message: 'Data found successfully!',
			data: {
				data: res,
			},
		});
	}

	public async getList(body: any, req: any, resp: any) {
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;
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
		const sortType = body?.sortType ? body?.sortType : 'desc';
		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 10 : parseInt(body.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;
		let status = body?.status;
		let filterQueryArray = [];

		if (body?.reassign) {
			filterQueryArray.push(
				`{_not: {group_users: {status: {_eq: "active"}, group: {status: {_in: ["registered", "camp_ip_verified", "change_required"]}}}}},{ program_beneficiaries: {facilitator_user: { program_faciltators: { parent_ip: { _eq: "${req.parent_ip_id}" } ,program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}}} } } }`,
			);
		} else {
			filterQueryArray.push(
				`{ program_beneficiaries: {facilitator_user: { program_faciltators: { parent_ip: { _eq: "${req.parent_ip_id}" },program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}} }},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}}  } }`,
			);
		}

		if (body.search && body.search !== '') {
			let first_name = body.search.split(' ')[0];
			let last_name = body.search.split(' ')[1] || '';

			if (last_name?.length > 0) {
				filterQueryArray.push(`{ _or: [
					{ first_name: { _ilike: "%${first_name}%" } },
					{ last_name: { _ilike: "%${last_name}%" } },
					{
						program_beneficiaries: {
							_or: [
								{ enrollment_first_name: { _ilike: "%${first_name}%" } },
								{ enrollment_last_name: { _ilike: "%${last_name}%" } }
							]
						}
					}
				]} `);
			} else {
				filterQueryArray.push(`{_or: [
				{ first_name: { _ilike: "%${first_name}%" } }
				{ last_name: { _ilike: "%${first_name}%" } }
				{
					program_beneficiaries: {
						_or: [
							{ enrollment_first_name: { _ilike: "%${first_name}%" } },
							{ enrollment_last_name: { _ilike: "%${first_name}%" } }
						]
					}
				}
				 ]} `);
			}
		}

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
			filterQueryArray.push(`{is_duplicate:{_eq:${body?.is_duplicate}}}`);
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

		// facilitator_user is the relationship of program_beneficiaries.facilitator_id  to  users.id
		const data = {
			query: `query MyQuery($limit:Int, $offset:Int) {
				users_aggregate(where:${filterQuery}) {
					aggregate {
						count
					}
				}
				users(where: ${filterQuery},
					limit: $limit,
					offset: $offset,
					order_by: {
						created_at: ${sortType}
					}
				) {
					id
					first_name
					last_name
					state
					district
					block
					mobile
					dob
					is_duplicate
					is_deactivated
					program_beneficiaries {
						id
						subjects
						facilitator_id
						status
						enrollment_date
						enrollment_dob
						enrollment_first_name
						enrollment_last_name
						enrollment_verification_status
						enrollment_verification_reason
						facilitator_user {
							id
							first_name
							middle_name
							last_name
						}
					}
					profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
						id
						name
						doument_type
						document_sub_type
						path
					}
				}
			}`,
			variables: {
				limit: limit,
				offset: offset,
			},
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let mappedResponse = response?.data?.users;
		const count = response?.data?.users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);
		if (!mappedResponse || mappedResponse.length < 1) {
			return resp.status(200).send({
				success: false,
				status: 'Not Found',
				message: 'Beneficiaries Not Found',
				data: {},
			});
		} else {
			mappedResponse = await Promise.all(
				mappedResponse?.map(async (e) => {
					let mappedData = {
						...e,
						['program_beneficiaries']:
							e?.['program_beneficiaries']?.[0],
						['profile_photo_1']:
							e?.['profile_photo_1']?.[0] || null,
					};
					if (mappedData?.profile_photo_1?.id) {
						const { success, data: fileData } =
							await this.uploadFileService.getDocumentById(
								mappedData?.profile_photo_1?.id,
							);
						if (success && fileData?.fileUrl) {
							mappedData.profile_photo_1.fileUrl =
								fileData.fileUrl;
						}
					}
					return mappedData;
				}),
			);

			return resp.status(200).json({
				success: true,
				message: 'Benificiaries found success!',
				data: {
					totalCount: count,
					data: mappedResponse,
					limit,
					currentPage: page,
					totalPages: `${totalPages}`,
				},
			});
		}
	}

	public async findAll(body: any, req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;
		if (!user?.data?.id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Facilitator',
				data: {},
			});
		}
		const status = body?.status;
		const sortType = body?.sortType ? body?.sortType : 'desc';
		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);

		let offset = page > 1 ? limit * (page - 1) : 0;

		let filterQueryArray = [];
		// only facilitator_id learners lits
		filterQueryArray.push(
			`{program_beneficiaries: {facilitator_id: {_eq: ${user.data.id}},program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}}}}`,
		);

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

		if (body.search && body.search !== '') {
			let first_name = body.search.split(' ')[0];
			let last_name = body.search.split(' ')[1] || '';

			if (last_name?.length > 0) {
				filterQueryArray.push(`{_or: [
				{ first_name: { _ilike: "%${first_name}%" } }
				{ last_name: { _ilike: "%${last_name}%" } }
				 ]} `);
			} else {
				filterQueryArray.push(`{_or: [
				{ first_name: { _ilike: "%${first_name}%" } }
				{ last_name: { _ilike: "%${first_name}%" } }
				 ]} `);
			}
		}
		if (body?.is_deactivated && body?.is_deactivated !== '') {
			filterQueryArray.push(
				`{is_deactivated:{_eq:"${body?.is_deactivated}"}}`,
			);
		}

		if (body?.is_duplicate && body?.is_duplicate !== '') {
			filterQueryArray.push(
				`{is_duplicate:{_eq:"${body?.is_duplicate}"}}`,
			);
		}
		if (
			body?.enrollment_verification_status &&
			body?.enrollment_verification_status !== ''
		) {
			filterQueryArray.push(
				`{program_beneficiaries:{enrollment_verification_status:{_eq:${body?.enrollment_verification_status}}}}`,
			);
		}
		let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';

		let data = {
			query: `query MyQuery($limit:Int, $offset:Int) {
				users_aggregate(where:${filterQuery}) {
					aggregate {
						count
					}
				}
				users(where: ${filterQuery},
					limit: $limit,
					offset: $offset,
					order_by: {
						created_at: ${sortType}
					}
				) {
					aadhaar_verification_mode
					aadhar_no
					aadhar_token
					aadhar_verified
					address
					address_line_1
					address_line_2
					alternative_mobile_number
					block
					block_id
					block_village_id
					created_at
					created_by
					district
					district_id
					dob
					duplicate_reason
					email_id
					email_verified
					first_name
					gender
					grampanchayat
					id
					is_duplicate
					is_deactivated
					keycloak_id
					last_name
					lat
					long
					middle_name
					mobile
					mobile_no_verified
					password
					pincode
					profile_photo_1: documents (where: { document_sub_type: {_eq: "profile_photo_1"}}) {
						id
						name
						doument_type
						document_sub_type
						path
					}
					profile_photo_2: documents (where: { document_sub_type: {_eq: "profile_photo_2"}}) {
						id
						name
						doument_type
						document_sub_type
						path
					}
					profile_photo_3: documents (where: { document_sub_type: {_eq: "profile_photo_3"}}) {
						id
						name
						doument_type
						document_sub_type
						path
					}
					profile_url
					state
					state_id
					updated_at
					updated_by
					village
					username
					documents{
					context
					context_id
					created_by
					document_sub_type
					doument_type
					id
					name
					path
					provider
					updated_by
					user_id
						}
					program_beneficiaries{
						id
						enrollment_status
						enrolled_for_board
						type_of_enrollement
						subjects
						academic_year_id
						payment_receipt_document_id
						program_id
						enrollment_number
						status
						reason_for_status_update
						documents_status
						document_checklist
						updated_by
						user_id
						facilitator_id
						created_by
						beneficiaries_found_at
						enrollment_date
						enrollment_first_name
						enrollment_middle_name
						enrollment_last_name
						enrollment_dob
						enrollment_aadhaar_no
						is_eligible
						enrollment_verification_status
						enrollment_verification_reason
						document {
							context
							context_id
							created_by
							document_sub_type
							doument_type
							id
							name
							path
							provider
							updated_by
							user_id
						}
					}
					core_beneficiaries {
						career_aspiration
						updated_by
						mark_as_whatsapp_number
						alternative_device_ownership
						alternative_device_type
						father_first_name
						father_middle_name
						father_last_name
						mother_first_name
						mother_last_name
						mother_middle_name
						career_aspiration_details
						enrollment_number
						type_of_learner
						status
						reason_of_leaving_education
						previous_school_type
						mobile_ownership
						learner_wish_to_pursue_education
						last_standard_of_education_year
						last_standard_of_education
						last_school_type
						id
						connect_via_refrence
						created_by
						device_ownership
						device_type
						document_id
						enrolled_for_board
						enrollement_status
						parent_support
					}
					extended_users {
						marital_status
						designation
						created_by
						id
						user_id
						updated_by
						social_category
						qualification_id
					}

				}
			}`,
			variables: {
				limit: limit,
				offset: offset,
			},
		};

		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.users;

		let mappedResponse = result;
		const count = response?.data?.users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);

		if (!mappedResponse || mappedResponse.length < 1) {
			return resp.status(200).send({
				success: false,
				status: 'Not Found',
				message: 'Beneficiaries Not Found',
				data: {},
			});
		} else {
			mappedResponse = await Promise.all(
				mappedResponse?.map(async (e) => {
					let mappedData = {
						...e,
						['program_faciltators']:
							e?.['program_faciltators']?.[0],
						['program_beneficiaries']:
							e?.['program_beneficiaries']?.[0],
						['profile_photo_1']: e?.['profile_photo_1']?.[0] || {},
						['profile_photo_2']: e?.['profile_photo_2']?.[0] || {},
						['profile_photo_3']: e?.['profile_photo_3']?.[0] || {},
					};
					if (mappedData?.profile_photo_1?.id) {
						const { success, data: fileData } =
							await this.uploadFileService.getDocumentById(
								mappedData?.profile_photo_1?.id,
							);
						if (success && fileData?.fileUrl) {
							mappedData.profile_photo_1.fileUrl =
								fileData.fileUrl;
						}
					}
					if (mappedData?.profile_photo_2?.id) {
						const { success, data: fileData } =
							await this.uploadFileService.getDocumentById(
								mappedData?.profile_photo_2?.id,
							);
						if (success && fileData?.fileUrl) {
							mappedData.profile_photo_2.fileUrl =
								fileData.fileUrl;
						}
					}
					if (mappedData?.profile_photo_3?.id) {
						const { success, data: fileData } =
							await this.uploadFileService.getDocumentById(
								mappedData?.profile_photo_3?.id,
							);
						if (success && fileData?.fileUrl) {
							mappedData.profile_photo_3.fileUrl =
								fileData.fileUrl;
						}
					}
					return mappedData;
				}),
			);
			return resp.status(200).json({
				success: true,
				message: 'Benificiaries found success!',
				data: {
					totalCount: count,
					data: mappedResponse,
					limit,
					currentPage: page,
					totalPages: `${totalPages}`,
				},
			});
		}
	}

	public async findOne(id: number, resp?: any) {
		let data = {
			query: `query searchById {
				users_by_pk(id: ${id}) {
				aadhaar_verification_mode
				aadhar_no
				aadhar_token
				aadhar_verified
				address
				address_line_1
				address_line_2
				alternative_mobile_number
				block
				block_id
				block_village_id
				created_at
				created_by
				district
				district_id
				dob
				duplicate_reason
				email_id
				email_verified
				first_name
				gender
				grampanchayat
				id
				is_duplicate
				is_deactivated
				keycloak_id
				last_name
				lat
				long
				middle_name
				mobile
				mobile_no_verified
				password
				pincode
				aadhaar_front: documents(where: {document_sub_type: {_eq: "aadhaar_front"}}) {
					id
					name
					doument_type
					document_sub_type
					path
					}
				aadhaar_back: documents(where: {document_sub_type: {_eq: "aadhaar_back"}}) {
					id
					name
					doument_type
					document_sub_type
					path
					}
				profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
					id
					name
					doument_type
					document_sub_type
					path
					}
					profile_photo_2: documents(where: {document_sub_type: {_eq: "profile_photo_2"}}) {
					id
					name
					doument_type
					document_sub_type
					path
					}
					profile_photo_3: documents(where: {document_sub_type: {_eq: "profile_photo_3"}}) {
					id
					name
					doument_type
					document_sub_type
					path
					}
				profile_url
				state
				state_id
				updated_at
				updated_by
				village
				username
				documents{
				context
				context_id
				created_by
				document_sub_type
				doument_type
				id
				name
				path
				provider
				updated_by
				user_id
				  }
				program_beneficiaries {
				id
				enrollment_status
				enrolled_for_board
				subjects
				academic_year_id
				payment_receipt_document_id
				program_id
				enrollment_number
				status
				type_of_enrollement
				reason_for_status_update
				documents_status
				document_checklist
				updated_by
				user_id
				facilitator_id
				created_by
				beneficiaries_found_at
				enrollment_date
				enrollment_first_name
				enrollment_middle_name
				enrollment_last_name
				enrollment_dob
				enrollment_aadhaar_no
				is_eligible
				enrollment_verification_status
				enrollment_verification_reason
				enrollment_mobile_no
				document {
					context
					context_id
					created_by
					document_sub_type
					doument_type
					id
					name
					path
					provider
					updated_by
					user_id
				  }
				type_of_support_needed
				learning_motivation
				learning_level
			  }
			  core_beneficiaries {
				career_aspiration
				updated_by
				mark_as_whatsapp_number
				alternative_device_ownership
				alternative_device_type
				father_first_name
				type_of_enrollement
				father_middle_name
				father_last_name
				mother_first_name
				mother_last_name
				mother_middle_name
				career_aspiration_details
				enrollment_number
				type_of_learner
				status
				reason_of_leaving_education
				previous_school_type
				mobile_ownership
				learner_wish_to_pursue_education
				last_standard_of_education_year
				last_standard_of_education
				last_school_type
				id
				connect_via_refrence
				created_by
				device_ownership
				device_type
				document_id
				enrolled_for_board
				enrollement_status
				parent_support
				education_10th_date
				education_10th_exam_year
				scholarship_order_id
			  }
			  program_users {
				organisation_id
			  }
			  references {
				id
				name
				first_name
				last_name
				middle_name
				relation
				contact_number
				designation
				document_id
				type_of_document
				context
				context_id
			  }
			  extended_users {
				marital_status
				designation
				created_by
				id
				user_id
				updated_by
				social_category
				qualification_id
			  }
			}
		  }
		  `,
		};

		const response = await this.hasuraServiceFromServices.getData(data);
		let result: any = response?.data?.users_by_pk;
		if (!result) {
			if (resp) {
				return resp.status(404).send({
					success: false,
					status: 'Not Found',
					message: 'Benificiaries Not Found',
					data: {},
				});
			} else {
				return { success: false };
			}
		} else {
			let mappedData = {
				...result,
				['program_beneficiaries']:
					result?.['program_beneficiaries']?.[0] || {},
				['profile_photo_1']: result?.['profile_photo_1']?.[0] || {},
				['profile_photo_2']: result?.['profile_photo_2']?.[0] || {},
				['profile_photo_3']: result?.['profile_photo_3']?.[0] || {},
				['aadhaar_front']: result?.['aadhaar_front']?.[0] || {},
				['aadhaar_back']: result?.['aadhaar_back']?.[0] || {},
				['program_users']: result?.['program_users']?.[0] || {},
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
			if (mappedData?.profile_photo_2?.id) {
				const { success, data: fileData } =
					await this.uploadFileService.getDocumentById(
						mappedData?.profile_photo_2?.id,
					);
				if (success && fileData?.fileUrl) {
					mappedData.profile_photo_2.fileUrl = fileData.fileUrl;
				}
			}
			if (mappedData?.profile_photo_3?.id) {
				const { success, data: fileData } =
					await this.uploadFileService.getDocumentById(
						mappedData?.profile_photo_3?.id,
					);
				if (success && fileData?.fileUrl) {
					mappedData.profile_photo_3.fileUrl = fileData.fileUrl;
				}
			}
			if (resp) {
				return resp.status(200).json({
					success: true,
					message: 'Benificiaries found successfully!',
					data: { result: mappedData },
				});
			} else {
				return {
					success: true,
					data: mappedData,
				};
			}
		}
	}

	update(id: number, req: any) {
		// return this.hasuraService.update(+id, this.table, req, this.returnFields);
	}

	remove(id: number) {
		// return this.hasuraService.delete(this.table, { id: +id });
	}

	public async deactivateDuplicateBeneficiaries(
		AadhaarNo: string,
		exceptId: number,
		createdBy: number,
	) {
		// Store previous data before update
		const getQuery = `
			query MyQuery {
				users (
					where: {
						aadhar_no: {_eq: "${AadhaarNo}"}
					}
				) {
					id
					aadhar_no
					is_duplicate
					is_deactivated
					duplicate_reason
					program_beneficiaries {
						status
					}
				}
			}
		`;

		const preUpdateData = (
			await this.hasuraServiceFromServices.getData({ query: getQuery })
		).data?.users;
		const preUpdateDataObj = {};
		preUpdateData.forEach(
			(userData) => (preUpdateDataObj[userData.id] = userData),
		);
		const query = `
			mutation MyMutation {
				update_users_many (
					updates: [
						{
							where: {
								aadhar_no: {_eq: "${AadhaarNo}"},
								id: {_neq: ${exceptId}}
							},
							_set: {
								is_deactivated: true
							}
						},
						{
							where: {
								id: {_eq: ${exceptId}},
							},
							_set: {
								is_deactivated: false
							}
						}
					]
				) {
					returning {
						id
						aadhar_no
						is_duplicate
						is_deactivated
						duplicate_reason
					}
				}

				update_program_beneficiaries (
					where: {
						user: {
							aadhar_no: {_eq: "${AadhaarNo}"},
							id: {_neq: ${exceptId}}
						}
					},
					_set: {
						status: "deactivated"
					}
				) {
					returning {
						status
					}
				}
			}
		`;

		await this.hasuraServiceFromServices.getData({ query });

		const fetchUpdatedResultQuery = `
			query MyQuery {
				users (where: {aadhar_no: {_eq: "${AadhaarNo}"}}) {
					id
					aadhar_no
					is_duplicate
					is_deactivated
					duplicate_reason
					program_beneficiaries {
						status
					}
				}
			}
		`;

		const updateResult = (
			await this.hasuraServiceFromServices.getData({
				query: fetchUpdatedResultQuery,
			})
		)?.data?.users;

		// Add audit logs of is_duplicate flag
		await Promise.allSettled(
			updateResult.map(
				(updatedUserObj) =>
					// Promise.allSettled(
					// 	updatedData.returning.map((updatedUserObj) =>
					this.userService.addAuditLog(
						updatedUserObj.id,
						createdBy,
						'program_beneficiaries.status',
						updatedUserObj.id,
						{
							status: preUpdateDataObj[updatedUserObj.id]
								.program_beneficiaries[0]?.status,

							is_duplicate:
								preUpdateDataObj[updatedUserObj.id]
									.is_duplicate,
							duplicate_reason:
								preUpdateDataObj[updatedUserObj.id]
									.duplicate_reason,
							is_deactivated:
								preUpdateDataObj[updatedUserObj.id]
									.is_deactivated,
						},
						{
							status: updatedUserObj.program_beneficiaries[0]
								?.status,
							is_duplicate: updatedUserObj.is_duplicate,
							duplicate_reason: updatedUserObj.duplicate_reason,
							is_deactivated: updatedUserObj.is_deactivated,
						},
						[
							'status',
							'is_duplicate',
							'duplicate_reason',
							'is_deactivated',
						],
					),
				// 	),
				// ),
			),
		);

		return {
			success: !!updateResult,
			data: updateResult || null,
		};
	}

	public async statusUpdate(body: any, request: any) {
		const status_response =
			await this.beneficiariesCoreService.statusUpdate(
				body,

				request,
			);

		if (body?.status == 'dropout' || body?.status == 'rejected') {
			//check if the learner is active in any camp and update the status to inactive

			let status = 'inactive'; // learner status to be updated in camp

			await this.updateGroupMembershipStatusForUser(
				body?.user_id,
				status,
			);
		}

		return {
			status: 200,
			success: true,
			message: 'Status Updated successfully!',
			data: (
				await this.beneficiariesCoreService.userById(
					status_response?.program_beneficiaries?.user_id,
				)
			).data,
		};
	}

	public async statusUpdateByIp(body: any, request: any) {
		const user = await this.userService.ipUserInfo(request);
		const program_id = request.mw_program_id;
		const academic_year_id = request.mw_academic_year_id;
		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return {
				success: false,
				message: 'Invalid Ip',
				data: {},
			};
		}
		let organisation_id = user?.data?.program_users?.[0]?.organisation_id;

		//check validation for id benlongs to same IP under prerak
		let data = {
			query: `query MyQuery {
				users(where: {program_faciltators: {parent_ip: {_eq: "${organisation_id}"},academic_year_id:{_eq:${academic_year_id}},program_id:{_eq:${program_id}}, beneficiaries: {user_id: {_eq: ${body?.user_id}}}}}){
				  program_faciltators{
					parent_ip
				  }
				}
			  }`,
		};

		const result = await this.hasuraServiceFromServices.getData(data);

		if (result?.data?.users?.length == 0) {
			return {
				status: 401,
				success: false,
				message: 'IP_ACCESS_DENIED',
				data: {},
			};
		}
		const status_response =
			await this.beneficiariesCoreService.statusUpdate(body, request);

		if (body?.status == 'dropout' || body?.status == 'rejected') {
			//check if the learner is active in any camp and update the status to inactive

			let status = 'inactive'; // learner status to be updated in camp

			await this.updateGroupMembershipStatusForUser(
				body?.user_id,
				status,
			);
		}

		return {
			status: 200,
			success: true,
			message: 'Status Updated successfully!',
			data: (
				await this.beneficiariesCoreService.userById(
					status_response?.program_beneficiaries?.user_id,
				)
			).data,
		};
	}

	public async updateGroupMembershipStatusForUser(id, status) {
		const user_id = parseInt(id);
		let query = `query MyQuery {
					group_users(where: {user_id: {_eq:${user_id}}, status: {_eq:"active"}}){
					 group_id
					  user_id
					  status
					  id
					}
				  }
				  `;

		const result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let group_users_data = result?.data?.group_users;

		let group_id = result?.data?.group_users?.[0]?.group_id;

		//if active learner in a camp then update the camp status to inactive

		if (group_users_data?.length > 0) {
			let update_body = {
				status: status,
			};

			let group_user_id = group_users_data?.[0].id;
			await this.hasuraService.q(
				'group_users',
				{
					...update_body,
					id: group_user_id,
				},
				['status'],
				true,
				['id', 'status'],
			);
		}

		//check if after status update camp have learners

		let group_validation_query = `query MyQuery {
			groups(where: {id: {_eq: ${group_id}}, group_users: {status: {_eq: "active"}, member_type: {_eq: "member"}}}){
			  id
			}
		  }
		  `;
		let group_validation_response =
			await this.hasuraServiceFromServices.getData({
				query: group_validation_query,
			});

		if (group_validation_response?.data?.groups?.length == 0) {
			let update_body = {
				status: 'inactive',
			};
			await this.hasuraService.q(
				'groups',
				{
					...update_body,
					id: group_id,
				},
				['status'],
				true,
				['id', 'status'],
			);
		}

		return;
	}

	public async setEnrollmentStatus(body: any, request: any) {
		const { data: updatedUser } =
			await this.beneficiariesCoreService.userById(body.user_id);
		const allEnrollmentStatuses = this.enumService
			.getEnumValue('ENROLLEMENT_VERIFICATION_STATUS')
			.data.map((enumData) => enumData.value);

		if (
			!allEnrollmentStatuses.includes(body.enrollment_verification_status)
		) {
			return {
				status: 400,
				success: false,
				message: `Invalid status`,
				data: {},
			};
		}

		delete body.status;

		if (body.enrollment_verification_status == 'verified') {
			body.status = 'enrolled_ip_verified';
		}

		if (body.enrollment_verification_status == 'pending') {
			body.status = 'not_enrolled';
			body.enrollment_status = 'not_enrolled';
			body.enrollment_date = null;
			body.enrollment_first_name = null;
			body.enrollment_middle_name = null;
			body.enrollment_last_name = null;
			body.enrollment_dob = null;
			body.enrollment_aadhaar_no = null;
			body.enrollment_number = null;
			body.enrolled_for_board = null;
			body.subjects = null;
			body.payment_receipt_document_id = null;
			body.is_eligible = null;
		}

		const res = await this.hasuraService.q(
			'program_beneficiaries',
			{
				...body,
				id: updatedUser?.program_beneficiaries?.id,
			},
			[],
			true,
			[...this.returnFields, 'id'],
		);

		if (body.enrollment_verification_status == 'pending') {
			const data = {
				query: `query MyQuery {
					documents(where: {doument_type: {_eq: "enrollment_receipt"},user_id:{_eq:${updatedUser?.program_beneficiaries?.user_id}}}){
					  id
					  name
					}
				  }
				  `,
			};

			const response = await this.hasuraServiceFromServices.getData(data);
			const documentDetails = response?.data?.documents;
			if (documentDetails?.length > 0) {
				//delete document from documnet table
				// await this.hasuraService.delete('documents', {
				// 	id: documentDetails?.id,
				// });
				// if (documentDetails?.name) {
				// 	//delete document from s3 bucket
				// 	await this.s3Service.deletePhoto(documentDetails?.name);
				// }

				for (const documentDetail of documentDetails) {
					await this.uploadFileService.DeleteFile(documentDetail);
				}
			}
		}

		const newdata = (
			await this.beneficiariesCoreService.userById(
				res?.program_beneficiaries?.user_id,
			)
		).data;

		await this.userService.addAuditLog(
			body?.user_id,
			request.mw_userid,
			'program_beneficiaries.status',
			updatedUser?.program_beneficiaries?.id,
			{
				status: updatedUser?.program_beneficiaries?.status,
				reason_for_status_update:
					updatedUser?.program_beneficiaries
						?.reason_for_status_update,
			},
			{
				status: newdata?.program_beneficiaries?.status,
				reason_for_status_update:
					newdata?.program_beneficiaries?.reason_for_status_update,
			},
			['status', 'reason_for_status_update'],
		);
		return {
			status: 200,
			success: true,
			message: 'Status Updated successfully!',
			data: (
				await this.beneficiariesCoreService.userById(
					res?.program_beneficiaries?.user_id,
				)
			).data,
		};
	}

	public async registerBeneficiary(body, request) {
		const user = await this.userService.ipUserInfo(request);
		const password = body.mobile;
		let username = body.first_name;
		username += `_${body.mobile}`;

		const data_to_create_user = {
			enabled: 'true',
			firstName: body.first_name,
			username: username.toLowerCase(),
			credentials: [
				{
					type: 'password',
					value: password,
					temporary: false,
				},
			],
			groups: ['beneficiaries'],
		};

		try {
			const { headers, status } = await this.keycloakService.createUser(
				data_to_create_user,
			);

			if (headers.location) {
				const split = headers.location.split('/');
				const keycloak_id = split[split.length - 1];
				body.keycloak_id = keycloak_id;
				const result = await this.newCreate(body);

				return {
					status,
					message: 'User created successfully',
					data: {
						user: result?.data,
						keycloak_id: keycloak_id,
						username: username,
					},
				};
			} else {
				throw new BadRequestException(
					'Error while generating admin token !',
				);
			}
		} catch (e) {
			throw new HttpException(e.message, HttpStatus.CONFLICT, {
				cause: e,
			});
		}
	}

	async create(req: any, request, response, update = false) {
		const user = await this.userService.ipUserInfo(request);
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;

		const { data: beneficiaryUser } =
			await this.beneficiariesCoreService.userById(req.id);
		if (!beneficiaryUser) {
			return response.status(400).json({
				success: false,
				message: 'Invalid user_id!',
			});
		}
		const user_id = req?.id;
		const PAGE_WISE_UPDATE_TABLE_DETAILS = {
			edit_basic: {
				users: ['first_name', 'last_name', 'middle_name', 'dob'],
			},
			add_ag_duplication: {
				users: ['aadhar_no', 'is_duplicate', 'duplicate_reason'],
			},
			add_aadhaar_verification: {
				users: ['aadhar_verified'],
			},
			add_contact: {
				core_beneficiaries: [
					'user_id',
					'device_ownership',
					'device_type',
				],
			},
			edit_contact: {
				users: ['mobile', 'alternative_mobile_number', 'email_id'],
				core_beneficiaries: [
					'user_id',
					'mark_as_whatsapp_number',
					'device_ownership',
					'device_type',
					'alternative_device_ownership',
					'alternative_device_type',
				],
			},
			add_address: {
				users: [
					'lat',
					'long',
					'address',
					'address_line_1',
					'address_line_2',
					'state',
					'district',
					'block',
					'village',
					'grampanchayat',
					'pincode',
				],
			},
			edit_address: {
				users: [
					'lat',
					'long',
					'state',
					'district',
					'block',
					'village',
					'grampanchayat',
					'address',
					'pincode',
				],
			},
			personal: {
				extended_users: [
					'user_id',
					'social_category',
					'marital_status',
				],
			},
			edit_family: {
				core_beneficiaries: [
					'user_id',
					'father_first_name',
					'father_middle_name',
					'father_last_name',
					'mother_first_name',
					'mother_middle_name',
					'mother_last_name',
				],
			},
			add_education: {
				core_beneficiaries: [
					'user_id',
					'type_of_learner',
					'last_standard_of_education',
					'last_standard_of_education_year',
					'previous_school_type',
					'reason_of_leaving_education',
					'education_10th_date',
					'education_10th_exam_year',
				],
				program_beneficiaries: ['learning_level'],
			},
			edit_education: {
				core_beneficiaries: [
					'user_id',
					'type_of_learner',
					'last_standard_of_education',
					'last_standard_of_education_year',
					'previous_school_type',
					'reason_of_leaving_education',
					'education_10th_date',
					'education_10th_exam_year',
				],
				program_beneficiaries: ['learning_level'],
			},
			add_other_details: {
				program_beneficiaries: [
					'learning_motivation',
					'type_of_support_needed',
				],
			},
			edit_other_details: {
				program_beneficiaries: [
					'learning_motivation',
					'type_of_support_needed',
				],
			},
			edit_further_studies: {
				core_beneficiaries: [
					'user_id',
					'career_aspiration',
					'career_aspiration_details',
					'parent_support',
				],
				program_beneficiaries: [
					'learning_motivation',
					'type_of_support_needed',
				],
			},
			edit_enrollement: {
				program_beneficiaries: [
					'enrollment_number',
					'enrollment_status',
					'enrolled_for_board',
					'type_of_enrollement',
					'subjects',
					'program_id',
					'academic_year_id',
					'payment_receipt_document_id',
					'enrollment_date',
					'enrollment_first_name',
					'enrollment_middle_name',
					'enrollment_last_name',
					'enrollment_dob',
					//	'enrollment_aadhaar_no',
					'enrollment_mobile_no',
					'is_eligible',
				],
			},
			edit_enrollement_details: {
				program_beneficiaries: [
					'enrollment_first_name',
					'enrollment_middle_name',
					'enrollment_last_name',
					'enrollment_dob',
					'is_eligible',
				],
			},
			//update document status
			document_status: {
				program_beneficiaries: [
					'user_id',
					'program_id',
					'academic_year_id',
					'documents_status',
				],
			},
			edit_reference: {
				references: [
					'first_name',
					'middle_name',
					'last_name',
					'relation',
					'contact_number',
					'context',
					'context_id',
				],
			},
		};

		switch (req.edit_page_type) {
			case 'edit_basic': {
				// Update Users table data
				const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_basic.users;
				const tableName = 'users';
				const newReq = { ...req, ...(req?.dob == '' && { dob: null }) };
				await this.hasuraService.q(tableName, newReq, userArr, update);
				break;
			}

			case 'add_ag_duplication': {
				const aadhaar_no = req.aadhar_no;

				if (!aadhaar_no) {
					return response.status(400).json({
						success: false,
						message: 'Invalid Aadhaar number!',
					});
				}

				// Check if aadhaar already exists or not
				let hasuraResponse =
					await this.hasuraServiceFromServices.findAll('users', {
						aadhar_no: aadhaar_no,
					});

				if (
					hasuraResponse.data?.users?.some(
						(user) => user.program_faciltators[0]?.id,
					)
				) {
					return response.status(400).json({
						success: false,
						message: 'Sorry! You can not add this Aadhaar number!',
					});
				}

				if (
					hasuraResponse?.data?.users_aggregate?.aggregate.count >
						0 &&
					req.is_duplicate !== 'yes'
				) {
					return response.status(400).json({
						success: false,
						message: 'Duplicate Beneficiary detected!',
					});
				}

				if (
					req.mw_roles.includes('facilitator') &&
					hasuraResponse?.data.users.some(
						(user) =>
							user.program_beneficiaries[0]?.facilitator_id ==
							req.mw_userid,
					)
				) {
					return response.status(400).json({
						success: false,
						message: 'You have already added this Aadhaar number!',
					});
				}

				if (
					hasuraResponse?.data?.users_aggregate?.aggregate.count <=
						0 &&
					req.is_duplicate === 'yes'
				) {
					return response.status(400).json({
						success: false,
						message: 'Invalid duplicate flag!',
					});
				}

				if (
					req.is_duplicate === 'yes' &&
					!(
						req.duplicate_reason &&
						typeof req.duplicate_reason === 'string' &&
						req.duplicate_reason.trim()
					)
				) {
					return response.status(400).json({
						success: false,
						message: 'Please send valid duplicate reason!',
					});
				}

				// check beneficiary status

				let query = `query MyQuery {
					users(where: {_or: [{is_deactivated: {_is_null: true}}, {is_deactivated: {_eq: false}}], aadhar_no: {_eq:"${req?.aadhar_no}"}, program_beneficiaries: {academic_year_id: {_eq:${academic_year_id}}, program_id: {_eq:${program_id}}, status: {_in: ["enrolled_ip_verified", "registered_in_camp", "10th_passed"]}}}) {
					  id
					  program_beneficiaries {
						status
					  }
					}
				  }

				  `;

				const hashura_response =
					await this.hasuraServiceFromServices.getData({
						query: query,
					});

				if (hashura_response?.data?.users?.length > 0) {
					{
						return response.status(422).json({
							success: false,
							message:
								'Cannot update details for IP verified beneficiary !',
						});
					}
				}
				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_ag_duplication.users;
				const tableName = 'users';
				const updatedCurrentUser = (
					await this.hasuraService.q(
						tableName,
						req,
						userArr,
						update,
						['id', 'is_duplicate', 'duplicate_reason'],
					)
				).users;

				// Audit duplicate flag history
				if (updatedCurrentUser?.id) {
					await this.userService.addAuditLog(
						updatedCurrentUser.id,
						request.mw_userid,
						'program_beneficiaries.status',
						updatedCurrentUser.id,
						{
							is_duplicate: beneficiaryUser.is_duplicate,
							duplicate_reason: beneficiaryUser.duplicate_reason,
						},
						{
							is_duplicate: updatedCurrentUser.is_duplicate,
							duplicate_reason:
								updatedCurrentUser.duplicate_reason,
						},
						['is_duplicate', 'duplicate_reason'],
					);
				}

				if (req.is_duplicate === 'yes') {
					// Store previous data before update
					let getQuery = `
						query MyQuery {
							users(
								where: {
									_and: [
										{ id: { _neq: ${beneficiaryUser.id} } },
										{ aadhar_no: { _eq: "${aadhaar_no}" } }
									]
								}
							) {
								id
								aadhar_no
								is_deactivated
								is_duplicate
								duplicate_reason
							}
						}
					`;

					const preUpdateData = (
						await this.hasuraServiceFromServices.getData({
							query: getQuery,
						})
					).data.users;
					const preUpdateDataObj = {};
					preUpdateData.forEach(
						(userData) =>
							(preUpdateDataObj[userData.id] = userData),
					);

					// Mark other beneficiaries as duplicate where duplicate reason is null
					// Set is_deactivated flag from false to null for activated beneficiary after resolving duplications
					const query = `
						mutation MyMutation {
							update_users_many (
								updates: [
									{
										where: {
											_and: [
												{ id: { _neq: ${beneficiaryUser.id} } },
												{ aadhar_no: { _eq: "${aadhaar_no}" } },
												{
													_or: [
														{ is_deactivated: {_is_null: true} },
														{ is_deactivated: {_neq: false} },
													]
												},
												{
													_or: [
														{ is_duplicate: { _neq: "yes" } },
														{ is_duplicate: { _is_null: true } }
														{ duplicate_reason: { _is_null: true } }
													]
												}
											]
										},
										_set: {
											is_duplicate: "yes",
											duplicate_reason: "FIRST_TIME_REGISTRATION"
										}
									},
									{
										where: {
											_and: [
												{ id: { _neq: ${beneficiaryUser.id} } },
												{ aadhar_no: { _eq: "${aadhaar_no}" } },
												{ is_deactivated: { _eq: false } }
											]
										},
										_set: {
											is_deactivated: null
										}
									}
								]
							) {
								returning {
									id
									aadhar_no
									is_duplicate
									is_deactivated
									duplicate_reason
								}
							}
						}
					`;

					const updateResult = (
						await this.hasuraServiceFromServices.getData({ query })
					)?.data?.update_users_many;

					await Promise.allSettled(
						updateResult.map((updatedData) =>
							Promise.allSettled(
								updatedData.returning.map((updatedUserObj) =>
									this.userService.addAuditLog(
										updatedUserObj.id,
										request.mw_userid,
										'program_beneficiaries.status',
										updatedUserObj.id,
										{
											is_duplicate:
												preUpdateDataObj[
													updatedUserObj.id
												].is_duplicate,
											duplicate_reason:
												preUpdateDataObj[
													updatedUserObj.id
												].duplicate_reason,
											is_deactivated:
												preUpdateDataObj[
													updatedUserObj.id
												].is_deactivated,
										},
										{
											is_duplicate:
												updatedUserObj.is_duplicate,
											duplicate_reason:
												updatedUserObj.duplicate_reason,
											is_deactivated:
												updatedUserObj.is_deactivated,
										},
										[
											'is_duplicate',
											'duplicate_reason',
											'is_deactivated',
										],
									),
								),
							),
						),
					);
				}
				break;
			}

			case 'add_aadhaar_verification': {
				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_aadhaar_verification
						.users;
				const tableName = 'users';
				await this.hasuraService.q(tableName, req, userArr, update);
				break;
			}

			case 'add_contact': {
				// Update Core Beneficiaries table data
				const coreBeneficiaryArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_contact
						.core_beneficiaries;
				const tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id: user_id,
					},
					coreBeneficiaryArr,
					update,
				);

				break;
			}

			case 'edit_contact': {
				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_contact.users;
				let tableName = 'users';
				await this.hasuraService.q(tableName, req, userArr, update);

				// Update Core Beneficiaries table data
				const coreBeneficiaryArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_contact
						.core_beneficiaries;
				tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id: user_id,
					},
					coreBeneficiaryArr,
					update,
				);

				break;
			}

			case 'add_address': {
				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_address.users;
				let tableName = 'users';
				await this.hasuraService.q(tableName, req, userArr, update);
				break;
			}

			case 'edit_address': {
				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_address.users;
				let tableName = 'users';
				await this.hasuraService.q(tableName, req, userArr, update);
				break;
			}

			case 'personal': {
				// Update Extended Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.personal.extended_users;
				let tableName = 'extended_users';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.extended_users?.id
							? beneficiaryUser?.extended_users?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);
				break;
			}

			case 'edit_family': {
				// Update Core beneficiaries table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_family
						.core_beneficiaries;
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req.father_details,
						...req.mother_details,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);
				break;
			}

			case 'add_education': {
				// Update Core beneficiaries table data
				let userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_education
						.core_beneficiaries;
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);

				// Update educational data in program_beneficiaries table
				userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_education
						.program_beneficiaries;
				const programDetails = beneficiaryUser?.program_beneficiaries;
				tableName = 'program_beneficiaries';

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);
				break;
			}

			case 'edit_education': {
				// Update Core beneficiaries table data
				let userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_education
						.core_beneficiaries;
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);

				// Update educational data in program_beneficiaries table
				userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_education
						.program_beneficiaries;
				const programDetails = beneficiaryUser.program_beneficiaries;
				tableName = 'program_beneficiaries';

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);

				break;
			}

			case 'add_other_details':
			case 'edit_other_details': {
				// Update other details in program_beneficiaries table
				let userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_other_details
						.program_beneficiaries;
				const programDetails = beneficiaryUser.program_beneficiaries;
				let tableName = 'program_beneficiaries';

				req.learning_motivation = req.learning_motivation.length
					? JSON.stringify(req.learning_motivation).replace(
							/"/g,
							'\\"',
					  )
					: null;
				req.type_of_support_needed = req.type_of_support_needed.length
					? JSON.stringify(req.type_of_support_needed).replace(
							/"/g,
							'\\"',
					  )
					: null;

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);
				break;
			}

			case 'edit_further_studies': {
				// Update Core beneficiaries table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_further_studies
						.core_beneficiaries;
				const userArr2 =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_further_studies
						.program_beneficiaries;
				const convertToJsonStr = (arr) =>
					arr.length
						? JSON.stringify(arr).replace(/"/g, '\\"')
						: null;
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						career_aspiration: req?.career_aspiration || null,
						career_aspiration_details:
							req?.career_aspiration_details || null,
						parent_support: req?.parent_support || null,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);
				const programDetails = beneficiaryUser.program_beneficiaries;
				//update further_studies in program_beneficiaries table
				req.aspiration_mapping.learning_motivation = convertToJsonStr(
					req.aspiration_mapping.learning_motivation,
				);
				req.aspiration_mapping.type_of_support_needed =
					convertToJsonStr(
						req.aspiration_mapping.type_of_support_needed,
					);

				await this.hasuraService.q(
					'program_beneficiaries',
					{
						learning_motivation:
							req?.aspiration_mapping.learning_motivation,
						type_of_support_needed:
							req?.aspiration_mapping.type_of_support_needed,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr2,
					update,
				);

				break;
			}
			case 'edit_enrollement': {
				// Check enrollment_number duplication
				if (req.enrollment_number) {
					const enrollmentExists =
						await this.isEnrollmentNumberExists(req.id, req);
					if (enrollmentExists.isUserExist) {
						return response.status(422).json(enrollmentExists);
					}
				}

				// Update enrollement data in Beneficiaries table
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_enrollement
						.program_beneficiaries;
				// const programDetails = beneficiaryUser.program_beneficiaries.find(
				//   (data) =>
				//     req.id == data.user_id &&
				//     req.academic_year_id == 1,
				// );
				const programDetails = beneficiaryUser.program_beneficiaries;
				let tableName = 'program_beneficiaries';
				let myRequest = {};
				// if (
				// 	!beneficiaryUser.aadhar_no ||
				// 	beneficiaryUser.aadhar_no == 'null'
				// ) {
				// 	return response.status(400).send({
				// 		success: false,
				// 		message: 'Aadhaar Number Not Found',
				// 		data: {},
				// 	});
				// }

				if (
					!beneficiaryUser.mobile ||
					beneficiaryUser.mobile == 'null'
				) {
					return response.status(400).send({
						success: false,
						message: 'mobile Number Not Found',
						data: {},
					});
				}

				if (req.enrollment_status == 'enrolled') {
					let messageArray = [];
					let tempArray = [
						'enrollment_number',
						'enrollment_status',
						//	'enrollment_aadhaar_no',
						'enrolled_for_board',
						'subjects',
						'enrollment_date',
						'payment_receipt_document_id',
						'enrollment_mobile_no',
					];
					for (let info of tempArray) {
						if (req[info] === undefined || req[info] === '') {
							messageArray.push(`please send ${info} `);
						}
					}
					if (messageArray.length > 0) {
						return response.status(400).send({
							success: false,
							message: messageArray,
							data: {},
						});
					} else {
						const { edit_page_type, ...copiedRequest } = req;

						myRequest = {
							...copiedRequest,
							subjects:
								typeof req.subjects == 'object'
									? JSON.stringify(req.subjects).replace(
											/"/g,
											'\\"',
									  )
									: null,
						};

						await this.statusUpdate(
							{
								user_id: req.id,
								status: 'enrolled',
								reason_for_status_update: 'enrolled',
							},
							request,
						);
					}
				}
				if (req.enrollment_status == 'ready_to_enroll') {
					myRequest['enrollment_status'] = req?.enrollment_status;
					myRequest['enrollment_number'] = null;
					myRequest['enrolled_for_board'] = null;
					myRequest['subjects'] = null;
					myRequest['payment_receipt_document_id'] = null;
					myRequest['enrollment_date'] = null;
					myRequest['enrollment_first_name'] = null;
					myRequest['enrollment_middle_name'] = null;
					myRequest['enrollment_last_name'] = null;
					myRequest['enrollment_dob'] = null;
					myRequest['enrollment_aadhaar_no'] = null;
					myRequest['is_eligible'] = null;
					const data = {
						query: `query MyQuery {
					documents(where: {doument_type: {_eq: "enrollment_receipt"},user_id:{_eq:${req?.id}}}){
					  id
					  name
					}
				  }
				  `,
					};

					const response =
						await this.hasuraServiceFromServices.getData(data);
					const documentDetails = response?.data?.documents;
					if (documentDetails?.length > 0) {
						//delete document from documnet table
						// await this.hasuraService.delete('documents', {
						// 	id: documentDetails?.id,
						// });
						// if (documentDetails?.name) {
						// 	//delete document from s3 bucket
						// 	await this.s3Service.deletePhoto(documentDetails?.name);
						// }

						for (const documentDetail of documentDetails) {
							await this.uploadFileService.DeleteFile(
								documentDetail,
							);
						}
					}
					const status = await this.statusUpdate(
						{
							user_id: req.id,
							status: req.enrollment_status,
							reason_for_status_update: req.enrollment_status,
						},
						request,
					);
				}
				if (
					req.enrollment_status == 'enrollment_awaited' ||
					req.enrollment_status == 'enrollment_rejected'
				) {
					myRequest['enrolled_for_board'] = req?.enrolled_for_board;
					myRequest['enrollment_status'] = req?.enrollment_status;
					const status = await this.statusUpdate(
						{
							user_id: req.id,
							status: req.enrollment_status,
							reason_for_status_update: req.enrollment_status,
						},
						request,
					);
				}
				const res =
					await this.hasuraServiceFromServices.updateWithVariable(
						programDetails?.id,
						'program_beneficiaries',
						{
							...myRequest,
						},
						userArr,
						update,
						{
							variable: [
								{
									key: 'payment_receipt_document_id',
									type: 'jsonb',
								},
							],
						},
					);

				// await this.hasuraService.q(
				// 	tableName,
				// 	{
				// 		...myRequest,
				// 		id: programDetails?.id ? programDetails.id : null,
				// 	},
				// 	userArr,
				// 	update,
				// );
				break;
			}

			case 'edit_enrollement_details': {
				// Update enrollement data in Beneficiaries table
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_enrollement_details
						.program_beneficiaries;
				// const programDetails = beneficiaryUser.program_beneficiaries.find(
				//   (data) =>
				//     req.id == data.user_id &&
				//     req.academic_year_id == 1,
				// );
				const programDetails = beneficiaryUser.program_beneficiaries;

				let tableName = 'program_beneficiaries';
				let myRequest = {};
				if (programDetails?.enrollment_status !== 'enrolled') {
					return response.status(400).json({
						success: false,
						message:
							'Make Sure Your Enrollement Status is Enrolled',
						data: {},
					});
				}

				let messageArray = [];
				let tempArray = [
					'enrollment_first_name',
					'enrollment_dob',
					'is_eligible',
				];
				for (let info of tempArray) {
					if (req[info] === undefined || req[info] === '') {
						messageArray.push(`please send ${info} `);
					}
				}
				if (messageArray.length > 0) {
					return response.status(400).send({
						success: false,
						message: messageArray,
						data: {},
					});
				} else {
					myRequest = {
						...req,
						...(req?.enrollment_middle_name == '' && {
							enrollment_middle_name: null,
						}),
						...(req?.enrollment_last_name == '' && {
							enrollment_last_name: null,
						}),
					};
				}
				await this.hasuraService.q(
					tableName,
					{
						...myRequest,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);

				const { data: updatedUser } =
					await this.beneficiariesCoreService.userById(req.id);
				if (updatedUser.program_beneficiaries.enrollment_number) {
					let status = null;
					let reason = null;
					if (req?.is_eligible === 'no') {
						status = 'ineligible_for_pragati_camp';
						reason =
							'The age of the learner should not be 14 to 29';
					} else if (req?.is_eligible === 'yes') {
						status = 'enrolled';
						reason = 'enrolled';
					}
					await this.statusUpdate(
						{
							user_id: req.id,
							status,
							reason_for_status_update: reason,
							enrollment_verification_status:
								updatedUser.program_beneficiaries
									?.enrollment_verification_status ===
								'change_required'
									? 'reverification_required'
									: 'pending',
						},
						request,
					);
				}

				break;
			}

			case 'document_status': {
				// Update Document status data in Beneficiaries table
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.document_status
						.program_beneficiaries;
				// const programDetails = beneficiaryUser.program_beneficiaries.find(
				//   (data) =>
				//     req.id == data.user_id &&
				//     req.academic_year_id == 1,
				// );
				const programDetails = beneficiaryUser.program_beneficiaries;
				let tableName = 'program_beneficiaries';

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
						user_id: user_id,
						documents_status:
							typeof req?.documents_status == 'object'
								? JSON.stringify(req?.documents_status).replace(
										/"/g,
										'\\"',
								  )
								: null,
					},
					userArr,
					update,
				);
				break;
			}
			case 'edit_reference': {
				// Update References table data
				const referencesArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_reference.references;
				const tableName = 'references';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.references?.[0]?.id ?? null,
						...(!beneficiaryUser?.references?.[0]?.id && {
							context: 'users',
						}),
						...(!beneficiaryUser?.references?.[0]?.id && {
							context_id: user_id,
						}),
					},
					referencesArr,
					update,
				);
				break;
			}
		}
		const { data: updatedUser } =
			await this.beneficiariesCoreService.userById(user_id);
		return response.status(200).json({
			success: true,
			message: 'User data fetched successfully!',
			data: updatedUser,
		});
	}

	async newCreate(req: any) {
		const tableName = 'users';
		const newR = await this.hasuraService.q(tableName, req, [
			'first_name',
			'last_name',
			'mobile',
			'lat',
			'long',
			'keycloak_id',
		]);
		const user_id = newR[tableName]?.id;
		if (user_id) {
			await this.hasuraService.q(
				`program_beneficiaries`,
				{ ...req, user_id },
				['facilitator_id', 'user_id'],
			);
			await this.hasuraService.q(
				`core_beneficiaries`,
				{ ...req, user_id },
				['device_ownership', 'device_type', 'user_id'],
			);
		}
		return await this.beneficiariesCoreService.userById(user_id);
	}

	public async getAllDuplicatesUnderIp(
		id: number,
		limit?: number,
		skip?: number,
		req?: any,
		res?: any,
	) {
		const user = (await this.findOne(id)).data;
		const academic_year_id = req.mw_academic_year_id;
		const program_id = req.mw_program_id;
		const sql = `
			SELECT
				bu.aadhar_no AS "aadhar_no",
				STRING_AGG(CASE WHEN bu.district IS NOT NULL THEN bu.district ELSE '-' END, ', ') AS "districts",
				STRING_AGG(CASE WHEN bu.block IS NOT NULL THEN bu.block ELSE '-' END, ', ') AS "block",
				COUNT(*) AS "count",
				COUNT(*) OVER() AS "total_count"
			FROM
				users bu
			INNER JOIN
				program_beneficiaries pb
			ON
				bu.id = pb.user_id
			LEFT OUTER JOIN
				users fu
			ON
				pb.facilitator_id = fu.id
			LEFT OUTER JOIN
				program_faciltators pf
			ON
				fu.id = pf.user_id
			WHERE
				pf.parent_ip = '${user?.program_users?.organisation_id}'
							AND
				bu.aadhar_no IS NOT NULL
			AND
				bu.is_deactivated IS NOT true
			GROUP BY
				bu.aadhar_no
			HAVING
				COUNT(*) > 1
			AND
				COUNT(*) = (
					SELECT
						COUNT(*)
					FROM
						users bu2
					INNER JOIN
						program_beneficiaries pb2
					ON
						bu2.id = pb2.user_id
					WHERE
						bu2.aadhar_no = bu.aadhar_no
					AND
						bu2.is_deactivated IS NOT true
				)
			${limit ? `LIMIT ${limit}` : ''}
			${skip ? `OFFSET ${skip}` : ''}
			;
		`;
		const duplicateListArr = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		).result;

		if (duplicateListArr != undefined) {
			const count = duplicateListArr?.[1]?.[2].length;
			const totalPages = Math.ceil(count / limit);
			return {
				success: true,
				limit,
				currentPage: skip / limit + 1,
				totalPages: totalPages,
				count,
				data: this.hasuraServiceFromServices.getFormattedData(
					duplicateListArr,
					[5],
				),
			};
		} else {
			return {
				success: true,
				limit,
				currentPage: skip / limit + 1,
				totalPages: 0,
				count: 0,
				data: [],
			};
		}
	}

	//if district is null show "-"
	public async getAllDuplicatesUnderPo(limit?: number, skip?: number) {
		const sql = `
			SELECT
				bu.aadhar_no AS "aadhar_no",
				STRING_AGG(CASE WHEN bu.district IS NOT NULL THEN bu.district ELSE '-' END, ', ') AS "districts",
				STRING_AGG(CASE WHEN bu.block IS NOT NULL THEN bu.block ELSE '-' END, ', ') AS "block",
				COUNT(*) AS "count",
				COUNT(*) OVER() AS "total_count"
			FROM
				users bu
			INNER JOIN
				program_beneficiaries pb
			ON
				bu.id = pb.user_id
			INNER JOIN
				users fu
			ON
				pb.facilitator_id = fu.id
			LEFT OUTER JOIN
				program_faciltators pf
			ON
				fu.id = pf.user_id
			WHERE
				bu.aadhar_no IS NOT NULL
			AND
				bu.is_deactivated IS NOT true
			GROUP BY
				bu.aadhar_no
			HAVING
				COUNT(*) > 1
			AND
				array_length(array_agg(DISTINCT pf.parent_ip), 1) > 1
			${limit ? `LIMIT ${limit}` : ''}
			${skip ? `OFFSET ${skip}` : ''}
			;
		`;
		const duplicateListArr = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		).result;
		if (duplicateListArr != undefined) {
			const count = duplicateListArr?.[1]?.[2].length;
			const totalPages = Math.ceil(count / limit);
			return {
				success: true,
				limit,
				currentPage: skip / limit + 1,
				totalPages: totalPages,
				count,
				data: this.hasuraServiceFromServices.getFormattedData(
					duplicateListArr,
					[5],
				),
			};
		} else {
			return {
				success: true,
				limit,
				currentPage: skip / limit + 1,
				totalPages: 0,
				count: 0,
				data: [],
			};
		}
	}

	public async verifyEntity(
		entityId: number,
		role: string,
		ipId: number,
		programId?: number,
	) {
		const ipUser = (await this.userService.userById(ipId)).data;

		let dynamicRoleBasedQuery;
		if (role === 'beneficiary') {
			dynamicRoleBasedQuery = `
				{
					program_beneficiaries: {
						program_id: {_eq: "${programId}"},
						facilitator_user: {
							program_faciltators: { parent_ip: { _eq: "${ipUser.program_users[0].organisation_id}" } }
						}
					}
				}
			`;
		} else if (role === 'facilitator') {
			dynamicRoleBasedQuery = `
				{
					program_faciltators: {
						program_id: { _eq: "${programId}" },
						parent_ip: { _eq: "${ipUser.program_users[0].organisation_id}" }
					}
				}
			`;
		}

		const data = {
			query: `query MyQuery {
				users (
					where: {
						_and: [
							{ id: { _eq: ${entityId} } },
							${dynamicRoleBasedQuery}
						]
					}
				) {
					id
					program_beneficiaries {
						id
						facilitator_id
						original_facilitator_id
					}
					program_faciltators {
						id
					}
				}
			}`,
		};

		const hasuraResult = (
			await this.hasuraServiceFromServices.getData(data)
		)?.data?.users;

		const result = {
			success: false,
			message: '',
			isVerified: false,
			data: null,
		};

		if (!hasuraResult) {
			result.success = false;
			result.message = 'Hasura error';
			return result;
		}

		if (hasuraResult.length) {
			result.success = true;
			result.isVerified = true;
			result.data = hasuraResult[0];
		}

		return result;
	}

	public async reassignBeneficiary(
		beneficiaryId: number,
		newFacilitatorId: number,
		checkCampValidation: any,
	) {
		const response = {
			success: false,
			data: null,
			message: '',
		};

		let status = 'active';

		if (checkCampValidation) {
			let query = `query MyQuery {
				users(where: {id: {_eq:${beneficiaryId}}, group_users: {status: {_eq:"${status}"}}}){
				  id
				  group_users{
					id
					group{
						status
					}
				  }
				}
			  }
			  `;

			const hashura_response =
				await this.hasuraServiceFromServices.getData({
					query: query,
				});
			let users = hashura_response?.data?.users;

			if (users?.length > 0) {
				if (
					users[0]?.group_users[0]?.group?.status == 'camp_initiated'
				) {
					const update_body = {
						status: 'inactive',
					};
					let update_array = ['status'];

					await this.hasuraService.q(
						'group_users',
						{
							...update_body,
							id: users[0]?.group_users[0]?.id,
						},
						update_array,
						true,
						[...this.returnFieldsgroupUsers, 'id'],
					);
				} else {
					return response;
				}
			}
		}

		const beneficiaryDetails = (
			await this.beneficiariesCoreService.userById(beneficiaryId)
		).data;

		const updatePayload: any = {
			facilitator_id: newFacilitatorId,
		};

		if (!beneficiaryDetails.program_beneficiaries.original_facilitator_id) {
			updatePayload.original_facilitator_id =
				beneficiaryDetails.program_beneficiaries.facilitator_id;
		}

		const updateResult = (
			await this.hasuraService.update(
				beneficiaryDetails.program_beneficiaries.id,
				'program_beneficiaries',
				updatePayload,
				this.returnFields,
				[...this.returnFields, 'id'],
			)
		).program_beneficiaries;

		if (updateResult) {
			response.success = true;
			response.data = updateResult;
		}

		return response;
	}

	//Beneficiaries Aadhar Update
	public async updateBeneficiariesAadhar(
		beneficiaries_id: any,
		req: any,
		body: any,
		response: any,
	) {
		//get IP information from token id
		const user = await this.userService.ipUserInfo(req);
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;
		let aadhaar_no = body?.aadhar_no;

		if (!aadhaar_no || !beneficiaries_id) {
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

		const Beneficiaries_validation_query = `query MyQuery {
			users_aggregate(where: {id: {_eq: ${beneficiaries_id}}, program_beneficiaries: {facilitator_user: {program_faciltators: {parent_ip: {_eq: "${user?.data?.program_users[0]?.organisation_id}"},program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}}}}}}) {
				aggregate {
				  count
				}
			  }
		  }
		  `;

		const Beneficiaries_data = await this.hasuraServiceFromServices.getData(
			{
				query: Beneficiaries_validation_query,
			},
		);

		if (Beneficiaries_data?.data?.users_aggregate?.aggregate.count < 1) {
			return response.json({
				status: 401,
				success: false,
				message: 'Beneficiaries doesnt belong to IP',
				data: {},
			});
		}

		const query = `query MyQuery {
			users(where: {aadhar_no: {_eq:"${aadhaar_no}"}, _not: {id: {_eq:${beneficiaries_id}}}}) {
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

		await this.checkDuplicateStatus(beneficiaries_id);

		const userArr = ['aadhar_no'];
		const keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = beneficiaries_id;
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

	async checkDuplicateStatus(id: any) {
		const facilitator_id = id;
		const update_body = {
			is_duplicate: 'no',
		};
		const userArr = ['is_duplicate'];

		//get old aadhar number of the beneficiary

		let query = `
		query MyQuery {
			users_by_pk(id:${facilitator_id}) {
			  aadhar_no
			}
		  }
		`;
		const {
			data: {
				users_by_pk: { aadhar_no },
			},
		} = await this.hasuraServiceFromServices.getData({ query });

		//check if the old aadhar belong to other users than beneficiary
		const aadhar_check_response =
			await this.hasuraServiceFromServices.getData({
				query: `
					query MyQuery {
						users(where: {aadhar_no: {_eq: "${aadhar_no}"}, _or: [{is_deactivated: {_eq: false}}, {is_deactivated: {_is_null: true}}]}) {
						id
						aadhar_no
						}
					}`,
			});

		const users_data = aadhar_check_response?.data?.users;
		const idArray = users_data
			.map((element: any) => element.id)
			.filter((e: any) => e);
		if (users_data?.length > 2) {
			await this.hasuraService.q(
				'users',
				{
					...update_body,
					id: facilitator_id,
				},
				userArr,
				true,
				['id', 'is_duplicate'],
			);
		} else if (users_data?.length == 2) {
			for (const id of idArray) {
				await this.hasuraService.q(
					'users',
					{
						...update_body,
						id: id,
					},
					userArr,
					true,
					['id', 'is_duplicate'],
				);
			}
		}
	}

	public async notRegisteredBeneficiaries(body: any, req: any, resp: any) {
		const facilitator_id = req.mw_userid;
		const program_id = req.mw_program_id;
		const academic_year_id = req.mw_academic_year_id;
		let status = 'enrolled_ip_verified';

		// Get users which are not present in the camps or whose status is inactive

		let qury = `query MyQuery {
			users(where: {program_beneficiaries: {facilitator_id: {_eq:${facilitator_id}}, program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}, status: {_eq:${status}}}, _not: {group_users: {status: {_eq: "active"}}}}) {
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
			  program_beneficiaries(where:{program_id: {_eq:${program_id}}, academic_year_id: {_eq:${academic_year_id}}}) {
				status,
				enrollment_first_name,
				enrollment_middle_name,
				enrollment_last_name
			  }
			}
		  }
		  `;

		const data = { query: qury };
		const response = await this.hasuraServiceFromServices.getData(data);
		const users = response?.data?.users ?? [];
		const userPromises = await Promise.all(
			users.map(async (user) => {
				if (
					user.profile_photo_1.length > 0 &&
					user.profile_photo_1[0]?.id !== undefined
				) {
					const { success, data: fileData } =
						await this.uploadFileService.getDocumentById(
							user.profile_photo_1[0].id,
						);
					if (success && fileData?.fileUrl) {
						user.profile_photo_1 = {
							id: user.profile_photo_1[0]?.id,
							name: user.profile_photo_1[0]?.name,
							doument_type: user.profile_photo_1[0]?.doument_type,
							document_sub_type:
								user.profile_photo_1[0]?.document_sub_type,
							path: user.profile_photo_1[0]?.path,
							fileUrl: fileData.fileUrl,
						};
					}
				} else {
					user.profile_photo_1 = {};
				}
				return user;
			}),
		);

		const result = {
			user: userPromises,
		};

		return resp.status(200).json({
			success: true,
			message: 'Data found successfully!',
			data: result || {},
		});
	}

	private isValidString(str: string) {
		return typeof str === 'string' && str.trim();
	}

	//Multiple Beneficiary facilitator id update
	public async updateMultipleBeneficiaryFacilitatorId(
		beneficiaryDetails,
		newFacilitatorId: number,
	) {
		let updateResult = [];
		if (
			Array.isArray(beneficiaryDetails) &&
			beneficiaryDetails?.length > 0
		) {
			let coreQuery = [];
			beneficiaryDetails.forEach((program_beneficiary) => {
				if (
					newFacilitatorId !== program_beneficiary.facilitator_id &&
					program_beneficiary.original_facilitator_id === null
				) {
					coreQuery = [
						...coreQuery,
						`{
					where: {id: {_eq: ${program_beneficiary?.id}}},
					_set: {original_facilitator_id: ${program_beneficiary.facilitator_id},facilitator_id:${newFacilitatorId}}
					}`,
					];
				} else {
					coreQuery = [
						...coreQuery,
						`{
					where: {id: {_eq: ${program_beneficiary?.id}}},
					_set: {facilitator_id:${newFacilitatorId}}
					}`,
					];
				}
			});
			const data = {
				query: `mutation update_many_articles {
					update_program_beneficiaries_many(updates: [${coreQuery.join(',')}]){
						affected_rows
						returning{
							id
							user_id
							facilitator_id
							original_facilitator_id
					}
				}
			}
			`,
			};

			const newResult = await this.hasuraServiceFromServices.getData(
				data,
			);
			updateResult = newResult?.data?.update_program_beneficiaries_many;
		}

		return updateResult;
	}

	//Update scolarship_order_id
	public async updateScholarshipId(
		id: any,
		body: any,
		request: any,
		response: any,
	) {
		const learner_id = id;
		const scholarship_order_id = body?.scholarship_order_id;
		if (!scholarship_order_id || scholarship_order_id === '') {
			return response.status(422).json({
				success: false,
				message: 'required scholarship Id!',
				data: {},
			});
		}

		let check_id = {
			query: `query MyQuery {
				core_beneficiaries(where: {user_id: {_eq: ${learner_id}}}){
					id
					user_id
				}
			}`,
		};
		const response_data = await this.hasuraServiceFromServices.getData(
			check_id,
		);
		if (!response_data || !response_data.data?.core_beneficiaries[0]) {
			return response.status(422).json({
				success: false,
				message: 'Beneficiaries ID is not exists!',
				data: {},
			});
		}

		let data = {
			query: `mutation MyMutation {
			update_core_beneficiaries(where: {user_id: {_eq: ${learner_id}}}, _set: {scholarship_order_id: ${scholarship_order_id}}) {
				affected_rows
				returning {
					scholarship_order_id
					id
					user_id
				}
			}
		}`,
		};
		const newResult = await this.hasuraServiceFromServices.getData(data);
		const updateResult =
			newResult?.data?.update_core_beneficiaries?.returning[0];

		return response.status(200).json({
			success: true,
			message: 'Beneficiaries Scholarship Updated',
			data: updateResult || {},
		});
	}
}
