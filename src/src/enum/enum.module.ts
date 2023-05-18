import { Module } from '@nestjs/common';
import { EnumService } from './enum.service';
import { EnumController } from './enum.controller';

@Module({
  controllers: [EnumController],
  providers: [EnumService],
  exports: [EnumService]
})
export class EnumModule {}
