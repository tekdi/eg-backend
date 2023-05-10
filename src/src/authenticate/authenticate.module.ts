import { Module } from '@nestjs/common';
import { AuthenticateService } from './authenticate.service';
import { AuthenticateController } from './authenticate.controller';

@Module({
  providers: [AuthenticateService],
  controllers: [AuthenticateController]
})
export class AuthenticateModule {}
