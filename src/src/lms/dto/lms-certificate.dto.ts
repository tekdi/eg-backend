import { Expose } from 'class-transformer';

export class LMSCertificateDto {
	//generated fields
	@Expose()
	id: string;
	@Expose()
	user_id: number;
	@Expose()
	test_id: string;
	@Expose()
	certificate_status: string;
	@Expose()
	issuance_date: string;
	@Expose()
	expiration_date: string;
	@Expose()
	certificate_html: string;

	constructor(partial: Partial<LMSCertificateDto>) {
		Object.assign(this, partial);
	}
}
