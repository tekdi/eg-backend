import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { HasuraModule } from '../hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { AclHelper } from 'src/common/helpers/acl.helper';

@Module({
	imports: [UserModule, HasuraModuleFromServices, HasuraModule],
	controllers: [SessionsController],
	providers: [SessionsService, AclHelper],
})
export class SessionsModule {}
