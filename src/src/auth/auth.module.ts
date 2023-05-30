import { Module } from '@nestjs/common';
import { AadhaarKycModule } from 'src/aadhaar_kyc/aadhaar_kyc.module';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
@Module({
  imports: [
    KeycloakModule, HasuraModule,AadhaarKycModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
