import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AwsRekognitionService } from '../services/aws-rekognition/aws-rekognition.service';
import { HasuraService } from '../services/hasura/hasura.service';

@Injectable()
export class UserCreationService {
	private data_limit: string;

	constructor(
		private configService: ConfigService,
		private awsRekognitionService: AwsRekognitionService,
		private hasuraService: HasuraService,
	) {
		this.data_limit = this.configService.get<string>(
			'AWS_RECOGNITION_DATA_LIMIT',
		);
	}

	@Cron(CronExpression.EVERY_10_MINUTES)
	//for testing in local 30 seconds
	//@Cron(CronExpression.EVERY_30_SECONDS)
	async createCollectionUsers() {
		try {
			/*----------------------- Create users in collection -----------------------*/

			const collectionId = this.configService.get<string>(
				'AWS_REKOGNITION_COLLECTION_ID',
			);
			//delete collection if required
			/*await this.awsRekognitionService.deleteCollection(
				collectionId,
				'userId',
				'faceId',
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
			console.log('>>>nonexistusers', nonexistusers);
			// Step-3: Create not created users in collection and update status in users table
			await this.awsRekognitionService.createUsersInCollection(
				collectionId,
				nonexistusers,
			);
		} catch (error) {
			console.log(error);
			console.log(
				'Error occurred in createCollectionUsers.',
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
			console.log('fetchALluser cunt------>>>>>', users.length);
			//console.log('fetchALluser------>>>>>', users);

			return users;
		} catch (error) {
			console.log('fetchAllUsersExceptIds:', error);
			throw error;
		}
	}
	async deleteCollection(
		collectionId: string,
		userId: string,
		faceId: string,
	) {
		// Disassociate image from user
		const photoDisassociated =
			await this.awsRekognitionService.deleteCollection(
				collectionId,
				userId,
				faceId,
			);
		console.log('photoDisassociated111------>>>>>', photoDisassociated);
		let response = { success: false };
		// Delete face from collection
		if (photoDisassociated) {
			const photoDeleted =
				await this.awsRekognitionService.deleteCollection(
					collectionId,
					userId,
					faceId,
				);
			if (photoDeleted) response.success = true;
		}
		return response;
	}
}
