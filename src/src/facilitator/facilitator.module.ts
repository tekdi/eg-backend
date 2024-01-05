import { HttpModule } from '@nestjs/axios';
import {
	MiddlewareConsumer,
	Module,
	NestModule,
	RequestMethod,
} from '@nestjs/common';

import { UserModule } from 'src/user/user.module';
import { EnumModule } from '../enum/enum.module';
import { AuthModule } from '../modules/auth/auth.module';
import { HasuraModule } from '../services/hasura/hasura.module';
import { S3Module } from '../services/s3/s3.module';

import { UploadFileModule } from 'src/upload-file/upload-file.module';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { FacilitatorController } from './facilitator.controller';
import { FacilitatorCoreService } from './facilitator.core.service';
import { FacilitatorService } from './facilitator.service';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { Method } from 'src/common/method/method';

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
	providers: [FacilitatorService, FacilitatorCoreService, Method],
	controllers: [FacilitatorController],
	//exports: [FacilitatorCoreService,FacilitatorService],
})
export class FacilitatorModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		consumer
			.apply(CohortMiddleware)
			.exclude(
				{
					path: '/facilitators/experience/:id',
					method: RequestMethod.DELETE,
				},
				{ path: '/facilitators/:id', method: RequestMethod.PATCH },
				'/facilitators/program-facilitator/add',
				'/facilitators/admin/search-by-ids',
				{
					path: '/facilitators/update-facilitator-aadhar/:id',
					method: RequestMethod.PATCH,
				},
			)
			.forRoutes(FacilitatorController);
	}
}
