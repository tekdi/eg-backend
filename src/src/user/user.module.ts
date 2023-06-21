// import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
@Module({
  imports:[HelperModule,HasuraModule,HasuraModuleFromServices],
  providers: [UserService],
  controllers: [UserController],
  exports:[UserService]
})
export class UserModule {}
