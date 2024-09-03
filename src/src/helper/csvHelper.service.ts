import { Injectable } from '@nestjs/common';

@Injectable()
export class CSVHelperService {
	public getCSVObject() {
		let csv_header = [
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
		];
		return csv_header;
	}
}
