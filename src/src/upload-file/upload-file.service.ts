import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import * as sharp from 'sharp';

import { HasuraService } from 'src/services/hasura/hasura.service';
import { S3Service } from 'src/services/s3/s3.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class UploadFileService {
	constructor(
		private hasuraServiceFromServices: HasuraServiceFromServices,

		private readonly s3Service: S3Service,
		private readonly hasuraService: HasuraService,
	) {}

	private imageTypesToBeResized = ['.gif', '.jpg', '.jpeg', '.png', '.webp'];
	private imageResizingVariants = [32, 64, 128, 256];
	private imageResizingFolderPrefix = 'resized';

	private documentTypesToBeResizedArray = [
		'profile',
		'profile_photo',
		'profile_photo_1',
		'profile_photo_2',
		'profile_photo_3',
	];

	private documentSubtypesArray = [
		'aadhaar_front',
		'aadhaar_back',
		'profile_photo_1',
		'profile_photo_2',
		'profile_photo_3',
	];

	// Function to check file mime type (no change)
	async isImage(fileExtension: string): Promise<boolean> {
		return this.imageTypesToBeResized.includes(fileExtension);
	}

	// Function to download and resize image (updated for SDK v3)
	async resizeImage(file: Express.Multer.File, key: string) {
		let mimeType = file.mimetype;
		console.log(mimeType);

		// Resize to multiple widths in pixels
		for (const size of this.imageResizingVariants) {
			let newKey = `${this.imageResizingFolderPrefix}/${size}x${size}/${key}`;
			let width = size;
			let height = size;
			let options = {
				// Specify the fit strategy (cover, contain, fill, inside, outside)
				fit: sharp.fit.contain,
			};

			// Resize the image
			let resizedImage = await sharp(file.buffer)
				.keepExif()
				.resize(width, height, options)
				.toBuffer();

			let fileUrl = await this.s3Service.uploadFile(
				resizedImage,
				newKey,
				mimeType,
			);

			/*console.log(
				`S3 upload response for ${newKey}: `,
				JSON.stringify(fileUrl, null, 2),
			);*/
		}
	}

	async addFile(
		file: Express.Multer.File,
		id: number,
		document_type: string,
		document_sub_type: string,
		response: Response,
	) {
		if (!file?.originalname) {
			return response.status(400).send({
				success: false,
				status: 'Not Found',
				message: 'Document Not Passed',
				data: {},
			});
		}

		// Generate file name
		const originalName = file?.originalname
			.split(' ')
			.join('')
			.toLowerCase();
		const [name, fileType] = originalName.split('.');
		let key = `${name}${Date.now()}.${fileType}`;

		// Upload document / image file
		const fileUrl = await this.s3Service.uploadFile(
			file.buffer,
			key,
			file.mimetype,
		);

		// Decide to resize
		let isFileImage = await this.isImage(`.${fileType}`);
		if (
			isFileImage &&
			this.documentTypesToBeResizedArray.includes(document_type)
		) {
			await this.resizeImage(file, key);
		} else {
			console.log(
				`Document type: ${document_type} is not an image or not to be resized`,
			);
		}

		if (this.documentSubtypesArray.includes(document_sub_type)) {
			try {
				const data = {
					query: `query MyQuery {
					users(where: {id: {_eq: ${id}}}) {
					  id
					  username
					  mobile
					  ${document_sub_type}: documents(where: {document_sub_type: {_eq: "${document_sub_type}"}}) {
						id
						name
						doument_type
						document_sub_type
						path
					  }
					}
				  }`,
				};

				// Fetch documents data based on id and docuent_type
				const response = await this.hasuraServiceFromServices.getData(
					data,
				);
				let result = response?.data?.users;
				let FileData: any = result[0][document_sub_type];
				if (FileData.length > 0) {
					const deleteRecordsFromDBPromise = [];
					const deleteRecordsFromS3Promise = [];
					const deleteResizedImagesFromS3Promise = [];

					for (let item of FileData) {
						// Add all existing DB records into promise
						deleteRecordsFromDBPromise.push(
							this.hasuraService.delete('documents', {
								id: item.id,
							}),
						);

						// Add all existing S3 records into promise
						deleteRecordsFromS3Promise.push(
							this.s3Service.deletePhoto(item.name),
						);

						// Add all existing S3 records into promise
						for (const size of this.imageResizingVariants) {
							let newKey = `${this.imageResizingFolderPrefix}/${size}x${size}/${item.name}`;
							deleteResizedImagesFromS3Promise.push(
								this.s3Service.deletePhoto(newKey),
							);
						}
					}

					// Delete all existing records from table
					await Promise.all(deleteRecordsFromDBPromise);

					// Delete all existing records from s3 bucket
					await Promise.all(deleteRecordsFromS3Promise);

					try {
						await Promise.all(deleteResizedImagesFromS3Promise);
					} catch (error) {
						console.log(
							'Error while deleting old resized images: ',
							error,
						);
					}
				}
			} catch (error) {
				return response.status(500).send({
					success: false,

					message: 'Unable to Upload documents',
					data: {},
				});
			}
		}
		if (fileUrl) {
			let query = {
				query: `mutation MyMutation {
				  insert_documents(objects: {name: "${key}", path: "/user/docs", provider: "s3", updated_by: "${id}", user_id: "${id}", doument_type: "${document_type}", document_sub_type: "${
					document_sub_type ?? document_type
				}", created_by: "${id}"}) {
					affected_rows
					returning {
					  id
					  doument_type
					  document_sub_type
					  path
					  name
					  user_id
					  updated_by
					  provider
					  created_by
					  context_id
					  context
					}
				  }
				}`,
			};
			const res = await this.hasuraService.postData(query);

			if (res) {
				return response.status(200).send({
					success: true,
					status: 'Success',
					message: 'File uploaded successfully!',
					data: { key: key, fileUrl: fileUrl, data: res.data },
				});
			} else {
				return response.status(200).send({
					success: false,
					status: 'Success',
					message: 'Unable to update documents db',
					data: null,
				});
			}
		} else {
			return response.status(200).send({
				success: false,
				status: 'Success',
				message: 'Unable to upload file',
				data: null,
			});
		}
	}

	async addFileNoMeta(file: Express.Multer.File, response: Response) {
		if (!file?.originalname) {
			return response.status(400).send({
				success: false,
				status: 'Not Found',
				message: 'Document Not Passed',
				data: {},
			});
		}

		// Generate file name
		const originalName = file.originalname
			.split(' ')
			.join('')
			.toLowerCase();
		const [name, fileType] = originalName.split('.');
		let key = `${name}${Date.now()}.${fileType}`;

		const fileUrl = await this.s3Service.uploadFile(
			file.buffer,
			key,
			file.mimetype,
		);

		if (fileUrl) {
			return response.status(200).send({
				success: true,
				status: 'Success',
				message: 'File uploaded successfully!',
				data: { key: key, fileUrl: fileUrl },
			});
		} else {
			return response.status(500).send({
				success: false,

				message: 'Unable to upload file',
				data: {},
			});
		}
	}

	async getResizedImagePath(key: string, size: any) {
		let resizedImagePath = key;

		// Get file extension
		const originalName = key.split(' ').join('').toLowerCase();
		const [name, fileType] = originalName.split('.');
		let isFileImage = await this.isImage(`.${fileType}`);

		// If file is of image type and if passed size is allowed, then get resized image
		if (
			isFileImage &&
			size &&
			size !== 'original' &&
			this.imageResizingVariants.includes(Number(size))
		) {
			resizedImagePath = `resized/${size}x${size}/${key}`;
		}

		return resizedImagePath;
	}

	async getFile(id: string, size: any, response: Response) {
		let key = id;

		// Check if resized image is requested
		key = await this.getResizedImagePath(key, size);

		const fileUrl = await this.s3Service.getFileUrl(key);

		if (fileUrl) {
			return response.status(200).send({
				success: true,
				status: '200',
				message: 'File fetched successfully!',
				data: { key: key, fileUrl: fileUrl },
			});
		} else {
			return response.status(404).send({
				success: false,
				status: '404',
				message: 'Unable to get file',
				data: null,
			});
		}
	}

	async getDocumentById(id: string, size: any, response?: Response) {
		const hasuraData = {
			query: `
				query MyQuery {
					documents_by_pk(id: ${id}) {
						id
						name
						doument_type
						document_sub_type
						path
						provider
						context
						context_id
					}
				}
			`,
		};

		const hasuraResponse = await this.hasuraService.getData(hasuraData);

		const documentData: any = hasuraResponse?.data?.documents_by_pk;
		if (!documentData?.name) {
			const result = {
				success: false,
				status: 404,
				message: 'Document not exists!',
				data: null,
			};
			if (response) {
				return response.status(404).send(result);
			} else {
				return result;
			}
		}

		// Check if resized image is requested
		let key = await this.getResizedImagePath(documentData.name, size);
		const fileUrl = await this.s3Service.getFileUrl(key);
		let result;
		if (fileUrl) {
			result = {
				success: true,
				status: 200,
				message: 'File fetched successfully!',
				data: {
					key: key,
					fileUrl: fileUrl,
					documentData,
				},
			};
			if (response) {
				return response.status(200).send(result);
			} else {
				return result;
			}
		} else {
			let result = {
				success: false,
				status: 404,
				message: 'Unable to get file',
				data: null,
			};

			if (response) {
				return response.status(200).send(result);
			} else {
				return result;
			}
		}
	}
}
