import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { HasuraModule } from '../services/hasura/hasura.module';
import { EnumModule } from '../enum/enum.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from '../modules/auth/auth.module';
import { S3Module } from '../services/s3/s3.module';

import { FacilitatorService } from './facilitator.service';
import { FacilitatorController } from './facilitator.controller';
import { AuthMiddleware } from '../common/middlewares/authmiddleware';
import { UploadFileModule } from 'src/upload-file/upload-file.module';
import { FacilitatorCoreService } from './facilitator.core.service';
import { Method } from '../common/method/method';

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
	}
}
