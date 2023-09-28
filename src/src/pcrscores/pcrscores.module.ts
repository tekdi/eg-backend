import { Module } from '@nestjs/common';
import { PcrscoresService } from './pcrscores.service';
import { PcrscoresController } from './pcrscores.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices],
	controllers: [PcrscoresController],
	providers: [PcrscoresService],
})
export class PcrscoresModule {}
