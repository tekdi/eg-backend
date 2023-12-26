import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { UserModule } from 'src/user/user.module';
import { EnumModule } from '../enum/enum.module';
import { AuthModule } from '../modules/auth/auth.module';
import { HasuraModule } from '../services/hasura/hasura.module';
import { S3Module } from '../services/s3/s3.module';

import { UploadFileModule } from 'src/upload-file/upload-file.module';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { CohortMiddleware } from '../common/middlewares/cohort.middleware';
import { FacilitatorController } from './facilitator.controller';
import { FacilitatorCoreService } from './facilitator.core.service';
import { FacilitatorService } from './facilitator.service';
import { ProgramIdMiddleware } from 'src/common/middlewares/programId.middleware';

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
	providers: [FacilitatorService, FacilitatorCoreService],
	controllers: [FacilitatorController],
	//exports: [FacilitatorCoreService,FacilitatorService],
})

export class FacilitatorModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');

		consumer
        .apply(CohortMiddleware)
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
			'/facilitators/admin/prerak-learner-list/:id'
        )
        .forRoutes(FacilitatorController);
		consumer
        .apply(ProgramIdMiddleware)
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
			'/facilitators/admin/prerak-learner-list/:id'
        )
        .forRoutes(FacilitatorController);
	}
}
