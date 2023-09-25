import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
@Module({
	imports: [HasuraModule, HasuraModuleFromServices],
	controllers: [CommunityController],
	providers: [CommunityService],
})
export class CommunityModule {}
