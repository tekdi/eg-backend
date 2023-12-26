import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesCoreService } from './attendances.core.service';
import { AttendancesController } from './attendances.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { ProgramIdMiddleware } from 'src/common/middlewares/programId.middleware';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices],
	controllers: [AttendancesController],
	providers: [AttendancesService, AttendancesCoreService],
	exports: [AttendancesService, AttendancesCoreService],
})
export class AttendancesModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(ProgramIdMiddleware)
		.exclude(
			'/attendances/:id'
		).forRoutes(AttendancesController);

		consumer
        .apply(CohortMiddleware)
        .exclude(
            '/attendances/:id',
        )
        .forRoutes(AttendancesController);
	}
}