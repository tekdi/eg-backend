import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { BeneficiariesController } from './beneficiaries.controller';

import { HttpModule } from '@nestjs/axios';
import { S3Module } from 'src/services/s3/s3.module';
import { AuthMiddleware } from '../common/middlewares/authmiddleware';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { EnumModule } from '../enum/enum.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { KeycloakModule } from '../services/keycloak/keycloak.module';
import { BeneficiariesService } from './beneficiaries.service';
import { UploadFileModule } from 'src/upload-file/upload-file.module';
import { BeneficiariesCoreService } from './beneficiaries.core.service';

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
	providers: [BeneficiariesService, BeneficiariesCoreService],
	exports: [BeneficiariesService, BeneficiariesCoreService],
})
// export class BeneficiariesModule implements NestModule {
// 	configure(consumer: MiddlewareConsumer) {
// 		consumer.apply(AuthMiddleware).forRoutes('*');
		
// 	
//}
//}
export class BeneficiariesModule{}

