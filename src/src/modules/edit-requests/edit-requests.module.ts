import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { HasuraModule } from '../../hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../../services/hasura/hasura.module';
import { EditRequestController } from './edit-requests.controller';
import { EditRequestCoreService } from './edit-requests.core.service';
import { EditRequestService } from './edit-requests.service';

@Module({
	imports: [HasuraModuleFromServices, HasuraModule, UserModule],
	providers: [EditRequestService, EditRequestCoreService],
	controllers: [EditRequestController],
})
export class EditRequestModule {}
