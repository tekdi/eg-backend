import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { AwsRekognitionModule } from '../services/aws-rekognition/aws-rekognition.module';
import { HasuraModule } from '../services/hasura/hasura.module';
@Module({
	imports: [AwsRekognitionModule, HasuraModule],
	providers: [CronService],
})
export class CronModule {}
