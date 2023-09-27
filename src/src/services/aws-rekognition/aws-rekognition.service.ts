// import * as AWS from 'aws-sdk';
// import { Rekognition } from '@aws-sdk/client-rekognition';
//import * as AWS from '@aws-sdk/client-rekognition';
// ES6 + example;
import {
	RekognitionClient,
	ListCollectionsCommand,
	CreateCollectionCommand,
	ListFacesCommand,
	IndexFacesCommand,
	DeleteFacesCommand,
	SearchFacesByImageCommand,
	ListUsersCommand,
	SearchUsersByImageCommand,
	CreateUserCommand,
	DeleteUserCommand,
	DeleteCollectionCommand,
	DisassociateFacesCommand,
	AssociateFacesCommand,
} from '@aws-sdk/client-rekognition';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AwsRekognitionService {
	private region: string;
	private accessKeyId: string;
	private secretAccessKey: string;
	private rekognition: RekognitionClient;
	private bucketName: string;
	private prefixed: string;

	constructor(private configService: ConfigService) {
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
			'AWS_PREFIXED_BEFOR_USER_ID',
		);

		// AWS.config.update({
		// 	region: this.region,
		// 	accessKeyId: this.accessKeyId,
		// 	secretAccessKey: this.secretAccessKey,
		// });

		// this.rekognition = new AWS.Rekognition();
		// const client = new RekognitionClient({ region: "REGION" });
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
			console.log('collections:------------>>>>>>', collections);

			if (!collections.CollectionIds.includes(collectionId)) {
				const createCollectionResponse = await this.rekognition.send(
					new CreateCollectionCommand({ CollectionId: collectionId }),
				);
				//.promise();
				console.log('Created a new collection:');
				console.dir(createCollectionResponse, { depth: 99 });
				response.new = true;
				response.data = createCollectionResponse;
			} else {
				response.new = false;
				console.log(
					`Using existing collection with ID: ${collectionId}`,
				);
			}
			return response;
		} catch (error) {
			console.log('createCollectionIfNotExists:', error);
			//throw error;
		}
	}

	async getAllUsersOfCollection(collectionId: string) {
		try {
			const users = (
				await this.rekognition.send(
					new ListUsersCommand({ CollectionId: collectionId }),
				)
			).Users.map((userObj) => userObj.UserId.replace(this.prefixed, '')); //.promise()
			console.log('users:---------->>>>>>>>>', users.sort());
			return users;
		} catch (error) {
			console.log('getAllUsersOfCollection:', error);
			//throw error;
		}
	}

	async createUsersInCollection(collectionId: string, userIds: string[]) {
		try {
			const aws_users = ['111', '77', '104', '78', '81'];
			for (const userId of aws_users) {
				const createUserParams = {
					CollectionId: collectionId,
					UserId: this.prefixed + userId,
					ClientRequestToken:
						this.prefixed + new Date().getTime().toString(),
				};
				console.log(
					'Trying to create user with details as:',
					createUserParams,
				);

				const createUserResponse = await this.rekognition.send(
					new CreateUserCommand(createUserParams),
				);

				console.log(
					'createUserResponse:------->>>>>>>>>>>>>>',
					createUserResponse,
				);
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
			}
		} catch (error) {
			console.log('createUsersInCollection:', error);
			//throw error;
		}
	}

	async getAllFacesOfUser(collectionId: string, userId: string) {
		const aws_users = ['111', '77', '104', '78', '81'];
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
			console.log('faces:--------->>>>>>>>>>>>>>>>', faces);
			return faces;
		} catch (error) {
			console.log('getAllFacesOfUser:', error);
			//throw error;
		}
	}

	async disassociatePhotoFromUser(
		collectionId: string,
		userId: string,
		faceId: string,
	) {
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
			console.log('disassociateFaceResponse:', disassociateFaceResponse);
			const response = { success: false };
			if (disassociateFaceResponse.DisassociatedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('disassociatePhotoFromUser:', error);
			//throw error;
		}
	}

	async deletePhotoFromCollection(collectionId: string, faceId: string) {
		try {
			const deleteFaceParams = {
				CollectionId: collectionId,
				FaceIds: [faceId],
			};
			const deleteFacesResponse = await this.rekognition.send(
				new DeleteFacesCommand(deleteFaceParams),
			);
			//.promise();
			console.log(
				'deleteFacesResponse:--------->>>>>>>',
				deleteFacesResponse,
			);
			const response = { success: false };
			if (deleteFacesResponse.DeletedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('deletePhotoFromCollection:', error);
			//throw error;
		}
	}

	async addFaceInCollection(collectionId: string, imageName: string) {
		const response = { success: false, faceId: null };
		try {
			const addFaceParams = {
				CollectionId: collectionId,
				Image: {
					S3Object: {
						Bucket: this.bucketName,
						Name: imageName,
					},
				},
				ExternalImageId: imageName,
				MaxFaces: 1,
			};
			console.log('addFaceParams:------------->>>>', addFaceParams);

			const addFaceResponse = await this.rekognition.send(
				new IndexFacesCommand(addFaceParams),
			);

			//.promise();
			console.log('addFaceResponse:');
			console.dir(addFaceResponse, { depth: 99 });
			if (addFaceResponse.FaceRecords.length === 1) {
				response.success = true;
				response.faceId = addFaceResponse.FaceRecords[0].Face.FaceId;
			}
			return response;
		} catch (error) {
			console.log('addFaceInCollection:', error);
			if (error.statusCode === 400) {
				response.success = false;
				return response;
			} else throw error;
		}
	}

	async associateFaceToUser(
		collectionId: string,
		userId: string,
		faceId: string,
	) {
		try {
			const associateFacesParams = {
				CollectionId: collectionId,
				UserId: this.prefixed + userId,
				FaceIds: [faceId],
				ClientRequestToken:
					this.prefixed + new Date().getTime().toString(),
			};
			console.log(
				'associateFacesParams------->>>>>>>',
				associateFacesParams,
			);

			const associateFaceResponse = await this.rekognition.send(
				new AssociateFacesCommand(associateFacesParams),
			);
			//.promise();
			console.log('associateFaceResponse:');
			console.dir(associateFaceResponse);
			const response = { success: false };
			if (associateFaceResponse.AssociatedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('associateFaceToUser:', error);
			//throw error;
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
			console.log('searchParams:------------->>>>', searchParams);
			const compareResponse = await this.rekognition.send(
				new SearchUsersByImageCommand(searchParams),
			);
			//.promise();
			console.log('Matching faces:');
			console.dir(compareResponse, { depth: 99 });
			return compareResponse.SearchedFace;
		} catch (error) {
			console.log('searchUsersByImage:', error);
			//throw error;
		}
	}

	async deleteCollection(
		collectionId: string,
		userId: string,
		faceId: string,
	) {
		try {
			const deleteFaceParams = {
				CollectionId: collectionId,
				userId: this.prefixed + userId,
				FaceIds: [faceId],
			};
			console.log(
				`Attempting to delete collection named - ${collectionId}`,
			);
			var response = await this.rekognition.send(
				new DeleteCollectionCommand(deleteFaceParams),
			);
			var status_code = response.StatusCode;
			if ((status_code = 200)) {
				console.log('Collection successfully deleted.');
			}
			return response; // For unit tests.
		} catch (err) {
			console.log('Error', err.stack);
		}
	}
}
