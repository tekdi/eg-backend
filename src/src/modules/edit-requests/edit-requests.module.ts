import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Method } from 'src/common/method/method';
import { AcademicYearIdMiddleware } from 'src/common/middlewares/academic_year_id.middleware';
import { ProgramMiddleware } from 'src/common/middlewares/program.middleware';
import { UserModule } from 'src/user/user.module';
import { HasuraModule } from '../../hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../../services/hasura/hasura.module';
import { EditRequestController } from './edit-requests.controller';
import { EditRequestCoreService } from './edit-requests.core.service';
import { EditRequestService } from './edit-requests.service';

@Module({
	imports: [HasuraModuleFromServices, HasuraModule, UserModule],
	providers: [EditRequestService, EditRequestCoreService, Method],
	controllers: [EditRequestController],
})
export class EditRequestModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(AcademicYearIdMiddleware)
			.exclude('/edit-request/admin/update-edit-requests/:id')
			.forRoutes(EditRequestController);
			consumer
			.apply(ProgramMiddleware)
			.exclude('/edit-request/admin/update-edit-requests/:id',
			'/edit-request/admin/edit-requests',
			)
			.forRoutes(EditRequestController);
	}
	
}

