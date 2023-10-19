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
import { SentryService } from '../../services/sentry/sentry.service';

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
		private sentryService: SentryService,
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
			this.sentryService.addBreadcrumb(
				'Cron Job 1',
				'Create collection in aws with id ' + collectionId,
				'info',
			);
			this.sentryService.addBreadcrumb(
				'Cron Job 1',
				'response ListCollectionsCommand ' + collections,
				'info',
			);
			if (!collections.CollectionIds.includes(collectionId)) {
				const createCollectionResponse = await this.rekognition.send(
					new CreateCollectionCommand({ CollectionId: collectionId }),
				);
				this.sentryService.addBreadcrumb(
					'Cron Job 1',
					'response CreateCollectionCommand ' +
						createCollectionResponse,
					'info',
				);
				response.new = true;
				response.data = createCollectionResponse;
			} else {
				response.new = false;
				this.sentryService.addBreadcrumb(
					'Cron Job 1',
					`Using existing collection with ID: ${collectionId}`,
					'info',
				);
			}
			return response;
		} catch (error) {
			this.sentryService.captureException(error);
			return response;
		}
	}

	async getAllUsersOfCollection(collectionId: string) {
		try {
			const users = (
				await this.rekognition.send(
					new ListUsersCommand({ CollectionId: collectionId }),
				)
			).Users.map((userObj) => userObj.UserId.replace(this.prefixed, ''));
			this.sentryService.addBreadcrumb(
				'Cron Job 1',
				'users: ' + users.sort(),
				'info',
			);
			return users;
		} catch (error) {
			this.sentryService.captureException(error);
			return [];
		}
	}

	async createUsersInCollection(collectionId: string, userIds: any) {
		try {
			const aws_users = userIds;
			this.sentryService.addBreadcrumb(
				'Cron Job 1',
				'createUsersInCollection ' + aws_users,
				'info',
			);
			for (const userId of aws_users) {
				const createUserParams = {
					CollectionId: collectionId,
					UserId: this.prefixed + userId,
					ClientRequestToken:
						this.prefixed + new Date().getTime().toString(),
				};
				this.sentryService.addBreadcrumb(
					'Cron Job 1',
					'Trying to create user with details as: ' +
						createUserParams,
					'info',
				);
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
			}
		} catch (error) {
			this.sentryService.captureException(error);
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
		this.sentryService.addBreadcrumb(
			'Cron Job 1',
			'updateQuery: ' + updateQuery,
			'info',
		);
		try {
			return (await this.hasuraService.getData({ query: updateQuery }))
				.data.update_users_by_pk;
		} catch (error) {
			this.sentryService.captureException(error);
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
			this.sentryService.captureException(error);
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
			this.sentryService.addBreadcrumb(
				'Cron Job 2',
				'disassociateFaceResponse: ' + disassociateFaceResponse,
				'info',
			);
			if (disassociateFaceResponse.DisassociatedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			this.sentryService.captureException(error);
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
			this.sentryService.addBreadcrumb(
				'Cron Job 2',
				'deleteFacesResponse: ' + deleteFacesResponse,
				'info',
			);
			if (deleteFacesResponse.DeletedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			this.sentryService.captureException(error);
			return response;
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
			this.sentryService.addBreadcrumb(
				'Cron Job 2',
				'addFaceParams: ' + addFaceParams,
				'info',
			);
			const addFaceResponse = await this.rekognition.send(
				new IndexFacesCommand(addFaceParams),
			);
			this.sentryService.addBreadcrumb(
				'Cron Job 2',
				'addFaceResponse: ' + addFaceResponse,
				'info',
			);
			if (addFaceResponse.FaceRecords.length === 1) {
				response.success = true;
				response.faceId = addFaceResponse.FaceRecords[0].Face.FaceId;
			}
			return response;
		} catch (error) {
			this.sentryService.captureException(error);
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
			this.sentryService.addBreadcrumb(
				'Cron Job 2',
				'associateFacesParams: ' + associateFacesParams,
				'info',
			);
			const associateFaceResponse = await this.rekognition.send(
				new AssociateFacesCommand(associateFacesParams),
			);
			this.sentryService.addBreadcrumb(
				'Cron Job 2',
				'associateFaceResponse: ' + associateFaceResponse,
				'info',
			);
			if (associateFaceResponse.AssociatedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			this.sentryService.captureException(error);
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
			this.sentryService.addBreadcrumb(
				'Cron Job 3',
				'searchParams: ' + searchParams,
				'info',
			);
			const compareResponse = await this.rekognition.send(
				new SearchUsersByImageCommand(searchParams),
			);
			this.sentryService.addBreadcrumb(
				'Cron Job 3',
				'Matching faces: ' + compareResponse,
				'info',
			);
			return compareResponse.UserMatches;
		} catch (error) {
			this.sentryService.captureException(error);
			return [];
		}
	}

	async deleteCollection(collectionId: string) {
		try {
			const deleteCollectionParams = {
				CollectionId: collectionId,
			};
			this.sentryService.addBreadcrumb(
				'Cron Job 1',
				'Attempting to delete collection named: ' + collectionId,
				'info',
			);
			let response = await this.rekognition.send(
				new DeleteCollectionCommand(deleteCollectionParams),
			);
			return response; // For unit tests.
		} catch (err) {
			this.sentryService.captureException(err);
			return null;
		}
	}
}
