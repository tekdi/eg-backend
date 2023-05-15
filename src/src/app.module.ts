import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EnumModule } from './enum/enum.module';
import { EventsModule } from './events/events.module';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from './geolocation.service';
import { HasuraModule } from './hasura/hasura.module';
import { HelperModule } from './helper/helper.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UsersModule } from './users/users.module';

@Module({
    imports: [
        HttpModule,
        HelperModule,
        ConfigModule.forRoot(),
        EnumModule,
        AuthModule,
        UsersModule,
        EventsModule,
        HasuraModule,
    ],
    controllers: [AppController, UserController, GeolocationController],
    providers: [AppService, GeolocationService, UserService],
})
export class AppModule { }
