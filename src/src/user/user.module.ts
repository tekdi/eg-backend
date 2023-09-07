// import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthMiddleware } from '../common/middlewares/authmiddleware';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
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
	}
}
