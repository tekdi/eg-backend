import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { InterviewController } from './interview.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { ProgramIdMiddleware } from 'src/common/middlewares/programId.middleware';

@Module({
  imports: [HasuraModule],
  controllers: [InterviewController],
  providers: [InterviewService],
})
export class InterviewModule {}

