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
import { S3Module } from './services/s3/s3.module';
import { UploadFileModule } from './upload-file/upload-file.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UsersModule } from './users/users.module';
import { KeycloakModule } from './services/keycloak/keycloak.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        {
            ...HttpModule.register({}),
            global: true,
        },
        HelperModule,
        EnumModule,
        AuthModule,
        UsersModule,
        EventsModule,
        HasuraModule,
        S3Module,
        UploadFileModule,
        KeycloakModule,
    ],
    controllers: [AppController, UserController, GeolocationController],
    providers: [AppService, GeolocationService, UserService],
})
export class AppModule { }