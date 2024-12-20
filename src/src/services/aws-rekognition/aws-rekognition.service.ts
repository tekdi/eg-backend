import {
	RekognitionClient,
	ListCollectionsCommand,
	CreateCollectionCommand,
	ListFacesCommand,
	IndexFacesCommand,
	DeleteFacesCommand,
	ListUsersCommand,
	SearchUsersByImageCommand,
	CreateUserCommand,
	DeleteCollectionCommand,
	DisassociateFacesCommand,
	AssociateFacesCommand,
} from '@aws-sdk/client-rekognition';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HasuraService } from '../../services/hasura/hasura.service';

@Injectable()
export class AwsRekognitionService {
	private readonly region: string;
	private readonly accessKeyId: string;
	private readonly secretAccessKey: string;
	private readonly rekognition: RekognitionClient;
	private readonly bucketName: string;
	private readonly prefixed: string;

	constructor(
		private readonly configService: ConfigService,
		private readonly hasuraService: HasuraService,
	) {
		// Setup AWS credentials
		this.region = this.configService.get<string>('AWS_REKOGNITION_REGION');
		this.accessKeyId = this.configService.get<string>(
			'AWS_REKOGNITION_ACCESS_KEY_ID',
		);
		this.secretAccessKey = this.configService.get<string>(
			'AWS_REKOGNITION_SECRET_ACCESS_KEY',
		);
		this.bucketName = this.configService.get<string>('S3_BUCKET');
		this.prefixed = this.configService.get<string>(
			'AWS_REKOGNITION_CUSTOM_PREFIX',
		);

		this.rekognition = new RekognitionClient({
			region: this.region,
			credentials: {
				secretAccessKey: this.secretAccessKey,
				accessKeyId: this.accessKeyId,
			},
		});
	}

	async createCollectionIfNotExists(collectionId: string) {
		const response = { new: false, data: null };
		try {
			const collections = await this.rekognition.send(
				new ListCollectionsCommand({ MaxResults: 1000 }),
			);
			//.promise();
			//console.log('collections:------------>>>>>>', collections);

			if (!collections.CollectionIds.includes(collectionId)) {
				const createCollectionResponse = await this.rekognition.send(
					new CreateCollectionCommand({ CollectionId: collectionId }),
				);
				//.promise();
				//console.log('Created a new collection:');
				//console.dir(createCollectionResponse, { depth: 99 });
				response.new = true;
				response.data = createCollectionResponse;
			} else {
				response.new = false;
			}
			return response;
		} catch (error) {
			console.log('createCollectionIfNotExists:', error, error.stack);
			return response;
		}
	}

	async getAllUsersOfCollection(collectionId: string) {
		try {
			const users = (
				await this.rekognition.send(
					new ListUsersCommand({ CollectionId: collectionId }),
				)
			).Users.map((userObj) => userObj.UserId.replace(this.prefixed, '')); //.promise()

			return users;
		} catch (error) {
			console.log('getAllUsersOfCollection:', error, error.stack);
			return [];
		}
	}

	async createUsersInCollection(collectionId: string, userIds: any) {
		try {
			const aws_users = userIds;
			for (const userId of aws_users) {
				try {
					const createUserParams = {
						CollectionId: collectionId,
						UserId: this.prefixed + userId,
						ClientRequestToken:
							this.prefixed + new Date().getTime().toString(),
					};

					await this.rekognition.send(
						new CreateUserCommand(createUserParams),
					);
					//update in hasura
					await this.markUserAsCreated(userId);
					//wait some time to match aws rate limit 5 request per seconds
					await new Promise((resolve) =>
						setTimeout(
							resolve,
							parseInt(
								this.configService.get<string>(
									'AWS_REKOGNITION_CREATE_USER_REQUEST_INTERVAL_TIME',
								),
							),
						),
					);
				} catch (error) {
					console.log(
						'createUsersInCollection_forloop:',
						error,
						error.stack,
					);
				}
			}
		} catch (error) {
			console.log('createUsersInCollection:', error, error.stack);
			return [];
		}
	}

	async markUserAsCreated(userId: number) {
		let updateQuery = `
				mutation MyMutation {
					update_users_by_pk(
						pk_columns: {
							id: ${userId}
						},
						_set: {
							fa_user_created: true,
						}
					) {
						id
					}
				}
			`;
		try {
			return (await this.hasuraService.getData({ query: updateQuery }))
				.data.update_users_by_pk;
		} catch (error) {
			console.log('markUserAsIndexed:', error, error.stack);
			return [];
		}
	}

