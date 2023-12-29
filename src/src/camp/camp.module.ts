import { HttpModule } from '@nestjs/axios';
import {
	MiddlewareConsumer,
	Module,
	NestModule,
	RequestMethod,
} from '@nestjs/common';
import { BeneficiariesModule } from 'src/beneficiaries/beneficiaries.module';
import { Method } from 'src/common/method/method';
import { AcademicYearIdMiddleware } from 'src/common/middlewares/academic_year_id.middleware';
import { ProgramMiddleware } from 'src/common/middlewares/program.middleware';
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

	providers: [CampService, CampCoreService, Method],
	controllers: [CampController],
})
export class CampModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(AcademicYearIdMiddleware)
			.exclude(
				'/camp/attendance/add',
				'/camp/attendance/update/:id',
				'/camp/attendances/list',
				'/camp/attendance/:id',
				'/camp/getStatusWiseCount',
				'/camp/admin/facilitators',
				'/camp/admin/facilitator-reassign/:id',
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
				'/camp/admin/:id',
				//'camp/admin/camp-list'
			)
			.forRoutes(CampController);
		consumer
			.apply(ProgramMiddleware)
			.exclude(
				'/camp/attendance/add',
				'/camp/attendance/update/:id',
				'/camp/attendances/list',
				'/camp/attendance/:id',
				'/camp/getStatusWiseCount',
				'/camp/admin/facilitators',
				'/camp/admin/facilitator-reassign/:id',
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
				'/camp/admin/:id',
				{
					path: '/camp/:id',
					method: RequestMethod.POST,
				},
				'camp/admin/camp-list',
			)
			.forRoutes(CampController);
	}
}
