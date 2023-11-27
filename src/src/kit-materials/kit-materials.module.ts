import { Module } from '@nestjs/common';
import { KitMaterialsService } from './kit-materials.service';
import { KitMaterialsController } from './kit-materials.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { KitMaterialsCoreService } from '../kit-materials/kit-materials.core.service';

@Module({
  imports: [HasuraModule, HasuraModuleFromServices],
  controllers: [KitMaterialsController],
  providers: [KitMaterialsService,KitMaterialsCoreService],
  exports: [KitMaterialsCoreService],
})
export class KitMaterialsModule {}
