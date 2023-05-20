import { Module } from "@nestjs/common";
import { HttpModule } from '@nestjs/axios';

import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';

import { BeneficiaryService } from './beneficiary.service';
import { BeneficiaryController } from './beneficiary.controller';

@Module({
    imports: [HttpModule, HasuraModule, HelperModule],
    providers: [BeneficiaryService],
    controllers: [BeneficiaryController],
    exports: [],
})
export class BeneficiaryModule {
}