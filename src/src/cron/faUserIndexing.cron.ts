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

	@Cron('*/10 * * * * *')
	async testCronJob() {
		const transaction = this.sentryService.startTransaction(
			'test',
			'My First Test Transaction',
		);
		try {
			let a = [1, 2, 3];
			const length = a[5].toString();
		} catch (e) {
			this.sentryService.captureException(e);
			console.log(e);
		} finally {
			(await transaction).finish();
		}
		console.log('hello');
	}

	//first cron runs for each hour's 5th minute eg: 10:05am, 11::05am
	@Cron('05 * * * *')
	async createCollectionUsers() {
		try {
			/*----------------------- Create users in collection -----------------------*/
			console.log(
				'cron job 1: createCollectionUsers started at time ' +
					new Date(),
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
			//console.log('>>>fetchAllUsersExceptCreated', nonCreatedUsers);
			let nonexistusers = nonCreatedUsers.map((userObj) =>
				String(userObj.id),
			);
			//console.log('>>>nonexistusers', nonexistusers);
			// Step-3: Create not created users in collection and update status in users table
			await this.awsRekognitionService.createUsersInCollection(
				collectionId,
				nonexistusers,
			);
		} catch (error) {
			console.log(
				'Error occurred in createCollectionUsers.',
				error,
				error.stack,
			);
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
		try {
			const users = (await this.hasuraService.getData({ query }))?.data
				?.users;
			//console.log('fetchALluser cunt------>>>>>', users.length);
			//console.log('fetchALluser------>>>>>', users);

			return users;
		} catch (error) {
			console.log('fetchAllUsersExceptIds:', error, error.stack);
			return [];
		}
	}

	async deleteCollection(collectionId: string) {
		//delete collection
		const collectionDeleted =
			await this.awsRekognitionService.deleteCollection(collectionId);
		//console.log('collectionDeleted------>>>>>', collectionDeleted);
		let response = { success: false };
		if (collectionDeleted) {
			response.success = true;
		}
		return response;
	}
}
