import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { LMSController } from './lms.controller';
import { LMSService } from './lms.service';
import { AttendancesModule } from 'src/attendances/attendances.module';

@Module({
	imports: [
		UserModule,
		HasuraModule,
		HasuraModuleFromServices,
		AttendancesModule,
	],
	controllers: [LMSController],
	providers: [LMSService],
})
export class LMSModule {}
