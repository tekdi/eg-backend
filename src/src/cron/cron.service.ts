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
			console.log('disassociateAndDeleteFace:', error);
			throw error;
		}
	}

	async addAndAssociatePhotoToUser(
		collectionId: string,
		userId: string,
		imageName: string,
	) {
		try {
			// Add face in collection
			const addFaceResponse =
				await this.awsRekognitionService.addFaceInCollection(
					collectionId,
					imageName,
				);

			const response = { success: false, faceId: addFaceResponse.faceId };
			// Associate face to user
			if (addFaceResponse.success) {
				const associatedPhoto = (
					await this.awsRekognitionService.associateFaceToUser(
						collectionId,
						userId,
						addFaceResponse.faceId,
					)
				).success;
				if (associatedPhoto) response.success = true;
			}
			return response;
		} catch (error) {
			console.log('addAndAssociatePhotoToUser:', error);
			throw error;
		}
	}

	async markUserAsIndexed(
		userId: number,
		{ photosIndexingData, faceIdsData },
	) {
		let updateQuery = `
				mutation MyMutation {
					update_users_by_pk(
						pk_columns: {
							id: ${userId}
						},
						_set: {
							fa_user_indexed: true,
							fa_photos_indexed: ${JSON.stringify(photosIndexingData)},
							fa_face_ids: ${JSON.stringify(faceIdsData)}
						}
					) {
						id
						fa_user_indexed
						fa_photos_indexed
						fa_face_ids
					}
				}
			`;
		try {
			return (await this.hasuraService.getData({ query: updateQuery }))
				.update_users_by_pk;
		} catch (error) {
			console.log('markUserAsIndexed:', error);
			throw error;
		}
	}

	async getAllUsersForAttendance() {
		const query = `
				query MyQuery {
					users(where: {
						_and: [
							{ attendances_aggregate: {count: {predicate: {_gt: 1}}} },
							{ attendances: { is_attendance_marked: {_is_null: false} } }
						]
					}) {
						id
						attendances(where: { is_attendance_marked: {_is_null: false} }) {
							id
							is_attendance_marked
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
				let userId = String(user.id);
				// Step-A Fetch all faceIds of the user
				await this.awsRekognitionService.getAllFacesOfUser(
					collectionId,
					userId,
				);

				// Step-B Perform indexing of all 3 profile photos if not indexed
				const faPhotos = JSON.parse(user.fa_photos_indexed);
				const faFaceIds = JSON.parse(user.fa_face_ids);
				for (let i = 1; i <= 3; i++) {
					const photokeyName = `profile_photo_${i}`;
					const faceIdKeyName = `faceid${i}`;

					// Step-i If photo is already then continue
					if (faPhotos[photokeyName]) continue;
					// Step-ii Else perform indexing based on operation
					else {
						// Step-a Check if the photo is deleted
						if (
							(!user[photokeyName] ||
								Object.keys(user[photokeyName]).length === 0) &&
							faFaceIds[faceIdKeyName].trim()
						) {
							// Step-a1 Delete photo from collection
							const photoDeleted = (
								await this.disassociateAndDeleteFace(
									collectionId,
									userId,
									faFaceIds[faceIdKeyName],
								)
							).success;

							// Step-a2 Set fa_face_ids.faceid(i) to null.
							if (photoDeleted) faFaceIds[faceIdKeyName] = null;

							// Step-b Else either profile photo is newly added or updated
						} else {
							let addPhoto = true;
							// Step-b1 Check if the faceId is present. If so, then profile photo is updated
							if (faFaceIds[faceIdKeyName].trim()) {
								// Step-b1 Delete photo from collection
								const photoDeleted = (
									await this.disassociateAndDeleteFace(
										collectionId,
										userId,
										faFaceIds[faceIdKeyName],
									)
								).success;
								addPhoto = photoDeleted;
							}

							// Step-b2 Add and associate new face photo with user
							if (addPhoto) {
								const addedPhotoData =
									await this.addAndAssociatePhotoToUser(
										collectionId,
										userId,
										user[photokeyName].name,
									);

								// Step-b3 Set faceid(i) to new created faceId
								if (addedPhotoData.success)
									faFaceIds[faceIdKeyName] =
										addedPhotoData.faceId;
							}
						}

						// Step-c Set profile_photo_i to true
						faPhotos[photokeyName] = true;
					}
				}

				// Step-C Set user as indexed in database
				await this.markUserAsIndexed(user.id, {
					photosIndexingData: faPhotos,
					faceIdsData: faFaceIds,
				});
			}

			/*----------------------- Mark attendance -----------------------*/
		} catch (error) {
			// console.log();
		}
	}
}
