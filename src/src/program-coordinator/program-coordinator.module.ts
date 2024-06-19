import {
	Module,
	MiddlewareConsumer,
	NestModule,
	RequestMethod,
} from '@nestjs/common';

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
import { ProgramCoordinatorController } from './program-coordinator.controller';
import { ProgramCoordinatorService } from './program-coordinator.service';

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
	controllers: [ProgramCoordinatorController],
	providers: [ProgramCoordinatorService, Method, AuthService],
})
export class ProgramCoordinatorModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes(ProgramCoordinatorController);
		consumer
			.apply(CohortMiddleware)
			.exclude(
				'/program-coordinator/activities/create',
				'/program-coordinator/activities/:id',
				'/program-coordinator/activities/list',
			)
			.forRoutes(ProgramCoordinatorController);
	}
}
