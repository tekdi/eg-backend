import { Module } from '@nestjs/common';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from './geolocation.service';
import { HasuraModule as HasuraModuleFromServices } from '../../services/hasura/hasura.module';

@Module({
	imports: [HasuraModuleFromServices],
	controllers: [GeolocationController],
	providers: [GeolocationService],
})
export class GeolocationModule {}
