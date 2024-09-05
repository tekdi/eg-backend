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
import { BeneficiariesModule } from 'src/beneficiaries/beneficiaries.module';
import { UploadFileModule } from 'src/upload-file/upload-file.module';
import { EnumModule } from '../enum/enum.module';
import { BoardModule } from 'src/modules/board/board.module';
@Module({
	imports: [
		KeycloakModule,
		HasuraModule,
		AadhaarKycModule,
		HelperModule,
		UserModule,
		AcknowledgementModule,
		BeneficiariesModule,
		S3Module,
		UploadFileModule,
		EnumModule,
		BoardModule,
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
				'/program-coordinator/learners/facilitator/list',
				'/program-coordinator/learners/list',
				'/program-coordinator/facilitators/cohort',
				'/program-coordinator/beneficiaries/:id',
				'/program-coordinator/camps/list',
				'/program-coordinator/camps/:id',
				'/program-coordinator/info/:id',
				'/program-coordinator/profile',
				'/program-coordinator/profile/:id',
				'/program-coordinator/board/:id',
				'/program-coordinator/subject/list/:id',
				'/program-coordinator/get/academic-year-details',
			)
			.forRoutes(ProgramCoordinatorController);
	}
}
