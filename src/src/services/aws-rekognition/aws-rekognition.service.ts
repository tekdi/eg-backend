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
	private region: string;
	private accessKeyId: string;
	private secretAccessKey: string;
	private rekognition: RekognitionClient;
	private bucketName: string;
	private prefixed: string;

	constructor(
		private configService: ConfigService,
		private hasuraService: HasuraService,
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
				/*console.log(
					`Using existing collection with ID: ${collectionId}`,
				);*/
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
			//console.log('users:---------->>>>>>>>>', users.sort());
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
					/*console.log(
					'Trying to create user with details as:',
					createUserParams,
				);*/
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
			//console.log('faces:--------->>>>>>>>>>>>>>>>', faces);
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
			//.promise();
			//console.log('disassociateFaceResponse:', disassociateFaceResponse);
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
			//.promise();
			/*console.log(
				'deleteFacesResponse:--------->>>>>>>',
				deleteFacesResponse,
			);*/
			if (deleteFacesResponse.DeletedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('deleteFaceFromCollection:', error, error.stack);
			return response;
		}
	}

	async addFaceInCollection(collectionId: string, imageName: string) {
		/*console.log(
			'\nSTART - Add face into a collection with details as: collectionId, imageName',
			collectionId,
			imageName,
		);*/
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
						Name: modifiedImageName,
					},
				},
				ExternalImageId: modifiedImageName,
				MaxFaces: 1,
			};
			/*console.log(
				`\nSTART - Add face into a collection with params:\n`,
				addFaceParams,
			);*/

			const addFaceResponse = await this.rekognition.send(
				new IndexFacesCommand(addFaceParams),
			);

			//console.log(`\nSTART - Add face into a collection. Success!\n`);
			//console.dir(addFaceResponse, { depth: 99 });
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
			/*console.log(
				'associateFacesParams------->>>>>>>',
				associateFacesParams,
			);*/

			const associateFaceResponse = await this.rekognition.send(
				new AssociateFacesCommand(associateFacesParams),
			);
			//.promise();
			//console.log('associateFaceResponse:');
			//console.dir(associateFaceResponse);
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
			//console.log('searchParams:------------->>>>', searchParams);
			const compareResponse = await this.rekognition.send(
				new SearchUsersByImageCommand(searchParams),
			);
			//.promise();
			//console.log('Matching faces:');
			//console.dir(compareResponse, { depth: 99 });
			return compareResponse.UserMatches;
		} catch (error) {
			console.log('searchUsersByImage:', error, error.stack);
			return [];
		}
	}

	async deleteCollection(collectionId: string) {
		try {
			const deleteCollectionParams = {
				CollectionId: collectionId,
			};
			/*console.log(
				`Attempting to delete collection named - ${collectionId}`,
			);*/
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
