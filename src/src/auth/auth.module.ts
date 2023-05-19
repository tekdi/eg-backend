import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { KeycloakService } from 'src/services/keycloak/keycloak.service';
import { HasuraModule } from 'src/services/hasura/hasura.module';

@Module({
  imports: [KeycloakModule, HasuraModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
