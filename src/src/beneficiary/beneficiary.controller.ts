import { Body, Controller, Param, Post, Put, UsePipes, ValidationPipe } from '@nestjs/common';

import { BeneficiaryService } from './beneficiary.service';
import { RegisterFacilitatorDto } from '../helper/dto/register-beneficiary.dto';

@Controller('/beneficiary')
export class BeneficiaryController {
    public url = process.env.HASURA_BASE_URL;
    constructor(
      public beneficiaryService: BeneficiaryService,
    ) {}

    @Post('/register')
    @UsePipes(ValidationPipe)
    private async registerBeneficiary (
        @Body() body: RegisterFacilitatorDto
    ) {
        return this.beneficiaryService.registerBeneficiary(body);
    }

    @Put('/update/:id')
    public async updateBeneficiary(
      @Param('id') id: string,
      @Body() req: Record<string, any>,
    ) {
        return this.beneficiaryService.create({ ...req, id: id }, true);
    }
}
