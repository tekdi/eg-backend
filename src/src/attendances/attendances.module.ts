import { Module } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesCoreService } from './attendances.core.service';
import { AttendancesController } from './attendances.controller';
import { HasuraModule } from 'src/hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';

@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule],
	controllers: [AttendancesController],
	providers: [AttendancesService, AttendancesCoreService],
	exports: [AttendancesService],
})
export class AttendancesModule {}
