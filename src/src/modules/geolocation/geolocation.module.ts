import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from './geolocation.service';
import { UserModule } from 'src/user/user.module';
import { AuthMiddleware } from 'src/common/middlewares/authmiddleware';

@Module({
	imports: [HasuraModule, UserModule],
	controllers: [GeolocationController],
	providers: [GeolocationService],
})
export class GeolocationModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes(GeolocationController);
	}
}
