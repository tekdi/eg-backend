import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { PcrscoresController } from './pcrscores.controller';
import { PcrscoresService } from './pcrscores.service';
import { EnumModule } from 'src/enum/enum.module';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule, EnumModule],
	controllers: [PcrscoresController],
	providers: [PcrscoresService],
})
export class PcrscoresModule {}
