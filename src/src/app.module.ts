import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as redisStore from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';

import { AadhaarKycModule } from 'src/modules/aadhaar_kyc/aadhaar_kyc.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { GeolocationModule } from 'src/modules/geolocation/geolocation.module';
import { TaxonomyModule } from 'src/modules/taxonomy/taxonomy.module';
import { ActivitiesModule } from './activities/activities.module';
import { AttendancesModule } from './attendances/attendances.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { CampModule } from './camp/camp.module';
import { CommentsModule } from './comments/comments.module';
import { AuthMiddleware } from './common/middlewares/auth.middleware';
import { CacheCleanerProvider } from './common/providers/cacheCleaner.provider';
import { CronModule } from './cron/cron.module';
import { EnumModule } from './enum/enum.module';
import { EventsModule } from './events/events.module';
import { FacilitatorModule } from './facilitator/facilitator.module';
import { HasuraModule } from './hasura/hasura.module';
import { HelperModule } from './helper/helper.module';
import { InterviewModule } from './interview/interview.module';
import { KitMaterialsModule } from './kit-materials/kit-materials.module';
import { LMSModule } from './lms/lms.module';
import { MasterDataModule } from './master_data/master_data.module';
import { EditRequestModule } from './modules/edit-requests/edit-requests.module';
import { PcrscoresModule } from './pcrscores/pcrscores.module';
import { ReferencesModule } from './references/references.module';
import { KeycloakModule } from './services/keycloak/keycloak.module';
import { S3Module } from './services/s3/s3.module';
import { SessionsModule } from './sessions/sessions.module';
import { SubjectsModule } from './subjects/subjects.module';
import { UploadFileModule } from './upload-file/upload-file.module';
import { UserModule } from './user/user.module';
import { UserauthModule } from './userauth/userauth.module';
@Module({
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule.forRoot({ isGlobal: true }),
		{
			...HttpModule.register({}),
			global: true,
		},
		CacheModule.register<RedisClientOptions>({
			isGlobal: true,
			store: redisStore,
			host: process.env.CACHE_SERVICE_HOST,
			port: 6379,
			user: 'default',
			password: process.env.CACHE_REDIS_PASSWORD,
			ttl: process.env.CACHE_DEFAULT_TTL,
		}),
		AadhaarKycModule,
		ActivitiesModule,
		AttendancesModule,
		AuthModule,
		BeneficiariesModule,
		CampModule,
		CommentsModule,
		CronModule,
		EditRequestModule,
		EnumModule,
		EventsModule,
		FacilitatorModule,
		GeolocationModule,
		HasuraModule,
		HelperModule,
		InterviewModule,
		KeycloakModule,
		KitMaterialsModule,
		LMSModule,
		MasterDataModule,
		PcrscoresModule,
		ReferencesModule,
		S3Module,
		SessionsModule,
		SubjectsModule,
		TaxonomyModule,
		UploadFileModule,
		UserModule,
		UserauthModule,
	],
	controllers: [],
	providers: [CacheCleanerProvider],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
	}
}
