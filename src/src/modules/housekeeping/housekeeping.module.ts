import { Module } from '@nestjs/common';
import { HouseKeepingService } from './housekeeping.service';
import { HouseKeepingController } from './housekeeping.controller';

@Module({
	providers: [HouseKeepingService],
	controllers: [HouseKeepingController],
})
export class HouseKeepingModule {}
