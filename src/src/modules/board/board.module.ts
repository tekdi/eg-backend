import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BoardService } from './board.service';
import { HasuraModule } from '../../services/hasura/hasura.module';
import { BoardController } from './board.controller';
import { AuthMiddleware } from '../../common/middlewares/auth.middleware';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { UserModule } from 'src/user/user.module';
import { Method } from 'src/common/method/method';

@Module({
	imports: [HasuraModule, UserModule],
	providers: [BoardService, Method],
	exports: [BoardService],
	controllers: [BoardController],
})
export class BoardModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		consumer.apply(CohortMiddleware).forRoutes('*');
	}
}
