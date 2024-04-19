import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { Method } from 'src/common/method/method';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices],
	controllers: [ExamController],
	providers: [ExamService, Method],
})
export class ExamModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(CohortMiddleware)
			.exclude('/exam/schedule/subject/list/:id')
			.forRoutes(ExamController);
	}
}
