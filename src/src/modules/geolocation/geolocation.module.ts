import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from './geolocation.service';
import { SentryModule } from '../../services/sentry/sentry.module' ;

@Module({
	imports: [HasuraModule, SentryModule],
	controllers: [GeolocationController],
	providers: [GeolocationService],
})
export class GeolocationModule {}
