import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
const fs = require('fs');
export class HouseKeepingService {
	async downloadFiles(body) {
		const bucketName = process.env.S3_BUCKET;
		const fileNames = body.fileNames;
		const destinationFolder = body.destinationFolder;

		const s3 = new S3Client({
			region: process.env.S3_REGION,
			credentials: {
				secretAccessKey: process.env.SECRET_ACCESS_KEY,
				accessKeyId: process.env.ACCESS_KEY_ID,
			},
		});

		try {
			for (const fileName of fileNames) {
				const getObjectCommand = new GetObjectCommand({
					Bucket: bucketName,
					Key: fileName,
				});

				const getObjectCommandResponse = await s3.send(
					getObjectCommand,
				);

				// 2 - Write image from S3 to temporary file
				fs.writeFileSync(
					destinationFolder + '/' + fileName,
					await getObjectCommandResponse.Body.transformToByteArray(),
				);
			}
		} catch (error) {
			console.error('Error:', error);
		}
	}
}
