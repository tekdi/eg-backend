import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { AttendancesController } from './attendances.controller';
import { AttendancesCoreService } from './attendances.core.service';
import { AttendancesService } from './attendances.service';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices],
	controllers: [AttendancesController],
	providers: [AttendancesService, AttendancesCoreService],
	exports: [AttendancesService, AttendancesCoreService],
})
export class AttendancesModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(CohortMiddleware)
			.exclude('/attendances/:id')
			.forRoutes(AttendancesController);
	}
}
