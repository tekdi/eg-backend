import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from './geolocation.service';
import { UserController } from './user.controller';
import { ConfigModule } from '@nestjs/config';
import { HasuraService } from './helper/hasura.service';
import { UserService } from './user.service';
import { EnumModule } from './enum/enum.module';
import { UserHelper } from './helper/userHelper';
import { AuthenticateModule } from './authenticate/authenticate.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [HttpModule, ConfigModule.forRoot(), EnumModule, AuthenticateModule, UsersModule],
  controllers: [AppController, UserController, GeolocationController],
  providers: [AppService, GeolocationService,HasuraService,UserService,UserHelper],
})
export class AppModule {}
