import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { PcrscoresController } from './pcrscores.controller';
import { PcrscoresService } from './pcrscores.service';
import { AclHelper } from 'src/common/helpers/acl.helper';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule],
	controllers: [PcrscoresController],
	providers: [PcrscoresService, AclHelper],
})
export class PcrscoresModule {}
