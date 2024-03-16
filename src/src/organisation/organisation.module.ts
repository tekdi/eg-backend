import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { OrganisationService } from './organisation.service';
import { OrganisationController } from './organisation.controller';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { HasuraModule } from '../hasura/hasura.module';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { Method } from 'src/common/method/method';

@Module({
	imports: [HasuraModuleFromServices, HasuraModule],
	controllers: [OrganisationController],
	providers: [OrganisationService, Method],
	exports: [OrganisationService],
})
export class OrganisationModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(CohortMiddleware)
			.exclude()
			.forRoutes(OrganisationController);
	}
}
