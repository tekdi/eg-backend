import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/hasura/hasura.module';
import { KitMaterialsCoreService } from '../kit-materials/kit-materials.core.service';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { KitMaterialsController } from './kit-materials.controller';
import { KitMaterialsService } from './kit-materials.service';
import { AclHelper } from 'src/common/helpers/acl.helper';
import { UserModule } from 'src/user/user.module';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule],
	controllers: [KitMaterialsController],
	providers: [KitMaterialsService, KitMaterialsCoreService, AclHelper],
	exports: [KitMaterialsCoreService],
})
export class KitMaterialsModule {}
