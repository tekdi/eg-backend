import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AwsRekognitionService } from '../services/aws-rekognition/aws-rekognition.service';
import { HasuraService } from '../services/hasura/hasura.service';

@Injectable()
export class MarkAttendanceService {
	constructor(
		private configService: ConfigService,
		private awsRekognitionService: AwsRekognitionService,
		private hasuraService: HasuraService,
	) {}

	async markAttendance(
		attendaceId: number,
		attendaceData: {
			isAttendanceVerified: boolean;
			matchingPercentage: number;
		},
	) {
		let updateQuery = `
				mutation MyMutation {
					update_attendance_by_pk (
						pk_columns: {
							id: ${attendaceId}
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
		try {
			return (
				(await this.hasuraService.getData({ query: updateQuery })).data
					.update_attendance_by_pk.id === attendaceId
			);
		} catch (error) {
			console.log('markAttendance:', error);
			throw error;
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
		try {
			const users = (await this.hasuraService.getData({ query }))?.data
				?.users;
			return users;
		} catch (error) {
			console.log('getAllUsersForAttendance:', error);
			throw error;
		}
	}

	@Cron(CronExpression.EVERY_30_MINUTES)
	async markAttendanceCron() {
		try {
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
			console.dir(usersForAttendance, { depth: 99 });

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
						// Check if the user matched
						let matchingPercentage = null;
						const isMatchFound = matchedUser.some((obj) => {
							if (obj.User.UserId === userId) {
								matchingPercentage = obj.Similarity;
								return true;
							}
						});
						// Set attendance verified as true or false based on results
						let isAttendanceVerified = false;
						if (isMatchFound) isAttendanceVerified = true;
						console.log(
							'-------------------------------------------------------------------------',
						);
						console.log(
							`------------------------------ Verified: ${isMatchFound} ----------------------------`,
						);
						console.log(
							'-------------------------------------------------------------------------',
						);
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
					}
				}
			}
		} catch (error) {
			console.log('Error occurred in markAttendanceCron.');
		}
	}
}
