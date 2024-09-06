import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { HasuraModule } from 'src/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { ObservationsService } from './observations.service';
import { ObservationsController } from './observations.controller';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { Method } from '../common/method/method';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule, AuthModule],
	providers: [ObservationsService, Method],
	controllers: [ObservationsController],
})
export class ObservationsModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(CohortMiddleware)
			.forRoutes('observations/exam/result/subjects/:id');
	}
}
