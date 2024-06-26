import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { HasuraModule } from '../hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { Method } from 'src/common/method/method';
import { EnumModule } from 'src/enum/enum.module';
@Module({
	imports: [UserModule, HasuraModuleFromServices, HasuraModule, EnumModule],
	controllers: [SessionsController],
	providers: [SessionsService, Method],
})
export class SessionsModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		consumer
			.apply(CohortMiddleware)
			.exclude('/get-one/:id', '/details/:id', '/list/:id')
			.forRoutes(SessionsController);
	}
}
