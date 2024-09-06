import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendancesCoreService } from 'src/attendances/attendances.core.service';
import { Method } from 'src/common/method/method';
import { LMSCertificateDto } from 'src/lms/dto/lms-certificate.dto';
import { UserService } from 'src/user/user.service';
import { HasuraService } from '../services/hasura/hasura.service';
import {
	pragati_orientation,
	pcr_training,
	main_camp_training,
} from 'src/lms/templates';

const moment = require('moment');
const qr = require('qrcode');
const { parse, HTMLElement } = require('node-html-parser');

@Injectable()
export class PrepareCertificateHtmlCron {
	constructor(
		private readonly hasuraService: HasuraService,
		private configService: ConfigService,
		private readonly attendanceCoreService: AttendancesCoreService,
		private userService: UserService,
		private method: Method,
	) {}

	//cron issue certificate run every 5 minutes
	@Cron(CronExpression.EVERY_5_MINUTES)
	async prepareCertificateHtml() {
		console.log('cron job: issueCertificate started at time ' + new Date());

		//fetch all test tracking data which has certificate_status null
		const userForIssueCertificate = await this.fetchTestTrackingData(
			parseInt(
				this.configService.get<string>(
					'LMS_CERTIFICATE_ISSUE_BATCH_SIZE',
				),
			),
		);
		console.log('userForIssueCertificate list', userForIssueCertificate);
		if (userForIssueCertificate.length > 0) {
			for (let i = 0; i < userForIssueCertificate.length; i++) {
				let userTestData = userForIssueCertificate[i];
				let issue_status = '';
				let minPercentage = parseFloat(
					this.configService.get<string>(
						'LMS_CERTIFICATE_ISSUE_MIN_SCORE',
					),
				);
				let user_id = userTestData?.user_id;
				let test_id = userTestData?.test_id;
				let context = userTestData?.context;
				let context_id = userTestData?.context_id;

				const user_name = await this.method.CapitalizeEachWord(
					[
						userTestData?.user?.first_name,
						userTestData?.user?.middle_name,
						userTestData?.user?.last_name,
					]
						.filter((e) => e)
						.join(' '),
				);

				const event_type = userTestData?.events?.[0]?.type;
				const event_start_date = moment(
					userTestData?.events?.[0]?.start_date,
				).format('DD MMM YYYY');
				const event_end_date = moment(
					userTestData?.events?.[0]?.end_date,
				).format('DD MMM YYYY');
				const academic_year =
					userTestData?.events?.[0]?.academic_year?.name;

				//get attendance status
				let attendance_valid = false;
				const startMoment = moment(
					userTestData?.events?.[0]?.start_date,
				);
				const endMoment = moment(userTestData?.events?.[0]?.end_date);
				let datesD = [];
				while (startMoment.isSameOrBefore(endMoment)) {
					datesD.push(startMoment.format('YYYY-MM-DD'));
					startMoment.add(1, 'day');
				}

				let usrAttendanceList =
					await this.attendanceCoreService.getUserAttendancePresentList(
						{
							user_id,
							context,
							context_id,
							event_start_date: `${userTestData?.events?.[0]?.start_date}T00:00:00`,
							event_end_date: `${userTestData?.events?.[0]?.end_date}T23:59:59`,
						},
					);

				console.log('usrAttendanceList list', usrAttendanceList);
				console.log('events-dates', JSON.stringify(datesD));
				let minAttendance = datesD.length;

				if (usrAttendanceList.length >= minAttendance) {
					attendance_valid = true;
				}

				//check certificate criteria
				if (userTestData?.score >= minPercentage && attendance_valid) {
					issue_status = 'true';
				} else {
					issue_status = 'false';
				}
				//issue certificate
				if (issue_status == 'true') {
					let certificateTemplate = pragati_orientation;
					if (event_type === 'pcr_training') {
						certificateTemplate = pcr_training;
					} else if (event_type === 'main_camp_execution_training') {
						certificateTemplate = main_camp_training;
					}
					let issuance_date = moment().format('YYYY-MM-DD');
					let issuance_date_tx = moment().format('DD MMM YYYY');
					let expiration_date = moment(issuance_date)
						.add(12, 'M')
						.format('YYYY-MM-DD');
					const lmsCertificate = new LMSCertificateDto({
						user_id: user_id,
						test_id: test_id,
						certificate_status: 'Issued',
						issuance_date: issuance_date,
						expiration_date: expiration_date,
					});
					const certificate_data = await this.createCertificateHtml(
						lmsCertificate,
					);
					if (certificate_data != null) {
						let certificate_id = certificate_data?.id;
						let uid = 'P-' + certificate_id + '-' + user_id;
						//update html code
						certificateTemplate = certificateTemplate.replace(
							'{{academic_year}}',
							academic_year,
						);
						certificateTemplate = certificateTemplate.replace(
							'{{event_start_date}}',
							event_start_date,
						);
						certificateTemplate = certificateTemplate.replace(
							'{{event_end_date}}',
							event_end_date,
						);
						certificateTemplate = certificateTemplate.replace(
							'{{name}}',
							user_name,
						);
						certificateTemplate = certificateTemplate.replace(
							'{{issue_date}}',
							issuance_date_tx,
						);
						certificateTemplate = certificateTemplate.replace(
							'{{user_id}}',
							uid,
						);

						//qr code
						try {
							let qr_code_verify_link =
								this.configService.get<string>(
									'LMS_CERTIFICATE_VERIFY_URL',
								) +
								'' +
								certificate_id;

							let modifiedHtml = null;
							const modified = await new Promise(
								(resolve, reject) => {
									qr.toDataURL(
										qr_code_verify_link,
										function (err, code) {
											if (err) {
												resolve(null);
												return;
											}

											if (code) {
												const newHtml = code;

												const root =
													parse(certificateTemplate);

												// Find the img tag with id "qrcode"
												const qrcodeImg =
													root.querySelector(
														'#qr_certificate',
													);

												if (qrcodeImg) {
													qrcodeImg.setAttribute(
														'src',
														newHtml,
													);
													modifiedHtml =
														root.toString();

													resolve(modifiedHtml);
												} else {
													resolve(null);
												}
											} else {
												resolve(null);
											}
										},
									);
								},
							);
							if (modifiedHtml != null) {
								certificateTemplate = modifiedHtml;
							}
						} catch (e) {}
						//update certificate html
						const lmsCertificate = new LMSCertificateDto({
							certificate_html: certificateTemplate,
						});
						await this.updateCertificateHtml(
							lmsCertificate,
							certificate_id,
						);
					} else {
						//error in create certificate
					}
				}
				// Update in certificate data in database
				//update values
				let testTrackingUpdateData = new Object();
				testTrackingUpdateData['cron_last_processed_at'] = new Date(
					Date.now(),
				).toISOString();
				testTrackingUpdateData['attendance_count'] =
					usrAttendanceList.length;
				if (issue_status == 'true') {
					testTrackingUpdateData['certificate_status'] = issue_status;
				}
				const result = await this.updateTestTrackingData(
					userTestData?.id,
					testTrackingUpdateData,
				);
				if (issue_status === 'false') {
					console.log(
						`user_id ${user_id} name ${user_name} testID ${test_id} Not Genrated event date count ${minAttendance} attendance count ${usrAttendanceList.length}`,
					);
				} else if (result) {
					console.log(
						`user_id ${user_id} name ${user_name} testID ${test_id} Certificate Genrated Sucssefully`,
					);
				}
			}
		}
	}
	async fetchTestTrackingData(limit: number) {
		// We need to skip processing records wch were processed in past X hours
		let dt = new Date();
		let LMS_CERTIFICATE_LAST_PROCESS_HOURS = parseInt(
			this.configService.get<string>(
				'LMS_CERTIFICATE_LAST_PROCESS_HOURS',
			),
		);
		let filterTimestamp = new Date(
			dt.setHours(dt.getHours() - LMS_CERTIFICATE_LAST_PROCESS_HOURS),
		).toISOString();

		const query = `
			query Getlms_test_tracking {
				lms_test_tracking(
				where:{
					_and : [
						{
							certificate_status:{
								_is_null: true
							}
						},
						{_or:
							[
								{cron_last_processed_at: {_is_null: true}},
								{cron_last_processed_at: {_lte: "${filterTimestamp}"}}
							]
						}
					]
				},
				limit: ${limit}
				){
					id
					user_id
					test_id
					score
					context
					context_id
					user{
						first_name
						middle_name
						last_name
					}
					events(where:{context:{_eq:"events"}}){
						id
						start_date
						end_date
						type
						academic_year{
							name
						}
					}
				}
			}
			`;

		try {
			const result_query = await this.hasuraService.getData({ query });
			const data_list = result_query?.data?.lms_test_tracking;
			if (data_list) {
				return data_list;
			} else {
				return [];
			}
		} catch (error) {
			return [];
		}
	}
	async createCertificateHtml(lmsCertificateDto: LMSCertificateDto) {
		let queryObj = '';
		Object.keys(lmsCertificateDto).forEach((e) => {
			if (lmsCertificateDto[e] && lmsCertificateDto[e] != '') {
				if (e === 'certificate_html') {
					queryObj += `${e}: ${JSON.stringify(
						JSON.stringify(lmsCertificateDto[e]),
					)}, `;
				} else if (Array.isArray(lmsCertificateDto[e])) {
					queryObj += `${e}: "${JSON.stringify(
						lmsCertificateDto[e],
					)}", `;
				} else {
					queryObj += `${e}: "${lmsCertificateDto[e]}", `;
				}
			}
		});

		let query = `mutation CreateTrainingCertificate {
			  insert_lms_training_certificate_one(object: {${queryObj}}) {
			   id
			  }
			}
			`;

		try {
			let query_response = await this.hasuraService.getData({
				query: query,
			});
			if (query_response?.data?.insert_lms_training_certificate_one) {
				//success issueCertificateHtml
				return query_response?.data
					?.insert_lms_training_certificate_one;
			} else {
				//error in issueCertificateHtml
				return null;
			}
		} catch (error) {
			//error in issueCertificateHtml
			return null;
		}
	}
	async updateCertificateHtml(lmsCertificateDto: LMSCertificateDto, id) {
		let queryObj = '';
		Object.keys(lmsCertificateDto).forEach((e) => {
			if (lmsCertificateDto[e] && lmsCertificateDto[e] != '') {
				if (e === 'certificate_html') {
					queryObj += `${e}: ${JSON.stringify(
						JSON.stringify(lmsCertificateDto[e]),
					)}, `;
				} else if (Array.isArray(lmsCertificateDto[e])) {
					queryObj += `${e}: "${JSON.stringify(
						lmsCertificateDto[e],
					)}", `;
				} else {
					queryObj += `${e}: "${lmsCertificateDto[e]}", `;
				}
			}
		});

		let query = `mutation UpdateTrainingCertificate {
			  update_lms_training_certificate_by_pk(
				pk_columns: {
					id: "${id}"
				},
				_set: {${queryObj}}
				)
			  {
			   id
			  }
			}
			`;
		try {
			let query_response = await this.hasuraService.getData({
				query: query,
			});
			if (query_response?.data?.update_lms_training_certificate_by_pk) {
				//success issueCertificateHtml
				return query_response?.data
					?.update_lms_training_certificate_by_pk;
			} else {
				//error in issueCertificateHtml
				return null;
			}
		} catch (error) {
			//error in issueCertificateHtml
			return null;
		}
	}
	async updateTestTrackingData(id, testTrackingUpdateData) {
		let setQuery = ``;
		if (testTrackingUpdateData?.certificate_status) {
			setQuery += `certificate_status: ${testTrackingUpdateData.certificate_status}`;
		}
		setQuery += `
			cron_last_processed_at : "${testTrackingUpdateData.cron_last_processed_at}",
			attendance_count : "${testTrackingUpdateData.attendance_count}"
		`;
		let updateQuery = `
			mutation MyMutation {
				update_lms_test_tracking_by_pk (
					pk_columns: {
						id: "${id}"
					},
					_set: {
						${setQuery}
					}
				) {
					id
				}
			}
		`;
		try {
			return (
				(await this.hasuraService.getData({ query: updateQuery })).data
					.update_lms_test_tracking_by_pk.id === id
			);
		} catch (error) {
			return [];
		}
	}
}
