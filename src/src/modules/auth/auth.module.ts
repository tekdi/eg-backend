import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthMiddleware } from 'src/common/middlewares/auth.middleware';
import { HelperModule } from 'src/helper/helper.module';
import { AadhaarKycModule } from 'src/modules/aadhaar_kyc/aadhaar_kyc.module';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { UserModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Method } from 'src/common/method/method';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { EnumModule } from "src/enum/enum.module"

@Module({
	imports: [
		KeycloakModule,
		HasuraModule,
		AadhaarKycModule,
		HelperModule,
		UserModule,
		EnumModule
	],
	controllers: [AuthController],
	providers: [AuthService, Method],
	exports: [AuthService],
})
export class AuthModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		consumer
			.apply(CohortMiddleware)
			.forRoutes('/auth/reset-password-admin');
	}
}
