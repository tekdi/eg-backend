import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { AuthMiddleware } from 'src/common/middlewares/authmiddleware';

@Module({
	imports: [HasuraModule, UserModule],
	controllers: [SubjectsController],
	providers: [SubjectsService],
})
export class SubjectsModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes(SubjectsController);
	}
}
