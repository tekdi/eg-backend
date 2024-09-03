import { Injectable } from '@nestjs/common';

@Injectable()
export class CSVHelperService {
	public getCSVObject() {
		let csv_header = [
			// Column 1: Name
			{ id: 'name', title: 'Name' },
			// Column 2: Learner ID
			{ id: 'user_id', title: 'LearnerId' },
			// Column 3: District
			{ id: 'district', title: 'District' },
			// Column 4: Block
			{ id: 'block', title: 'Block' },
			// Column 5: Village
			{ id: 'village', title: 'Village' },
			// Column 6: Date of Birth
			{ id: 'dob', title: 'DOB' },
			// Column 7: Prerak
			{ id: 'prerak', title: 'Prerak' },
			// Column 8: Facilitator ID
			{ id: 'facilitator_id', title: 'FacilitatorId' },
			// Column 9: Mobile Number
			{ id: 'mobile', title: 'Mobile Number' },
			// Column 10: Status
			{ id: 'status', title: 'Status' },
			// Column 11: Enrollment Number
			{ id: 'enrollment_number', title: 'Enrollment Number' },
			// Column 12: Aadhaar Number
			{ id: 'aadhar_no', title: 'Aadhaar Number' },
			// Column 13: Aadhaar Number Verified
			{ id: 'aadhar_verified', title: 'Aadhaar Number Verified' },
			// Column 14: Aadhaar Verification Mode
			{
				id: 'aadhaar_verification_mode',
				title: 'Aadhaar Verification Mode',
			},
		];
		return csv_header;
	}
}
