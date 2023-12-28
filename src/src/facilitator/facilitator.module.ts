import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { UserModule } from 'src/user/user.module';
import { EnumModule } from '../enum/enum.module';
import { AuthModule } from '../modules/auth/auth.module';
import { HasuraModule } from '../services/hasura/hasura.module';
import { S3Module } from '../services/s3/s3.module';

import { UploadFileModule } from 'src/upload-file/upload-file.module';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { AcademicYearIdMIddleware } from 'src/common/middlewares/academic_year_id.middleware'; 
import { FacilitatorController } from './facilitator.controller';
import { FacilitatorCoreService } from './facilitator.core.service';
import { FacilitatorService } from './facilitator.service';
import { Method } from 'src/common/method/method';
import { ProgramMiddleware } from 'src/common/middlewares/program.middleware';

@Module({
	imports: [
		UserModule,
		HttpModule,
		HasuraModule,
		EnumModule,
		AuthModule,
		S3Module,
		UploadFileModule,
	],
	providers: [FacilitatorService, FacilitatorCoreService,Method],
	controllers: [FacilitatorController],
	//exports: [FacilitatorCoreService,FacilitatorService],
})
export class FacilitatorModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		
		consumer
			.apply(AcademicYearIdMIddleware)
			.exclude(
				'/facilitators/getStatuswiseCount',
				'/facilitators/forOrientation',
				'/facilitators/experience/:id',
				'/facilitators/:id',
				'/facilitators/admin/okyc_details_override',
				'/facilitators/admin/search-by-ids',
				'/facilitators/admin/filter-by-beneficiaries',
				'/facilitators/exportCsv',
				'/facilitators/update-facilitator-aadhar/:id',
				'/facilitators/admin/learner-status-distribution',
				'/facilitators/admin/prerak-learner-list/:id',
			)
			.forRoutes(FacilitatorController);
			consumer
			.apply(ProgramMiddleware)
			.exclude(
				'/facilitators/getStatuswiseCount',
				'/facilitators/forOrientation',
				'/facilitators/experience/:id',
				'/facilitators/:id',
				'/facilitators/admin/okyc_details_override',
				'/facilitators/admin/search-by-ids',
				'/facilitators/admin/filter-by-beneficiaries',
				'/facilitators/exportCsv',
				'/facilitators/update-facilitator-aadhar/:id',
				'/facilitators/admin/learner-status-distribution',
				'/facilitators/admin/prerak-learner-list/:id',
				'/facilitators/'
			)
			.forRoutes(FacilitatorController);
	}
}

