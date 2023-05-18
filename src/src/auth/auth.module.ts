import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { KeycloakService } from 'src/services/keycloak/keycloak.service';

@Module({
  providers: [AuthService, KeycloakService],
  controllers: [AuthController],
  imports: [KeycloakModule]
})
export class AuthModule {}
