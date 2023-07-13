import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { InterviewController } from './interview.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { AuthMiddleware } from 'src/common/middlewares/authmiddleware';
import { UserModule } from 'src/user/user.module';

@Module({
	imports: [HasuraModule, UserModule],
	controllers: [InterviewController],
	providers: [InterviewService],
})
export class InterviewModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes(InterviewController);
	}
}
