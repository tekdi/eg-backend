// import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { ProgramIdMiddleware } from 'src/common/middlewares/programId.middleware';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
@Module({
	imports: [
		HelperModule,
		HasuraModule,
		HasuraModuleFromServices,
		KeycloakModule,
	],
	providers: [UserService, AuthMiddleware],
	controllers: [UserController],
	exports: [UserService],
})
export class UserModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		consumer.apply(ProgramIdMiddleware)
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
			'/users/cohorts/my'
		).forRoutes(UserController);
		consumer.apply(CohortMiddleware)
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
			'/users/cohorts/my'
		).forRoutes(UserController);
	}
}
