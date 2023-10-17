import { Module } from '@nestjs/common';
import { AwsRekognitionService } from './aws-rekognition.service';
import { HasuraModule } from '../../services/hasura/hasura.module';

@Module({
	imports: [HasuraModule],
	providers: [AwsRekognitionService],
	exports: [AwsRekognitionService],
})
export class AwsRekognitionModule {}
