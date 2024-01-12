import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { ReferencesController } from './references.controller';
import { ReferencesService } from './references.service';
import { UserModule } from 'src/user/user.module';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { Method } from '../common/method/method';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule],
	controllers: [ReferencesController],
	providers: [ReferencesService, Method], // Ensure CohortMiddleware and Method are declared here if needed.
})
export class ReferencesModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		consumer.apply(CohortMiddleware).forRoutes(ReferencesController);
	}
}
