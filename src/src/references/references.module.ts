import { Module } from '@nestjs/common';
import { ReferencesService } from './references.service';
import { ReferencesController } from './references.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices],
	controllers: [ReferencesController],
	providers: [ReferencesService],
})
export class ReferencesModule {}
