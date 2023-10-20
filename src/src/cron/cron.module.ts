import { Module } from '@nestjs/common';
import { FaUserIndexingCron } from './faUserIndexing.cron';
import { FaFaceIndexingCron } from './faFaceIndexing.cron';
import { FaAttendanceProcessingCron } from './faAttendanceProcessing.cron';
import { AwsRekognitionModule } from '../services/aws-rekognition/aws-rekognition.module';
import { HasuraModule } from '../services/hasura/hasura.module';
@Module({
	imports: [AwsRekognitionModule, HasuraModule],
	providers: [
		FaUserIndexingCron,
		FaFaceIndexingCron,
		FaAttendanceProcessingCron,
	],
})
export class CronModule {}
