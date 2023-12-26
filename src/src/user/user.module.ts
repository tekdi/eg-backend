import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
<<<<<<< HEAD
=======
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
>>>>>>> upstream/release-1.7.0
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
	imports: [
		HelperModule,
		HasuraModule,
		HasuraModuleFromServices,
		KeycloakModule,
	],
	providers: [AuthMiddleware, UserService],
	controllers: [UserController],
	exports: [UserService],
})

export class UserModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');

		consumer
			.apply(CohortMiddleware)
			.exclude(
				'/users/qualification',
				'/users/create',
				'/users/update/:id',
				'/users/list',
				'/users/info/:id',
				'/users/is_user_exist',
				'/users/login',
				'/users/ip_user_info',
				'/users/organization/:id',
				'/users/register',
				'/users/aadhaarDetails/:userId',
				'/users/audit/:context/:context_id',
				'/users/cohorts/my',
			)
			.forRoutes(UserController);
	}
}
