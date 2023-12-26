import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { BeneficiariesModule } from 'src/beneficiaries/beneficiaries.module';
import { ProgramIdMiddleware } from 'src/common/middlewares/programId.middleware';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';

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

	providers: [CampService, CampCoreService],
	controllers: [CampController],
})
export class CampModule implements NestModule{
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(ProgramIdMiddleware)
		.exclude(
			'/camp/attendance/add',
			'/camp/attendance/update/:id',
			'/camp/attendance/update/:id',
			'/camp/attendance/list',
			'/camp/attendance/:id',
			'/camp/getStatusWiseCount',
			'/camp/admin/facilitators',
			'/camp/admin/facilitator-reassign/:id',
			'/camp/add/campdayactivity',
			'/camp/camp-day-activity/:id',
			'/camp/camp-day-activity/:id',
			'/camp/:id/get-camp-sessions',
			'/camp/incomplete/camp-day-activity/:id',
			'/camp/random-attendance/:id',
			'/camp/:id'
			).forRoutes(CampController);
		consumer.apply(CohortMiddleware)
		.exclude(
			'/camp/attendance/add',
			'/camp/attendance/update/:id',
			'/camp/attendance/update/:id',
			'/camp/attendance/list',
			'/camp/attendance/:id',
			'/camp/getStatusWiseCount',
			'/camp/admin/facilitators',
			'/camp/admin/facilitator-reassign/:id',
			'/camp/add/campdayactivity',
			'/camp/camp-day-activity/:id',
			'/camp/camp-day-activity/:id',
			'/camp/:id/get-camp-sessions',
			'/camp/incomplete/camp-day-activity/:id',
			'/camp/random-attendance/:id',
			'/camp/:id'
		).forRoutes(CampController);
	}
}
