import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AwsRekognitionService } from '../services/aws-rekognition/aws-rekognition.service';
import { HasuraService } from '../services/hasura/hasura.service';
import { SentryService } from '../services/sentry/sentry.service';

@Injectable()
export class FaAttendanceProcessingCron {
	private prefixed: string;

	constructor(
		private configService: ConfigService,
		private awsRekognitionService: AwsRekognitionService,
		private hasuraService: HasuraService,
		private sentryService: SentryService,
	) {
		this.prefixed = this.configService.get<string>(
			'AWS_REKOGNITION_CUSTOM_PREFIX',
		);
	}

	//3rd cron runs for each hour's 25th minute eg: 10:25am, 11::25am
	@Cron('25 * * * *')
	async markAttendanceCron() {
		const transaction = this.sentryService.startTransaction(
			'Cron Job 3',
			'Mark attendance',
		);
		try {
			/*----------------------- Mark attendance of from face index of users in collection -----------------------*/
			console.log(
				'cron job 3: markAttendanceCron started at time ' + new Date(),
			);
			this.sentryService.addBreadcrumb(
				'Cron Job 3',
				'markAttendanceCron started at time ' + new Date(),
				'info',
			);
			const collectionId = this.configService.get<string>(
				'AWS_REKOGNITION_COLLECTION_ID',
			);
			// Step-1 Fetch all users whose attendace is not marked
			const usersForAttendance = await this.getAllUsersForAttendance(
				parseInt(
					this.configService.get<string>(
						'AWS_REKOGNITION_MARK_ATTENDANCE_BATCH_SIZE',
					),
				),
			);
			this.sentryService.addBreadcrumb(
				'Cron Job 3',
				'response usersForAttendance ' + usersForAttendance,
				'info',
			);
			// Step-2 Iterate thorugh them
			for (const user of usersForAttendance) {
				const userId = String(user.id);
				// Iterate through attendance documents and mark attendance
				for (const attendanceObj of user.attendances) {
					if (attendanceObj.photo_1) {
						// Find Users matching with image
						const matchedUser =
							await this.awsRekognitionService.searchUsersByImage(
								collectionId,
								attendanceObj.photo_1,
								parseInt(
									this.configService.get<string>(
										'AWS_REKOGNITION_FACE_MATCHING_THRESHOLD',
									),
								),
							);
						//console.log('matchedUser', matchedUser);
						// Check if the user matched
						let matchingPercentage = null;
						const isMatchFound = (matchedUser as any[]).some(
							(obj) => {
								//console.log('obj', obj);
								if (
									obj?.User?.UserId.replace(
										this.prefixed,
										'',
									) === userId
								) {
									matchingPercentage = obj.Similarity;
									return true;
								}
							},
						);
						//console.log('matchingPercentage', matchingPercentage);
						// Set attendance verified as true or false based on results
						let isAttendanceVerified = false;
						if (isMatchFound) isAttendanceVerified = true;
						/*console.log(
							'-------------------------------------------------------------------------',
						);
						console.log(
							`------------------------------ Verified: ${isMatchFound} ----------------------------`,
						);
						console.log(
							'-------------------------------------------------------------------------',
						);*/
						// Update in attendance data in database
						await this.markAttendance(attendanceObj.id, {
							isAttendanceVerified,
							matchingPercentage,
						});
						// Set delay between two attendance process
						await new Promise((resolve, reject) =>
							setTimeout(
								resolve,
								parseInt(
									this.configService.get<string>(
										'AWS_REKOGNITION_MARK_ATTENDANCE_PROCESS_INTERVAL_TIME',
									),
								),
							),
						);
					} else {
						// Update in attendance data in database
						await this.markProcessed(attendanceObj.id);
					}
				}
			}
		} catch (error) {
			this.sentryService.captureException(error);
		} finally {
			(await transaction).finish();
		}
	}

	async markAttendance(
		attendanceId: number,
		attendaceData: {
			isAttendanceVerified: boolean;
			matchingPercentage: number;
		},
	) {
		let updateQuery = `
				mutation MyMutation {
					update_attendance_by_pk (
						pk_columns: {
							id: ${attendanceId}
						},
						_set: {
							fa_is_processed: ${attendaceData.isAttendanceVerified},
							fa_similarity_percentage: ${attendaceData.matchingPercentage}
						}
					) {
						id
						fa_is_processed
					}
				}
			`;
		this.sentryService.addBreadcrumb(
			'Cron Job 3',
			'updateQuery: ' + updateQuery,
			'info',
		);
		try {
			return (
				(await this.hasuraService.getData({ query: updateQuery })).data
					.update_attendance_by_pk.id === attendanceId
			);
		} catch (error) {
			this.sentryService.captureException(error);
			return [];
		}
	}

	async markProcessed(attendanceId: number) {
		let updateQuery = `
			mutation MyMutation {
				update_attendance_by_pk (
					pk_columns: {
						id: ${attendanceId}
					},
					_set: {
						fa_is_processed: false,
						fa_similarity_percentage: null
					}
				) {
					id
					fa_is_processed
				}
			}
		`;
		this.sentryService.addBreadcrumb(
			'Cron Job 3',
			'updateQuery: ' + updateQuery,
			'info',
		);
		try {
			return (
				(await this.hasuraService.getData({ query: updateQuery })).data
					.update_attendance_by_pk.id === attendanceId
			);
		} catch (error) {
			this.sentryService.captureException(error);
			return [];
		}
	}

	async getAllUsersForAttendance(limit: number) {
		const query = `
				query MyQuery {
					users (
						where: {
							_and: [
								{ fa_user_indexed: {_eq: true} },
								{ attendances_aggregate: {count: {predicate: {_gt: 0}}} },
								{ attendances: { fa_is_processed: {_is_null: true} } },
							]
						},
						limit: ${limit}
					) {
						id
						attendances ( where: {
							fa_is_processed: {_is_null: true},
						}) {
							id
							photo_1
							fa_is_processed
						}
					}
				}
			`;
		this.sentryService.addBreadcrumb(
			'Cron Job 3',
			'query: ' + query,
			'info',
		);
		try {
			const users = (await this.hasuraService.getData({ query }))?.data
				?.users;
			return users;
		} catch (error) {
			this.sentryService.captureException(error);
			return [];
		}
	}
}