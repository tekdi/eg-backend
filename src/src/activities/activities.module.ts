import {  MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EnumModule } from 'src/enum/enum.module';
import { EnumService } from 'src/enum/enum.service';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesCoreService } from './activities.core.service';
import { ActivitiesService } from './activities.service';
import { ProgramMiddleware } from 'src/common/middlewares/program.middleware';
import { Method } from 'src/common/method/method';
import { AcademicYearIdMIddleware } from 'src/common/middlewares/academic_year_id.middleware';
@Module({
	imports: [HasuraModule, HasuraModuleFromServices, EnumModule],
	controllers: [ActivitiesController],
	providers: [ActivitiesService, ActivitiesCoreService, EnumService,Method],
	exports: [ActivitiesModule, ActivitiesCoreService],
})
export class ActivitiesModule 
implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AcademicYearIdMIddleware).forRoutes(ActivitiesController);
		consumer.apply(ProgramMiddleware).forRoutes(ActivitiesController);
	}
}

