import { Module } from '@nestjs/common';
import { CampService } from './camp.service';
import { CampController } from './camp.controller';
import { UserModule } from 'src/user/user.module';
import { HttpModule } from '@nestjs/axios';
import { S3Module } from 'src/services/s3/s3.module';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { EnumModule } from '../enum/enum.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { KeycloakModule } from '../services/keycloak/keycloak.module';
import { UploadFileModule } from 'src/upload-file/upload-file.module';
import { AttendancesModule } from '../attendances/attendances.module';
import { CampCoreService } from './camp.core.service';

@Module({
	imports: [
		UserModule,
		HttpModule,
		HasuraModule,
		HelperModule,
		KeycloakModule,
		HasuraModuleFromServices,
		S3Module,
		UploadFileModule,
		EnumModule,
		AttendancesModule,
	],

	providers: [CampService, CampCoreService],
	controllers: [CampController],
})
export class CampModule {}
