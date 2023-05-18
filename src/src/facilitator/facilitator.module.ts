import { Module } from "@nestjs/common";
import { HttpModule } from '@nestjs/axios';

import { HasuraModule } from '../services/hasura/hasura.module';
import { EnumModule } from '../enum/enum.module'

import { FacilitatorService } from './facilitator.service';
import { FacilitatorController } from './facilitator.controller';

@Module({
    imports: [HttpModule, HasuraModule, EnumModule],
    providers: [FacilitatorService],
    controllers: [FacilitatorController],
    exports: [],
})
export class FacilitatorModule {
}