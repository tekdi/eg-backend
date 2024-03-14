import { Body } from '@nestjs/common';
import { HouseKeepingService } from './housekeeping.service';

export class HouseKeepingController {
	constructor(private houseKeepingService: HouseKeepingService) {}
	public async downloadFiles(@Body() body) {
		await this.downloadFiles(body);
	}
}
