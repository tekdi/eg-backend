import { HttpModule } from '@nestjs/axios';
import {
	MiddlewareConsumer,
	Module,
	NestModule,
	RequestMethod,
} from '@nestjs/common';
import { BeneficiariesModule } from 'src/beneficiaries/beneficiaries.module';
import { AclHelper } from 'src/common/helpers/acl.helper';
import { Method } from 'src/common/method/method';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { S3Module } from 'src/services/s3/s3.module';
import { UploadFileModule } from 'src/upload-file/upload-file.module';
import { UserModule } from 'src/user/user.module';
import { AttendancesModule } from '../attendances/attendances.module';
import { EnumModule } from '../enum/enum.module';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { KeycloakModule } from '../services/keycloak/keycloak.module';
import { CampController } from './camp.controller';
import { CampCoreService } from './camp.core.service';
import { CampService } from './camp.service';
import { IpMiddleware } from 'src/common/middlewares/ip.middleware';

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
		BeneficiariesModule,
	],

	providers: [AclHelper, CampService, CampCoreService, Method],
	controllers: [CampController],
})
export class CampModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(IpMiddleware)
			.forRoutes('/camp/admin/camp-details/:id', '/camp/admin/camp-list');
		consumer
			.apply(CohortMiddleware)
			.exclude(
				{
					path: '/camp/admin/:id',
					method: RequestMethod.PATCH,
				},
				'/camp/attendance/add',
				{
					path: '/camp/attendance/update/:id',
					method: RequestMethod.PATCH,
				},
				'/camp/attendances/list',
				{
					path: '/camp/attendance/:id',
					method: RequestMethod.POST,
				},
				'/camp/getStatusWiseCount',
				{
					path: '/camp/admin/facilitator-reassign/:id',
					method: RequestMethod.PATCH,
				},
				'/camp/add/campdayactivity',
				{
					path: '/camp/camp-day-activity/:id',
					method: RequestMethod.PATCH,
				},
				{
					path: '/camp/camp-day-activity/:id',
					method: RequestMethod.POST,
				},
				'/camp/:id/get-camp-sessions',
				'/camp/incomplete/camp-day-activity/:id',
				'/camp/random-attendance/:id',
				'/camp/campday/campdetails',
			)
			.forRoutes(CampController);
	}
}
