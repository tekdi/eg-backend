import { Module } from '@nestjs/common';
import { FaceIndexingService } from './faceIndexing.service';
import { MarkAttendanceService } from './markAttendance.service';
import { CalculateEligibilityService } from './calculateEligibility.service';
import { AwsRekognitionModule } from '../services/aws-rekognition/aws-rekognition.module';
import { HasuraModule } from '../services/hasura/hasura.module';
import { FacilitatorModule } from '../facilitator/facilitator.module';
@Module({
	imports: [AwsRekognitionModule, HasuraModule, FacilitatorModule],
	providers: [
		FaceIndexingService,
		MarkAttendanceService,
		CalculateEligibilityService,
	],
})
export class CronModule {}
