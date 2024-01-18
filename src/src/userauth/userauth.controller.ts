import {
	Body,
	Controller,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { UserauthService } from './userauth.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

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

	@Post('/onboarding')
	@UseGuards(new AuthGuard())
	public async userOnboarding(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.userauthService.userOnboarding(body, response, request);
	}
}
