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

		/*
		consumer
			.apply(CohortMiddleware)
			
			.exclude(
				'/beneficiaries',
				'/beneficiaries/admin/list/duplicates-by-aadhaar',
				'/beneficiaries/admin/list/deactivate-duplicates',
				'/beneficiaries/:id/is_enrollment_exists',
				'/beneficiaries/getStatusWiseCount',
				{ path: '/beneficiaries/:id', method: RequestMethod.GET },
				{ path: '/beneficiaries/:id', method: RequestMethod.DELETE },
				'/beneficiaries/register',
				'/beneficiaries/statusUpdate',
				'/beneficiaries/admin/statusUpdate',
				'/beneficiaries/admin/verify-enrollment',
				{
					path: '/beneficiaries/update-Beneficiaries-aadhar/:id',
					method: RequestMethod.PATCH,
				},
			)
			.forRoutes(
				
				//'/beneficiaries',
				'/beneficiaries/getStatusWiseCount/',
				'/beneficiaries/admin/list/deactivate-duplicates/',
				'/beneficiaries/admin/list/',
				'/beneficiaries/admin/list/duplicates-count-by-aadhaar/',
				'/beneficiaries/update-Beneficiaries-aadhar/:id/',
				{ path: '/beneficiaries/:id/', method: RequestMethod.PATCH },
				'/beneficiaries/admin/statusUpdate/',
				'/beneficiaries/admin/export-csv/',
				'/beneficiaries/admin/export-subjects-csv/',
				'/beneficiaries/admin/reassign/',
				'/beneficiaries/beneficiaries-for-camp/',
				{ path: '/beneficiaries', method: RequestMethod.POST },
				

			);
		*/

		consumer
			.apply(CohortMiddleware)
			.exclude(
				'/beneficiaries/admin/list/duplicates-by-aadhaar',
				'/beneficiaries/:id/is_enrollment_exists',
				{ path: '/beneficiaries/:id', method: RequestMethod.GET },
				{ path: '/beneficiaries/:id', method: RequestMethod.DELETE },
				'/beneficiaries/register',
				'/beneficiaries/statusUpdate',
				'/beneficiaries/admin/verify-enrollment',
			)
			.forRoutes(BeneficiariesController);

		consumer
			.apply(CohortMiddleware)
			.forRoutes(
				{path: '/beneficiaries/getStatusWiseCount', method: RequestMethod.GET,}
			);
	}
}
