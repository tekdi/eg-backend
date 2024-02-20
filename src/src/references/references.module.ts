import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { ReferencesController } from './references.controller';
import { ReferencesService } from './references.service';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices],
	controllers: [ReferencesController],
	providers: [ReferencesService],
})
export class ReferencesModule {}
