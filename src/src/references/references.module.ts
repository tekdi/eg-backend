import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { ReferencesController } from './references.controller';
import { ReferencesService } from './references.service';
import { AclHelper } from 'src/common/helpers/acl.helper';
import { UserModule } from 'src/user/user.module';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule],
	controllers: [ReferencesController],
	providers: [ReferencesService, AclHelper],
})
export class ReferencesModule {}
