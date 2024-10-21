import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AwsRekognitionService } from '../services/aws-rekognition/aws-rekognition.service';
import { HasuraService } from '../services/hasura/hasura.service';

@Injectable()
export class FaUserIndexingCron {
	private readonly data_limit: string;

	constructor(
		private readonly configService: ConfigService,
		private readonly awsRekognitionService: AwsRekognitionService,
		private readonly hasuraService: HasuraService,
	) {
		this.data_limit = this.configService.get<string>(
			'AWS_REKOGNITION_INDEX_USER_BATCH_SIZE',
		);
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

			//Step-1: Create collection if not exists
			await this.awsRekognitionService.createCollectionIfNotExists(
				collectionId,
			);
			// Step-2: Fetch all userIds which not added in collection
			const nonCreatedUsers = await this.fetchAllUsersExceptCreated(
				this.data_limit,
			);

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

		let response = { success: false };
		if (collectionDeleted) {
			response.success = true;
		}
		return response;
	}
}
