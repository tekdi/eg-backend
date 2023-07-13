import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EnumService } from './enum.service';
import { EnumController } from './enum.controller';
import { AuthMiddleware } from 'src/common/middlewares/authmiddleware';
import { UserModule } from 'src/user/user.module';

@Module({
	imports: [UserModule],
	controllers: [EnumController],
	providers: [EnumService],
	exports: [EnumService],
})
export class EnumModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes(EnumController);
	}
}
