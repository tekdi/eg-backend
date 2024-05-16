import { Module } from '@nestjs/common';
import { OnestusertrackService } from './onestusertrack.service';
import { OnestusertrackController } from './onestusertrack.controller';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { HasuraModule } from '../hasura/hasura.module';

@Module({
	imports: [HasuraModuleFromServices, HasuraModule],
	controllers: [OnestusertrackController],
	providers: [OnestusertrackService],
})
export class OnestusertrackModule {}
