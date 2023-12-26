import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthMiddleware } from 'src/common/middlewares/auth.middleware';
import { HelperModule } from 'src/helper/helper.module';
import { AadhaarKycModule } from 'src/modules/aadhaar_kyc/aadhaar_kyc.module';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { UserModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
	imports: [
		KeycloakModule,
		HasuraModule,
		AadhaarKycModule,
		HelperModule,
		UserModule,
	],
	controllers: [AuthController],
	providers: [AuthService],
	exports: [AuthService],
})
export class AuthModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
	}
}
