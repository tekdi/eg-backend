import { Module } from '@nestjs/common';
import { AwsRekognitionService } from './aws-rekognition.service';
import { HasuraModule } from '../../services/hasura/hasura.module';
import { SentryModule } from '../../services/sentry/sentry.module';

@Module({
	imports: [HasuraModule,SentryModule],
	providers: [AwsRekognitionService],
	exports: [AwsRekognitionService],
})
export class AwsRekognitionModule {}
