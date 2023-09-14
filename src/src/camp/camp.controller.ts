// camp.controller.ts

import { Controller,Post,UsePipes,ValidationPipe,Body,Req,UseGuards,Res, Param } from '@nestjs/common';
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

	@Post('/camp-list')
	@UseGuards(new AuthGuard())
	campList(@Req() request: any,
	@Body() body: any,
	@Res() response: any,) {
		return this.campService.campList(body, request,response);
	}

	@Post('/camp-details/:id')
	@UseGuards(new AuthGuard())
	campById(@Req() request: any,
	@Body() body: any,
	@Param('id') id: number,
	@Res() response: any,) {
		return this.campService.campById(id,body, request,response);
	}

}
