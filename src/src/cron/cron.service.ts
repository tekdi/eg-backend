import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AwsRekognitionService } from '../services/aws-rekognition/aws-rekognition.service';
import { HasuraService } from '../services/hasura/hasura.service';

@Injectable()
export class CronService {
	constructor(
		private configService: ConfigService,
		private awsRekognitionService: AwsRekognitionService,
		private hasuraService: HasuraService,
	) {}

	async fetchAllUsersExceptIds(userIds: Number[]) {
		const query = `
				query MyQuery {
					users(where: {id: {_nin: ${JSON.stringify(
						userIds,
					)}}}, order_by: {created_at: asc_nulls_first}) {
						id
					}
				}
			`;
		try {
			const users = (await this.hasuraService.getData({ query }))?.data
				?.users;
			return users;
		} catch (error) {
			console.log('fetchAllUsersExceptIds:', error);
			throw error;
		}
	}

	async fetchAllUsersToIndexFaces() {
		const query = `
				query MyQuery {
					users(
						where: {
							_or: [
								{ fa_user_indexed: { _is_null: true } },
								{ fa_user_indexed: { _eq: false } }
							]
						},
						order_by: {created_at: asc_nulls_first}
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
			console.log('fetchAllUsersExceptIds:', error);
			throw error;
		}
	}

	async disassociateAndDeleteFace(
		collectionId: string,
		userId: string,
		faceId: string,
	) {
		try {
			// Disassociate image from user
			const photoDisassociated = (
				await this.awsRekognitionService.disassociatePhotoFromUser(
					collectionId,
					userId,
					faceId,
				)
			).success;

			let response = { success: false };
			// Delete face from collection
			if (photoDisassociated) {
				const photoDeleted =
					await this.awsRekognitionService.deletePhotoFromCollection(
						collectionId,
						faceId,
					);
				if (photoDeleted) response.success = true;
			}
			return response;
		} catch (error) {
			throw error;
		}
	}

	async addAndAssociatePhotoToUser(
		collectionId: string,
		userId: string,
		imageName: string,
		externalImageId: string,
	) {
		// Add face in collection
		// const indexResponse = await this.awsRekognitionService.;
		// console.log('indexResponse:', indexResponse);
	}

	@Cron(CronExpression.EVERY_10_SECONDS)
	async indexRekognitionUsers() {
		try {
			/*----------------------- Create users in collection -----------------------*/

			// Step-1: Create collection if not exists
			const collectionId = this.configService.get<string>(
				'AWS_REKOGNITION_COLLECTION_ID',
			);
			await this.awsRekognitionService.createCollectionIfNotExists(
				collectionId,
			);

			// Step-2: Fetch all userIds exists in collection
			const usersIdsExistsInCollection = (
				await this.awsRekognitionService.getAllUsersOfCollection(
					collectionId,
				)
			).map((id) => parseInt(id));

			// Step-3: Fetch all users from database which are not present in collection
			const nonExistingUsers = await this.fetchAllUsersExceptIds(
				usersIdsExistsInCollection,
			);

			// Step-4: Create users in collection
			await this.awsRekognitionService.createUsersInCollection(
				collectionId,
				nonExistingUsers.map((userObj) => String(userObj.id)),
			);

			/*----------------------- Index faces of users -----------------------*/

			// Step-1: Fetch all users whose fa_user_indexed value is false or null.
			const usersToIndexFaces = await this.fetchAllUsersToIndexFaces();

			// Step-2: Iterate through them and index faces one by one
			for (const user of usersToIndexFaces) {
				// Step-2.1 Fetch all faceIds of the user
				await this.awsRekognitionService.getAllFacesOfUser(
					collectionId,
					String(user.id),
				);

				// Step-2.2 Perform indexing of all 3 profile photos if not indexed
				const faPhotos = JSON.parse(user.fa_photos_indexed);
				const faFaceIds = JSON.parse(user.fa_face_ids);
				for (let i = 1; i <= 3; i++) {
					const photokeyName = `profile_photo_${i}`;
					const faceIdKeyName = `faceid${i}`;

					// Step-2.2.1 If photo is already then continue
					if (faPhotos[photokeyName]) continue;
					// Step-2.2.2 Else perform indexing based on operation
					else {
						// Step-2.2.2.1 Check if the photo is deleted
						if (
							(!user[photokeyName] ||
								Object.keys(user[photokeyName]).length === 0) &&
							faFaceIds[faceIdKeyName].trim()
						) {
							// Step-2.2.2.1.1 Delete photo from collection
							const photoDeleted = (
								await this.disassociateAndDeleteFace(
									collectionId,
									user.id,
									faFaceIds[faceIdKeyName],
								)
							).success;

							// Step-2.2.2.1.2 Set fa_face_ids.faceid(i) to null.
							if (photoDeleted) faFaceIds[faceIdKeyName] = null;

							// Step-2.2.2.2 Check if the photo is updated
						} else if (faFaceIds[faceIdKeyName].trim()) {
							// Step-2.2.2.2.1 Delete photo from collection
							const photoDeleted = (
								await this.disassociateAndDeleteFace(
									collectionId,
									user.id,
									faFaceIds[faceIdKeyName],
								)
							).success;

							// Step-2.2.2.2.2 Add and associate new face photo with user
							if (photoDeleted) {
							}
						}
					}
				}
			}
		} catch (error) {
			// console.log();
		}
	}
}
