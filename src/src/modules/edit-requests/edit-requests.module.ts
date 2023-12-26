import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HasuraModule as HasuraModuleFromServices } from '../../services/hasura/hasura.module';
import { HasuraModule } from '../../hasura/hasura.module';
import { EditRequestService } from './edit-requests.service';
import { EditRequestController } from './edit-requests.controller';
import { EditRequestCoreService } from './edit-requests.core.service';
import { UserModule } from 'src/user/user.module';
import { ProgramIdMiddleware } from 'src/common/middlewares/programId.middleware';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';

@Module({
	imports: [HasuraModuleFromServices, HasuraModule, UserModule],
	providers: [EditRequestService, EditRequestCoreService],
	controllers: [EditRequestController],
})
export class EditRequestModule implements NestModule{
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(ProgramIdMiddleware)
		.exclude(
			'/edit-request/admin/update-edit-requests/:id'
		).forRoutes(EditRequestController);
		consumer.apply(CohortMiddleware)
		.exclude(
			'/edit-request/admin/update-edit-requests/:id'
		).forRoutes(EditRequestController);
	}
}
