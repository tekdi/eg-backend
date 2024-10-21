import { Injectable } from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { EnumService } from '../enum/enum.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class BeneficiariesCoreService {
	constructor(
		private readonly userService: UserService,
		private readonly hasuraService: HasuraService,
		private readonly enumService: EnumService,
		private readonly hasuraServiceFromServices: HasuraServiceFromServices,
	) {}

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

	public async statusUpdate(body: any, request: any) {
		const { data: updatedUser } = await this.userById(body?.user_id);
		const allStatuses = this.enumService
			.getEnumValue('BENEFICIARY_STATUS')
			.data.map((enumData) => enumData.value);

		if (!allStatuses.includes(body.status)) {
			return {
				status: 400,
				success: false,
				message: `Invalid status`,
				data: {},
			};
		}
		const res = await this.hasuraService.update(
			updatedUser?.program_beneficiaries?.id,
			'program_beneficiaries',
			{
				...body,
				reason_for_status_update: body.reason_for_status_update?.trim()
					? body.reason_for_status_update?.trim()
					: body.status,
			},
			this.returnFields,
			[...this.returnFields, 'id'],
		);

		const newdata = (
			await this.userById(res?.program_beneficiaries?.user_id)
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

		return res;
	}

	public async userById(id: any) {
		const data = {
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
			keycloak_id
			last_name
			lat
			long
			middle_name
			mobile
			mobile_no_verified
			pincode
			profile_photo_1
			profile_photo_2
			profile_photo_3
			profile_url
			state
			state_id
			updated_at
			updated_by
			village
			username
			program_beneficiaries {
			beneficiaries_found_at
			created_by
			facilitator_id
			original_facilitator_id
			id
			status
			reason_for_status_update
			academic_year_id
			user_id
			enrollment_number
			enrollment_status
			enrolled_for_board
			type_of_enrollement
			subjects
			payment_receipt_document_id
			program_id
			updated_by
			documents_status
			learning_motivation
			type_of_support_needed
			learning_level
			enrollment_date
			enrollment_first_name
			enrollment_middle_name
			enrollment_last_name
			enrollment_dob
			enrollment_aadhaar_no
			enrollment_mobile_no
			is_eligible
			enrollment_verification_reason
			enrollment_verification_status
			exam_fee_document_id
			syc_subjects
			exam_fee_date
			is_continued
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
			type_of_learner
			status
			type_of_enrollement
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
			father_first_name
			father_middle_name
			father_last_name
			mother_first_name
			mother_middle_name
			mother_last_name
			career_aspiration_details
			alternative_device_ownership
			alternative_device_type
			mark_as_whatsapp_number
			parent_support
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
		}}`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.users_by_pk;
		if (result) {
			result.program_beneficiaries = result?.program_beneficiaries?.[0];
		}
		return {
			message: 'User data fetched successfully.',
			data: result,
		};
	}

	public async updateBeneficiaryDetails(ids, body) {
		await this.hasuraServiceFromServices.update(
			null,
			'program_beneficiaries',
			body,
			[],
			this.returnFields,
			{
				where: `{id:{_in:[${ids}]}}`,
			},
		);
	}

	public async getBeneficiaryDetailsById(id, status, request) {
		let filter_query = [];
		const program_id = request.mw_program_id;
		const academic_year_id = request.mw_academic_year_id;

		filter_query.push(`id:{_eq:${id}}`);
		if (status) {
			filter_query.push(
				`program_beneficiaries: {status: {_eq: ${status}},program_id:{_eq:${program_id}},academic_year_id:{_eq:${academic_year_id}}}`,
			);
		}

		let query = `query MyQuery {
			users(where: {${filter_query}}){
			  id
			  program_beneficiaries{
				id
			  }
			}
		  }
		  `;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let result = response?.data?.users?.[0]?.program_beneficiaries[0]?.id;

		if (result) {
			return result;
		}
	}
}
