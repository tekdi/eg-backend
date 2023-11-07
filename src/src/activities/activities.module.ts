import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivitiesCoreService } from './activities.core.service';
import { EnumService } from 'src/enum/enum.service';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { EnumModule } from 'src/enum/enum.module';
import { HasuraModule } from 'src/hasura/hasura.module';

@Module({

		imports: [
			HasuraModule,
			HasuraModuleFromServices,
			EnumModule,
		],
	controllers: [ActivitiesController],
	providers: [ActivitiesService, ActivitiesCoreService,EnumService,],
	exports: [ActivitiesModule,ActivitiesCoreService],
})
export class ActivitiesModule {}
