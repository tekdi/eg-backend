import {
	Module,
	MiddlewareConsumer,
	NestModule,
	RequestMethod,
} from '@nestjs/common';
import { UserauthController } from './userauth.controller';
import { UserauthService } from './userauth.service';
import { HelperModule } from 'src/helper/helper.module';
import { AadhaarKycModule } from 'src/modules/aadhaar_kyc/aadhaar_kyc.module';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { UserModule } from 'src/user/user.module';
import { AuthService } from 'src/modules/auth/auth.service';
import { Method } from '../common/method/method';
import { AcknowledgementModule } from '../modules/acknowledgement/acknowledgement.module';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { S3Module } from 'src/services/s3/s3.module';
import { UploadFileService } from 'src/upload-file/upload-file.service';

@Module({
	imports: [
		KeycloakModule,
		HasuraModule,
		AadhaarKycModule,
		HelperModule,
		UserModule,
		AcknowledgementModule,
		S3Module,
	],
	controllers: [UserauthController],
	providers: [UserauthService, UploadFileService, AuthService, Method],
	exports: [UserauthService],
})
export class UserauthModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(AuthMiddleware)
			.exclude(
				'/userauth/register/:role',
				'userauth/is-user-exists',
				'/userauth/volunteer/register/:role',
			)
			.forRoutes(UserauthController);
		consumer
			.apply(CohortMiddleware)
			.exclude(
				'/userauth/register/:role',
				'userauth/is-user-exists',
				'/userauth/volunteer/register/:role',
			)
			.forRoutes(UserauthController);
	}
}