	async getAllFacesOfUser(collectionId: string, userId: string) {
		try {
			const getFaceListParams = {
				CollectionId: collectionId,
				UserId: userId,
			};
			const faces = (
				await this.rekognition.send(
					new ListFacesCommand(getFaceListParams),
				)
			).Faces.map((faceObj) => faceObj.FaceId);

			return faces;
		} catch (error) {
			console.log('getAllFacesOfUser:', error, error.stack);
			return [];
		}
	}

	async disassociatePhotoFromUser(
		collectionId: string,
		userId: string,
		faceId: string,
	) {
		const response = { success: false };
		try {
			const disassociateFaceParams = {
				CollectionId: collectionId,
				UserId: this.prefixed + userId,
				FaceIds: [faceId],
			};
			const disassociateFaceResponse = await this.rekognition.send(
				new DisassociateFacesCommand(disassociateFaceParams),
			);

			if (disassociateFaceResponse.DisassociatedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('disassociatePhotoFromUser:', error, error.stack);
			return response;
		}
	}

	async deleteFaceFromCollection(collectionId: string, faceId: string) {
		const response = { success: false };
		try {
			const deleteFaceParams = {
				CollectionId: collectionId,
				FaceIds: [faceId],
			};
			const deleteFacesResponse = await this.rekognition.send(
				new DeleteFacesCommand(deleteFaceParams),
			);

			if (deleteFacesResponse.DeletedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('deleteFaceFromCollection:', error, error.stack);
			return response;
		}
	}

	async addFaceInCollection(collectionId: string, imageName: string) {
		const response = { success: false, faceId: null };
		const regex = /[^a-zA-Z0-9_.:]+/g;
		const originalImageName = imageName;
		const modifiedImageName = originalImageName.replace(regex, '-');
		try {
			const addFaceParams = {
				CollectionId: collectionId,
				Image: {
					S3Object: {
						Bucket: this.bucketName,
						Name: originalImageName,
					},
				},
				ExternalImageId: modifiedImageName,
				MaxFaces: 1,
			};

			const addFaceResponse = await this.rekognition.send(
				new IndexFacesCommand(addFaceParams),
			);

			if (addFaceResponse.FaceRecords.length === 1) {
				response.success = true;
				response.faceId = addFaceResponse.FaceRecords[0].Face.FaceId;
			}
			return response;
		} catch (error) {
			console.log(
				`\n  END - Add face into a collection. Error!\n`,
				error,
				error.stack,
			);
			return response;
		}
	}

	async associateFaceToUser(
		collectionId: string,
		userId: string,
		faceId: string,
	) {
		const response = { success: false };
		try {
			const associateFacesParams = {
				CollectionId: collectionId.toString(),
				UserId: (this.prefixed + userId).toString(),
				FaceIds: [faceId.toString()],
				UserMatchThreshold: Number('80'),
				ClientRequestToken: (
					this.prefixed + new Date().getTime()
				).toString(),
			};

			const associateFaceResponse = await this.rekognition.send(
				new AssociateFacesCommand(associateFacesParams),
			);

			if (associateFaceResponse.AssociatedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('associateFaceToUser:', error, error.stack);
			return response;
		}
	}

	async searchUsersByImage(
		collectionId: string,
		imageName: string,
		faceMatchingThreshold: number,
	) {
		try {
			const searchParams = {
				CollectionId: collectionId,
				Image: {
					S3Object: {
						Bucket: this.bucketName,
						Name: imageName,
					},
				},
				UserMatchThreshold: faceMatchingThreshold,
				MaxUsers: 5,
			};

			const compareResponse = await this.rekognition.send(
				new SearchUsersByImageCommand(searchParams),
			);

			return compareResponse.UserMatches;
		} catch (error) {
			console.log('code error ', error?.name);
			if (error?.name == 'ProvisionedThroughputExceededException') {
				console.log('ProvisionedThroughputExceededException');
				return false;
			} else {
				console.log('searchUsersByImage:', error, error.stack);
				return [];
			}
		}
	}

	async deleteCollection(collectionId: string) {
		try {
			const deleteCollectionParams = {
				CollectionId: collectionId,
			};

			let response = await this.rekognition.send(
				new DeleteCollectionCommand(deleteCollectionParams),
			);
			return response; // For unit tests.
		} catch (err) {
			console.log('Error', err, err.stack);
			return null;
		}
	}
}
