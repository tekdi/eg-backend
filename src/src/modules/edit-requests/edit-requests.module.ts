import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HasuraModule as HasuraModuleFromServices } from '../../services/hasura/hasura.module';
import { HasuraModule } from '../../hasura/hasura.module';
import { EditRequestService } from './edit-requests.service';
import { EditRequestController } from './edit-requests.controller';
import { EditRequestCoreService } from './edit-requests.core.service';


@Module({
	imports: [
        HasuraModuleFromServices,
        HasuraModule
    ],
providers: [EditRequestService, EditRequestCoreService],
	controllers: [EditRequestController],
})
export class EditRequestModule {

}