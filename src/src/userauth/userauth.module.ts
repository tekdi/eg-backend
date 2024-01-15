import { Module } from '@nestjs/common';
import { UserauthController } from './userauth.controller';
import { UserauthService } from './userauth.service';
import { HelperModule } from 'src/helper/helper.module';
import { AadhaarKycModule } from 'src/modules/aadhaar_kyc/aadhaar_kyc.module';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { UserModule } from 'src/user/user.module';
import { AuthService } from 'src/modules/auth/auth.service';

@Module({
	imports: [
		KeycloakModule,
		HasuraModule,
		AadhaarKycModule,
		HelperModule,
		UserModule,
	],
	controllers: [UserauthController],
	providers: [UserauthService, AuthService],
	exports: [UserauthService],
})
export class UserauthModule {}
