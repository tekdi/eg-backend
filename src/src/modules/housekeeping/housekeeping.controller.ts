import { HouseKeepingService } from './housekeeping.service';
//import { Body, Controller, Post, UseGuards } from '@nestjs/common';
//import { AuthGuard } from '../auth/auth.guard';

//@Controller('hk')
export class HouseKeepingController {
	constructor(private houseKeepingService: HouseKeepingService) {}
	/*
	@Post('/download-files')
	//@UseGuards(new AuthGuard())
	public async downloadFiles(@Body() body) {
		await this.houseKeepingService.downloadFiles(body);
	}
	*/
}
