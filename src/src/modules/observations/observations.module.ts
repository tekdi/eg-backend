import { Module } from '@nestjs/common';
import { ObservationsService } from './observations.service';
import { ObservationsController } from './observations.controller';

@Module({
  providers: [ObservationsService],
  controllers: [ObservationsController]
})
export class ObservationsModule {}
