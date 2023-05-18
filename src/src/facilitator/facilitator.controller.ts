import { Body, Controller, Get, Post } from '@nestjs/common';

import { FacilitatorService } from './facilitator.service';

@Controller('/facilitators')
export class FacilitatorController {
    public url = process.env.HASURA_BASE_URL;
    constructor(
      public facilitatorService: FacilitatorService,
    ) {}

    @Post('/list')
    async getFacilitators(
      @Body() body: any
    ) {
      return this.facilitatorService.getFacilitators(body);
    }
}
