// camp.controller.ts

import { Controller, Get, Param,Post,UsePipes,ValidationPipe,Body,Req,UseGuards,Res } from '@nestjs/common';
import { CampService } from './camp.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('camp')
export class CampController {
    constructor(
		private campService: CampService
		
	) {}
 
  @Post('/register')
	@UsePipes(ValidationPipe)
    @UseGuards(new AuthGuard())
	 registerCamp(
		@Body() body:any,
		@Req() request: any,
        @Res() response: Response,
	) {
		return this.campService.registerCamp(body, request,response);
	}
}
