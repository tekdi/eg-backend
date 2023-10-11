import { Module } from '@nestjs/common';
import { UserCreationService } from './usercreation.service';
import { FaceIndexingService } from './faceIndexing.service';
import { MarkAttendanceService } from './markAttendance.service';
import { AwsRekognitionModule } from '../services/aws-rekognition/aws-rekognition.module';
import { HasuraModule } from '../services/hasura/hasura.module';
@Module({
	imports: [AwsRekognitionModule, HasuraModule],
	providers: [
		UserCreationService,
		FaceIndexingService,
		MarkAttendanceService,
	],
})
export class CronModule {}
