import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AwsRekognitionService } from '../services/aws-rekognition/aws-rekognition.service';
import { HasuraService } from '../services/hasura/hasura.service';
import { SentryService } from '../services/sentry/sentry.service';

@Injectable()
export class FaUserIndexingCron {
	private data_limit: string;

	constructor(
		private configService: ConfigService,
		private awsRekognitionService: AwsRekognitionService,
		private hasuraService: HasuraService,
		private sentryService: SentryService,
	) {
		this.data_limit = this.configService.get<string>(
			'AWS_REKOGNITION_INDEX_USER_BATCH_SIZE',
		);
	}

	//first cron runs for each hour's 5th minute eg: 10:05am, 11::05am
	@Cron('05 * * * *')
	async createCollectionUsers() {
		const transaction = this.sentryService.startTransaction(
			'Cron Job 1',
			'Create Users in Collection',
		);
		try {
			/*----------------------- Create users in collection -----------------------*/
			console.log(
				'cron job 1: createCollectionUsers started at time ' +
					new Date(),
			);
			this.sentryService.addBreadcrumb(
				'Cron Job 1',
				'createCollectionUsers started at time ' + new Date(),
				'info',
			);
			const collectionId = this.configService.get<string>(
				'AWS_REKOGNITION_COLLECTION_ID',
			);
			//delete collection if required
			/*await this.awsRekognitionService.deleteCollection(
				collectionId
			);*/
			//Step-1: Create collection if not exists
			await this.awsRekognitionService.createCollectionIfNotExists(
				collectionId,
			);
			// Step-2: Fetch all userIds which not added in collection
			const nonCreatedUsers = await this.fetchAllUsersExceptCreated(
				this.data_limit,
			);
			this.sentryService.addBreadcrumb(
				'Cron Job 1',
				'response fetchAllUsersExceptCreated ' + nonCreatedUsers,
				'info',
			);
			let nonexistusers = nonCreatedUsers.map((userObj) =>
				String(userObj.id),
			);
			this.sentryService.addBreadcrumb(
				'Cron Job 1',
				'response nonexistusers ' + nonexistusers,
				'info',
			);
			// Step-3: Create not created users in collection and update status in users table
			await this.awsRekognitionService.createUsersInCollection(
				collectionId,
				nonexistusers,
			);
		} catch (error) {
			this.sentryService.captureException(error);
		} finally {
			(await transaction).finish();
		}
	}

	async fetchAllUsersExceptCreated(limit) {
		const query = `
				query MyQuery {
					users(
						where: {
							fa_user_created: {_eq: false}
						},
						order_by: {id: asc}
						limit: ${limit}
					) {
						id
					}
				}
			`;
		this.sentryService.addBreadcrumb(
			'Cron Job 1',
			'query: ' + query,
			'info',
		);
		try {
			const users = (await this.hasuraService.getData({ query }))?.data
				?.users;
			this.sentryService.addBreadcrumb(
				'Cron Job 1',
				'fetchALluser count ' + users.length + ' fetchALluser ' + users,
				'info',
			);
			return users;
		} catch (error) {
			this.sentryService.captureException(error);
			return [];
		}
	}

	async deleteCollection(collectionId: string) {
		//delete collection
		const collectionDeleted =
			await this.awsRekognitionService.deleteCollection(collectionId);
		this.sentryService.addBreadcrumb(
			'Cron Job 1',
			'collectionDeleted: ' + collectionDeleted,
			'info',
		);
		let response = { success: false };
		if (collectionDeleted) {
			response.success = true;
		}
		return response;
	}
}
