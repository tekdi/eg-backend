import { HouseKeepingService } from './housekeeping.service';

//@Controller('hk')
export class HouseKeepingController {
	constructor(private readonly houseKeepingService: HouseKeepingService) {}
	/*
	@Post('/download-files')
	//@UseGuards(new AuthGuard())
	public async downloadFiles(@Body() body) {
		await this.houseKeepingService.downloadFiles(body);
	}
	*/
}
