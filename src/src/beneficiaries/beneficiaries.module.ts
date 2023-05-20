import { Module } from '@nestjs/common';
import { UserModule } from 'src/user.module';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesService } from './beneficiaries.service';
import { HttpModule } from '@nestjs/axios';

import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';

@Module({
  imports:[UserModule, HttpModule, HasuraModule, HelperModule],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService]
})
export class BeneficiariesModule {}
