import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { Method } from 'src/common/method/method';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { UploadFileService } from 'src/upload-file/upload-file.service';
import { S3Module } from 'src/services/s3/s3.module';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices, S3Module],
	controllers: [ExamController],
	providers: [ExamService, Method, UploadFileService],
})
export class ExamModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(CohortMiddleware).exclude().forRoutes(ExamController);
	}
}
