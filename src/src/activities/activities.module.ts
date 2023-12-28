import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Method } from 'src/common/method/method';
import { AcademicYearIdMiddleware } from 'src/common/middlewares/academic_year_id.middleware';
import { ProgramMiddleware } from 'src/common/middlewares/program.middleware';
import { EnumModule } from 'src/enum/enum.module';
import { EnumService } from 'src/enum/enum.service';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesCoreService } from './activities.core.service';
import { ActivitiesService } from './activities.service';
@Module({
	imports: [HasuraModule, HasuraModuleFromServices, EnumModule],
	controllers: [ActivitiesController],
	providers: [ActivitiesService, ActivitiesCoreService, EnumService,Method],
	exports: [ActivitiesModule, ActivitiesCoreService],
})
export class ActivitiesModule 
implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AcademicYearIdMiddleware).forRoutes(ActivitiesController);
		consumer.apply(ProgramMiddleware).forRoutes(ActivitiesController);
	}
}

