import { Module } from '@nestjs/common';
import { UserModule } from 'src/user.module';
import { BeneficiariesController } from './beneficiaries.controller';

import { HasuraModule } from 'src/hasura/hasura.module';
import { BeneficiariesService } from './beneficiaries.service';
@Module({
  imports:[UserModule,HasuraModule],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService]
})
export class BeneficiariesModule {}
