import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	PutObjectCommandInput,
	PutObjectCommandOutput,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
	private region: string;
	private s3: S3Client;

	constructor(private configService: ConfigService) {
		this.region = this.configService.get<string>('S3_REGION');
		this.s3 = new S3Client({
			region: this.region,
			credentials: {
				secretAccessKey:
					this.configService.get<string>('SECRET_ACCESS_KEY'),
				accessKeyId: this.configService.get<string>('ACCESS_KEY_ID'),
			},
		});
	}

	async uploadFile(fileBuffer: Buffer, key: string, contentType: string) {
		const bucket = this.configService.get<string>('S3_BUCKET');
		const input: PutObjectCommandInput = {
			Body: fileBuffer,
			Bucket: bucket,
			Key: key,
			ContentType: contentType,
		};

		try {
			const response: PutObjectCommandOutput = await this.s3.send(
				new PutObjectCommand(input),
			);

			if (response.$metadata.httpStatusCode === 200) {
				console.log(response.$metadata);

				return await this.getFileUrl(key);
			}

			throw new Error('S3 - Error in uploading file');
		} catch (err) {
			console.log('S3 - Error in uploading file:', err);
		}
	}

	async getFileUrl(key: string) {
		const bucket = this.configService.get<string>('S3_BUCKET');
		const expiresIn = this.configService.get<number>('EXPIRES_IN');

		try {
			const client = this.s3;
			const command = new GetObjectCommand({ Bucket: bucket, Key: key });
			return getSignedUrl(client, command, { expiresIn: expiresIn });
		} catch (err) {
			console.log('getFileUrl err', err);
		}
	}

	async deletePhoto(photoKey: string) {
		try {
			const params = {
				Bucket: this.configService.get<string>('S3_BUCKET'),
				Key: photoKey,
			};
			const client = this.s3;
			const command = new DeleteObjectCommand(params);
			return await client.send(command);
		} catch (error) {
			console.log('error occur', error);
			throw new Error(error.message);
		}
	}
}
