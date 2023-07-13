import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { AuthMiddleware } from 'src/common/middlewares/authmiddleware';

@Module({
	imports: [HasuraModule, UserModule],
	controllers: [AttendancesController],
	providers: [AttendancesService],
})
export class AttendancesModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes(AttendancesController);
	}
}
