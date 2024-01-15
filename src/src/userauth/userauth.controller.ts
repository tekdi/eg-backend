import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Req,
	Res,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { UserauthService } from './userauth.service';

@Controller('userauth')
export class UserauthController {
	constructor(public userauthService: UserauthService) {}

	@Post('/register/:role')
	@UsePipes(ValidationPipe)
	public async register(
		@Body() body: Body,
		@Res() response: Response,
		@Param('role') role: string,
	) {
		return this.userauthService.userAuthRegister(body, response, role);
	}
}
