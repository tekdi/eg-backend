import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Method } from 'src/common/method/method';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { UserModule } from 'src/user/user.module';
import { HasuraModule } from '../../hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../../services/hasura/hasura.module';
import { EditRequestController } from './edit-requests.controller';
import { EditRequestCoreService } from './edit-requests.core.service';
import { EditRequestService } from './edit-requests.service';
import { AclHelper } from 'src/common/helpers/acl.helper';

@Module({
	imports: [HasuraModuleFromServices, HasuraModule, UserModule],
	providers: [EditRequestService, EditRequestCoreService, Method, AclHelper],
	controllers: [EditRequestController],
})
export class EditRequestModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(CohortMiddleware)
			.exclude('/edit-request/admin/update-edit-requests/:id')
			.forRoutes(EditRequestController);
	}
}
