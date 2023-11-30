import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { LMSController } from './lms.controller';
import { LMSService } from './lms.service';

@Module({
	imports: [UserModule, HasuraModule],
	controllers: [LMSController],
	providers: [LMSService],
})
export class LMSModule {}
