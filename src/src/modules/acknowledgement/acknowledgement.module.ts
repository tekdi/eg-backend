import { Module } from '@nestjs/common';
import { AcknowledgementService } from './acknowledgement.service';
import { HasuraModule } from '../../services/hasura/hasura.module';

@Module({
	imports: [HasuraModule],
	providers: [AcknowledgementService],
	exports: [AcknowledgementService],
})
export class AcknowledgementModule {}
