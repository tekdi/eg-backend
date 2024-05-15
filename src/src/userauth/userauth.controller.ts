import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
	UsePipes,
	ValidationPipe,
	Response,
	Request,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';

import { AuthGuard } from 'src/modules/auth/auth.guard';
import { UserauthService } from './userauth.service';
import { FileInterceptor } from '@nestjs/platform-express/multer';

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

	@Post('/is-user-exists')
	@UsePipes(ValidationPipe)
	public async isUserExists(@Body() body: Body, @Res() response: Response) {
		return this.userauthService.isUserExists(body, response);
	}

	@Get('/facilitator/user-info')
	@UsePipes(ValidationPipe)
	public async getUserInfoDetails(
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.userauthService.getUserInfoDetails(request, response);
	}

	// @Post('/onboarding')
	// @UsePipes(ValidationPipe)
	// @UseGuards(new AuthGuard())
	// public async userOnboarding(
	// 	@Body() body: Body,
	// 	@Res() response: Response,
	// 	@Req() request: Request,
	// ) {
	// 	return this.userauthService.userOnboarding(body, response, request);
	// }

	@Post('/onboarding')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	@UseInterceptors(FileInterceptor('jsonpayload')) //  'jsonpayload' is the name of the field for the uploaded file
	public async userOnboarding(
		@UploadedFile() file: Express.Multer.File,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.userauthService.userOnboarding(file, response, request);
	}

	@Get('/beneficiary/user-info/:id')
	@UsePipes(ValidationPipe)
	public async getUserInfoDetailsForBeneficiary(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.userauthService.getUserInfoDetailsForBeneficiary(
			request,
			response,
			id,
		);
	}

	@Post('/volunteer/register/:role')
	@UsePipes(ValidationPipe)
	public async volunteerRegister(
		@Body() body: Body,
		@Res() response: Response,
		@Param('role') role: string,
	) {
		return this.userauthService.volunteerRegister(body, response, role);
	}
}
