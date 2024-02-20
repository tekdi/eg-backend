import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/hasura/hasura.module';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

@Module({
	imports: [HasuraModule],
	controllers: [InterviewController],
	providers: [InterviewService],
})
export class InterviewModule {}
