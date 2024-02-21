import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { KitMaterialsService } from './kit-materials.service';

@Controller('kitmaterials')
@UseGuards(new AuthGuard())
export class KitMaterialsController {
	constructor(private readonly kitMaterialsService: KitMaterialsService) {}

	@Post('/create')
	@UseGuards(new AuthGuard())
	create(@Req() request: any, @Body() body: any, @Res() response: any) {
		return this.kitMaterialsService.create(body, request, response);
	}

	@Get('/list/:camp_id')
	@UseGuards(new AuthGuard())
	list(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
		@Param('camp_id') camp_id: number,
	) {
		return this.kitMaterialsService.List(body, request, response, camp_id);
	}
}
