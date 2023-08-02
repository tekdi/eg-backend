import {
	MiddlewareConsumer,
	Module,
	NestModule,
	RequestMethod,
} from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { BeneficiariesController } from './beneficiaries.controller';

import { HttpModule } from '@nestjs/axios';
import { S3Module } from 'src/services/s3/s3.module';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { EnumModule } from '../enum/enum.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { KeycloakModule } from '../services/keycloak/keycloak.module';
import { BeneficiariesService } from './beneficiaries.service';
import { AuthMiddleware } from '../common/middlewares/authmiddleware';
import { CheckValidBeneficiaryIdMiddleware } from './middlewares/checkValidBeneficiaryId';

@Module({
	imports: [
		UserModule,
		HttpModule,
		HasuraModule,
		HelperModule,
		KeycloakModule,
		HasuraModuleFromServices,
		S3Module,
		EnumModule,
	],
	controllers: [BeneficiariesController],
	providers: [BeneficiariesService],
})
export class BeneficiariesModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		consumer
			.apply(AuthMiddleware, CheckValidBeneficiaryIdMiddleware)
			.forRoutes({
				method: RequestMethod.GET,
				path: '/beneficiaries/:id',
			});
		consumer
			.apply(AuthMiddleware, CheckValidBeneficiaryIdMiddleware)
			.forRoutes({
				method: RequestMethod.PATCH,
				path: '/beneficiaries/:id',
			});
	}
}
