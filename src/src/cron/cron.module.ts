import { Module } from '@nestjs/common';
import { FaUserIndexingCron } from './faUserIndexing.cron';
import { FaFaceIndexingCron } from './faFaceIndexing.cron';
import { FaAttendanceProcessingCron } from './faAttendanceProcessing.cron';
import { AwsRekognitionModule } from '../services/aws-rekognition/aws-rekognition.module';
import { HasuraModule } from '../services/hasura/hasura.module';
import { PrepareCertificateHtmlCron } from './prepareCertificateHtml.cron';
import { AttendancesModule } from 'src/attendances/attendances.module';
import { UserModule } from 'src/user/user.module';
import { Method } from 'src/common/method/method';
@Module({
	imports: [
		AwsRekognitionModule,
		HasuraModule,
		AttendancesModule,
		UserModule,
	],
	providers: [
		FaUserIndexingCron,
		FaFaceIndexingCron,
		FaAttendanceProcessingCron,
		PrepareCertificateHtmlCron,
		Method,
	],
})
export class CronModule {}
