import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { HasuraModule } from '../hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { ProgramIdMiddleware } from 'src/common/middlewares/programId.middleware';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule],
	controllers: [CommentsController],
	providers: [CommentsService],
})

export class CommentsModule {}