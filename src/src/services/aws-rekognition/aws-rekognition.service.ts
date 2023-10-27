import {
	AssociateFacesCommand,
	CreateCollectionCommand,
	CreateUserCommand,
	DeleteCollectionCommand,
	DeleteFacesCommand,
	DisassociateFacesCommand,
	IndexFacesCommand,
	ListCollectionsCommand,
	ListFacesCommand,
	ListUsersCommand,
	RekognitionClient,
	SearchUsersByImageCommand,
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

		// Init client
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

			/*this.sentryService.addBreadcrumb({
				type: 'debug',
				level: 'info',
				category:
					'services.aws-rekognition.createCollectionIfNotExists',
				message: 'AWS-API - Get ListCollectionsCommand response',
				data: { collections },
			});*/

			if (!collections.CollectionIds.includes(collectionId)) {
				let createCollectionCommandInput = { CollectionId: collectionId };

				this.sentryService.addBreadcrumb({
					category:
						'services.aws-rekognition.createCollectionIfNotExists',
					message: 'AWS-API - Get CreateCollectionCommand input',
					data: createCollectionCommandInput,
				});

				const createCollectionResponse = await this.rekognition.send(
					new CreateCollectionCommand(createCollectionCommandInput),
				);

				this.sentryService.addBreadcrumb({
					category:
						'services.aws-rekognition.createCollectionIfNotExists',
					message: 'AWS-API - CreateCollectionCommand response',
					data: { createCollectionResponse },
				});

				response.new = true;
				response.data = createCollectionResponse;
			} else {
				response.new = false;
			}

			return response;
		} catch (error) {
			this.sentryService.captureException(error);

			return response;
		}
	}

	async getAllUsersOfCollection(collectionId: string) {
		try {
			const listUsersParams = { CollectionId: collectionId }

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.getAllUsersOfCollection',
				message: 'AWS-API - ListUsersCommand input',
				data: listUsersParams,
			});

			const users = (
				await this.rekognition.send(
					new ListUsersCommand(listUsersParams),
				)
			).Users.map((userObj) => userObj.UserId.replace(this.prefixed, ''));

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.getAllUsersOfCollection',
				message: 'AWS-API - ListUsersCommand response',
				data: { users },
			});

			return users;
		} catch (error) {
			this.sentryService.captureException(error);

			return [];
		}
	}

	async createUsersInCollection(collectionId: string, userIds: any) {
		try {
			const aws_users = userIds;

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.createUsersInCollection',
				message: 'Users to be added into collection',
				data: { aws_users: aws_users },
			});

			for (const userId of aws_users) {
				const createUserParams = {
					CollectionId: collectionId,
					UserId: this.prefixed + userId,
					ClientRequestToken:
						this.prefixed + new Date().getTime().toString(),
				};

				this.sentryService.addBreadcrumb({
					category:
						'services.aws-rekognition.createUsersInCollection',
					message: 'AWS-API - CreateUserCommand input',
					data: { createUserParams },
				});

				let createUserResponse = await this.rekognition.send(
					new CreateUserCommand(createUserParams),
				);

				this.sentryService.addBreadcrumb({
					category: 'services.aws-rekognition.createUsersInCollection',
					message: 'AWS-API - CreateUserCommand response',
					data: { createUserResponse },
				});

				// Update in hasura
				await this.markUserAsCreated(userId);

				// Wait some time to match aws rate limit 5 request per seconds
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

		this.sentryService.addBreadcrumb({
			category: 'services.aws-rekognition.markUserAsCreated',
			message: 'GQL Mutation - Update User',
			data: { query: updateQuery },
		});

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

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.getAllFacesOfUser',
				message: 'AWS-API - ListFacesCommand input',
				data: { getFaceListParams },
			});

			const faces = (
				await this.rekognition.send(
					new ListFacesCommand(getFaceListParams),
				)
			).Faces.map((faceObj) => faceObj.FaceId);

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.getAllFacesOfUser',
				message: 'AWS-API - ListFacesCommand response',
				data: { faces },
			});

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

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.disassociatePhotoFromUser',
				message: 'AWS-API - DisassociateFacesCommand input',
				data: { disassociateFaceParams },
			});

			const disassociateFaceResponse = await this.rekognition.send(
				new DisassociateFacesCommand(disassociateFaceParams),
			);

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.disassociatePhotoFromUser',
				message: 'AWS-API - DisassociateFacesCommand response',
				data: { disassociateFaceResponse },
			});

			if (disassociateFaceResponse.DisassociatedFaces.length === 1) {
				response.success = true;
			}

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

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.deleteFaceFromCollection',
				message: 'AWS-API - DeleteFacesCommand input',
				data: { deleteFaceParams },
			});

			const deleteFacesResponse = await this.rekognition.send(
				new DeleteFacesCommand(deleteFaceParams),
			);

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.deleteFaceFromCollection',
				message: 'AWS-API - DeleteFacesCommand response',
				data: { deleteFacesResponse },
			});

			if (deleteFacesResponse.DeletedFaces.length === 1) {
				response.success = true;
			}

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

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.addFaceInCollection',
				message: 'AWS-API - IndexFacesCommand response',
				data: { addFaceParams },
			});

			const addFaceResponse = await this.rekognition.send(
				new IndexFacesCommand(addFaceParams),
			);

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.addFaceInCollection',
				message: 'AWS-API - IndexFacesCommand response',
				data: { addFaceResponse },
			});

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

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.associateFaceToUser',
				message: 'AWS-API - AssociateFacesCommand input',
				data: { associateFacesParams },
			});

			const associateFaceResponse = await this.rekognition.send(
				new AssociateFacesCommand(associateFacesParams),
			);

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.associateFaceToUser',
				message: 'AWS-API - AssociateFacesCommand response',
				data: { associateFaceResponse },
			});

			if (associateFaceResponse.AssociatedFaces.length === 1) {
				response.success = true;
			}

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

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.searchUsersByImage',
				message: 'AWS-API - SearchUsersByImageCommand input',
				data: { searchParams },
			});

			const compareResponse = await this.rekognition.send(
				new SearchUsersByImageCommand(searchParams),
			);

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.searchUsersByImage',
				message: 'AWS-API - SearchUsersByImageCommand response',
				data: { compareResponse },
			});

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

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.deleteCollection',
				message: 'AWS-API - DeleteCollectionCommand input',
				data: { deleteCollectionParams },
			});

			let response = await this.rekognition.send(
				new DeleteCollectionCommand(deleteCollectionParams),
			);

			this.sentryService.addBreadcrumb({
				category: 'services.aws-rekognition.deleteCollection',
				message: 'AWS-API - DeleteCollectionCommand response',
				data: { response },
			});

			return response;
		} catch (err) {
			this.sentryService.captureException(err);

			return null;
		}
	}
}
