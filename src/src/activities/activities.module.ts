import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Method } from 'src/common/method/method';
import { EnumModule } from 'src/enum/enum.module';
import { EnumService } from 'src/enum/enum.service';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesCoreService } from './activities.core.service';
import { ActivitiesService } from './activities.service';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
@Module({
	imports: [HasuraModule, HasuraModuleFromServices, EnumModule],
	controllers: [ActivitiesController],
	providers: [ActivitiesService, ActivitiesCoreService, EnumService, Method],
	exports: [ActivitiesModule, ActivitiesCoreService],
})
export class ActivitiesModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(CohortMiddleware).forRoutes(ActivitiesController);
	}
}
