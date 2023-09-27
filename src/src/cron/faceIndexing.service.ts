import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AwsRekognitionService } from '../services/aws-rekognition/aws-rekognition.service';
import { HasuraService } from '../services/hasura/hasura.service';

@Injectable()
export class FaceIndexingService {
	constructor(
		private configService: ConfigService,
		private awsRekognitionService: AwsRekognitionService,
		private hasuraService: HasuraService,
	) {}

	async fetchAllUsersExceptIds(userIds: number[]) {
		const query = `
				query MyQuery {
					users(
						where: {
							id: {_nin: ${JSON.stringify(userIds)}}
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
			console.log('fetchALluser------>>>>>', users);

			return users;
		} catch (error) {
			console.log('fetchAllUsersExceptIds:', error);
			throw error;
		}
	}

	async fetchAllUsersToIndexFaces(limit: number) {
		const query = `
				query MyQuery {
					users(
						where: {
							_or: [
								{ fa_user_indexed: { _is_null: false } },
								{ fa_user_indexed: { _eq: true } }
							]
						},
						order_by: {created_at: asc_nulls_first},
						limit: ${limit}
					) {
						id
						fa_photos_indexed
						fa_face_ids
						profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
							id
							name
							doument_type
							document_sub_type
							path
						}
						profile_photo_2: documents(where: {document_sub_type: {_eq: "profile_photo_2"}}) {
							id
							name
							doument_type
							document_sub_type
							path
						}
						profile_photo_3: documents(where: {document_sub_type: {_eq: "profile_photo_3"}}) {
							id
							name
							doument_type
							document_sub_type
							path
						}
					}
				}
			`;
		try {
			let users = (await this.hasuraService.getData({ query }))?.data
				?.users;
			console.log('fetchindex------>>>>>', users);
			users.forEach((user) => {
				for (const key of [
					'profile_photo_1',
					'profile_photo_2',
					'profile_photo_3',
				]) {
					if (user?.[key] && user?.[key][0]) {
						user[key] = user[key][0];
					} else {
						user[key] = {};
					}
				}
			});
			console.log('fetchindex1------>>>>>', users);
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
		// Disassociate image from user
		const photoDisassociated = (
			await this.awsRekognitionService.disassociatePhotoFromUser(
				collectionId,
				userId,
				faceId,
			)
		).success;
		console.log('photoDisassociated------>>>>>', photoDisassociated);
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
	}

	async addAndAssociatePhotoToUser(
		collectionId: string,
		userId: string,
		imageName: string,
		faceId: string,
	) {
		// Add face in collection
		const addFaceResponse =
			await this.awsRekognitionService.addFaceInCollection(
				collectionId,
				imageName,
			);
		console.log('addFaceResponse111------>>>>>', addFaceResponse);
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
							fa_photos_indexed: "${JSON.stringify(photosIndexingData).replace(/"/g, '\\"')}",
							fa_face_ids: "${JSON.stringify(faceIdsData).replace(/"/g, '\\"')}"
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
				.data.update_users_by_pk;
		} catch (error) {
			console.log('markUserAsIndexed:', error);
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
	@Cron(CronExpression.EVERY_MINUTE)
	async indexRekognitionUsers() {
		try {
			/*----------------------- Create users in collection -----------------------*/

			const collectionId = this.configService.get<string>(
				'AWS_REKOGNITION_COLLECTION_ID',
			);
			//delete
			await this.awsRekognitionService.deleteCollection(
				collectionId,
				'userId',
				'faceId',
			);
			//Step-1: Create collection if not exists
			await this.awsRekognitionService.createCollectionIfNotExists(
				collectionId,
			);

			// Step-2: Fetch all userIds exists in collection
			const usersIdsExistsInCollection = (
				await this.awsRekognitionService.getAllUsersOfCollection(
					collectionId,
				)
			).map((id) => parseInt(id));
			console.log(
				'usersIdsExistsInCollection',
				usersIdsExistsInCollection.sort(),
			);
			// Step-3: Fetch all users from database which are not present in collection
			const nonExistingUsers = await this.fetchAllUsersExceptIds(
				usersIdsExistsInCollection,
				// .map((user) => {
				// 	// Ensure that it is a valid integer, or use a default value if it's NaN
				// 	return isNaN(user) ? 0 : user;
				// }),
			);

			// Step-4: Create users in collection
			await this.awsRekognitionService.createUsersInCollection(
				collectionId,
				nonExistingUsers.map((userObj) => String(userObj.id)),
			);

			/*----------------------- Index faces of users -----------------------*/

			// Step-1: Fetch all users whose fa_user_indexed value is false or null.
			const usersToIndexFaces = await this.fetchAllUsersToIndexFaces(
				parseInt(
					this.configService.get<string>(
						'AWS_REKOGNITION_INDEX_USER_BATCH_SIZE',
					),
				),
			);
			//console.dir(usersToIndexFaces, { depth: 99 });
			console.log('usersToINdexfaces-->>', usersToIndexFaces);

			// Step-2: Iterate through them and index faces one by one
			for (const user of usersToIndexFaces) {
				console.log('index-user-->>', user);
				let userId = String(user.id);
				console.log('faPhotos---->>>>', userId);
				// Step-A Perform indexing of all 3 profile photos if not indexed
				const faPhotos = JSON.parse(user.fa_photos_indexed);
				console.log('faPhotos---->>>>', faPhotos);

				const faFaceIds = JSON.parse(user.fa_face_ids);
				console.log('faPhotos1:', faPhotos);
				console.log('faFaceIds1:', faFaceIds);
				let isUpdated = false;
				for (let i = 1; i <= 3; i++) {
					const photokeyName = `profile_photo_${i}`;
					const faceIdKeyName = `faceid${i}`;

					const isProfilePhotoNotAvailable =
						!user[photokeyName] ||
						Object.keys(user[photokeyName]).length === 0;
					const isFaceIdAvailable = Boolean(
						faFaceIds[faceIdKeyName]?.trim(),
					);
					// Step-i If photo is already indexed or not uploded then continue
					if (
						faPhotos[photokeyName] ||
						(isProfilePhotoNotAvailable && !isFaceIdAvailable)
					)
						continue;
					// Step-ii Else perform indexing based on operation
					else {
						let isSuccess = false;
						// Step-a Check if the photo is deleted
						if (isProfilePhotoNotAvailable && isFaceIdAvailable) {
							// Step-a1 Delete photo from collection
							const photoDeleted = (
								await this.disassociateAndDeleteFace(
									collectionId,
									userId,
									faFaceIds[faceIdKeyName],
								)
							).success;
							// Step-a2 Set fa_face_ids.faceid(i) to null.
							if (photoDeleted) {
								faFaceIds[faceIdKeyName] = null;
								isSuccess = true;
							}
							// Step-b Else either profile photo is newly added or updated
						} else {
							let addPhoto = true;
							// Step-b1 Check if the faceId is present. If so, then profile photo is updated
							if (isFaceIdAvailable) {
								// Step-b1 Delete photo from collection
								const photoDeleted = (
									await this.disassociateAndDeleteFace(
										collectionId,
										userId,
										faFaceIds[faceIdKeyName],
									)
								).success;
								addPhoto = photoDeleted;
								// Set delay
								await new Promise((resolve) =>
									setTimeout(
										resolve,
										parseInt(
											this.configService.get<string>(
												'AWS_REKOGNITION_AFTER_DELETE_IMAGE_INTERVAL_TIME',
											),
										),
									),
								);
							}

							// Step-b2 Add and associate new face photo with user
							if (addPhoto) {
								const addedPhotoData =
									await this.addAndAssociatePhotoToUser(
										collectionId,
										userId,
										user[photokeyName].name,
										faFaceIds,
									);

								// Step-b3 Set faceid(i) to new created faceId
								if (addedPhotoData.success) {
									faFaceIds[faceIdKeyName] =
										addedPhotoData.faceId;
									isSuccess = true;
								}
							}
						}

						// Step-c Set profile_photo_i to true
						if (isSuccess) {
							faPhotos[photokeyName] = true;
							isUpdated = true;
						}
					}
				}

				console.log('faPhotos2');
				console.dir(faPhotos);
				console.log('\nfaFaceIds2');
				console.log(faFaceIds);
				// Step-C Set user as indexed in database
				if (isUpdated) {
					await this.markUserAsIndexed(user.id, {
						photosIndexingData: faPhotos,
						faceIdsData: faFaceIds,
					});
					// Set delay between two indexing process
					await new Promise((resolve) =>
						setTimeout(
							resolve,
							parseInt(
								this.configService.get<string>(
									'AWS_REKOGNITION_INDEX_USER_PROCESS_INTERVAL_TIME',
								),
							),
						),
					);
				}
			}
		} catch (error) {
			console.log('Error occurred in indexRekognitionUsers.');
		}
	}
}
