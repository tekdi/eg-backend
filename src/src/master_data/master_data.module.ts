import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { MasterDataController } from './master_data.controller';
import { MasterDataService } from './master_data.service';
import { MasterDataCoreService } from './master_data_core.service';
@Module({
	imports: [HasuraModule],
	providers: [MasterDataService, MasterDataCoreService],
	controllers: [MasterDataController],
})
export class MasterDataModule {}
