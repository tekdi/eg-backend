import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { ObservationsService } from './observations.service';
import { ObservationsController } from './observations.controller';
import { Method } from 'src/common/method/method';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule],
	providers: [ObservationsService, Method],
	controllers: [ObservationsController],
})
export class ObservationsModule {}
