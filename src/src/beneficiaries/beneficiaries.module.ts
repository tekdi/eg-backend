import {
	MiddlewareConsumer,
	Module,
	NestModule,
	RequestMethod,
} from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { BeneficiariesController } from './beneficiaries.controller';

import { HttpModule } from '@nestjs/axios';
import { Method } from 'src/common/method/method';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { S3Module } from 'src/services/s3/s3.module';
import { UploadFileModule } from 'src/upload-file/upload-file.module';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { EnumModule } from '../enum/enum.module';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { KeycloakModule } from '../services/keycloak/keycloak.module';
import { BeneficiariesCoreService } from './beneficiaries.core.service';
import { BeneficiariesService } from './beneficiaries.service';
import { IpMiddleware } from 'src/common/middlewares/ip.middleware';
@Module({
	imports: [
		UserModule,
		HttpModule,
		HasuraModule,
		HelperModule,
		KeycloakModule,
		HasuraModuleFromServices,
		UploadFileModule,
		S3Module,
		EnumModule,
		UploadFileModule,
	],
	controllers: [BeneficiariesController],
	providers: [BeneficiariesService, BeneficiariesCoreService, Method],
	exports: [BeneficiariesService, BeneficiariesCoreService],
})
export class BeneficiariesModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		consumer
			.apply(IpMiddleware)
			.forRoutes('/beneficiaries/admin/list', '/beneficiaries/:id');
		consumer
			.apply(CohortMiddleware)
			.exclude(
				'/beneficiaries/admin/list/duplicates-by-aadhaar',
				'/beneficiaries/:id/is_enrollment_exists',

				{ path: '/beneficiaries/:id', method: RequestMethod.DELETE },
				'/beneficiaries/register',
				'/beneficiaries/statusUpdate',
				'/beneficiaries/admin/verify-enrollment',
			)
			.forRoutes(BeneficiariesController);

		consumer.apply(CohortMiddleware).forRoutes({
			path: '/beneficiaries/getStatusWiseCount',
			method: RequestMethod.GET,
		});
	}
}
