import { HttpService } from '@nestjs/axios';
import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Post,
	Put,
	Query,
	Req,
	Res,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
	Version,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { lastValueFrom, map } from 'rxjs';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { HasuraService } from '../hasura/hasura.service';
import { CreateUserDto } from '../helper/dto/create-user.dto';
import { RegisterFacilitatorDto } from '../helper/dto/register-facilitator.dto';
import { AuthGuard } from '../modules/auth/auth.guard';
import { UserService } from './user.service';
import { LinkValidationDTO } from './dto/link-validation.dto';

@UseInterceptors(SentryInterceptor)
@Controller('/users')
export class UserController {
	public url = process.env.HASURA_BASE_URL;
	constructor(
		private readonly httpService: HttpService,
		public hasuraService: HasuraService,
		public userService: UserService,
	) {}

	@Get('/qualification')
	async getQualifications() {
		const data = await lastValueFrom(
			this.httpService
				.post(
					this.url,
					{
						query: `query MyQuery {
			  qualification_masters {
				id
				name
				type
			  }
			}`,
					},
					{
						headers: {
							'x-hasura-admin-secret':
								process.env.HASURA_ADMIN_SECRET,
							'Content-Type': 'application/json',
						},
					},
				)
				.pipe(map((res) => res.data)),
		);
		return {
			statusCode: 200,
			message: 'Ok.',
			data: this.hasuraService.getResponce(
				data,
				'qualification_masters',
				'data',
			),
		};
	}

	// users/create API
	@Post('/create')
	@HttpCode(200)
	@UsePipes(ValidationPipe)
	public async create(@Body() req: CreateUserDto) {
		return this.userService.create(req);
	}

	@Put('/update/:id')
	@HttpCode(200)
	@UsePipes(ValidationPipe)
	public async update(
		@Param('id') id: number,
		@Body() req: Record<string, any>,
	) {
		return this.userService.create({ ...req, id: id }, true);
	}

	// users/list API filter pagination
	@Post('/list')
	public async searchAttendance(
		@Body() request: Record<string, any>,
		@Req() req: any,
	) {
		return this.userService.list(request, req);
	}

	// users/list by ID API filter pagination
	@Get('/info/:id')
	public async searchById(
		@Param('id') id: number,
		@Res() response: Response,
		@Req() request: any,
	) {
		this.userService
			.userById(id, response, request)
			.then((result) => {
				// Further processing or sending the result as a response
				response.send(result);
			})
			.catch((error) => {
				console.error('Error:', error);
				response.status(500).send({ error: 'Internal Server Error' });
			});
	}

	// users/is_user_exist by mobile and adhaar etc filter.
	@Post('/is_user_exist')
	public async isUserExist(@Body() req: Record<string, any>) {
		return this.userService.isUserExist(req);
	}

	// users/update_facilitator/:id update facilitator status.
	@Put('update_facilitator/:id')
	@UseGuards(new AuthGuard())
	public async updateUser(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Req() req: any,
	) {
		return this.userService.update(id, body, req, 'program_faciltators');
	}

	// users/login by username and password.
	@Post('/login')
	login(
		@Query('username') username: string,
		@Query('password') password: string,
		@Res() response: Response,
	) {
		return this.userService.login(username, password, response);
	}

	// users/ip_user_info by auth token.
	@Get('/ip_user_info')
	@UseGuards(new AuthGuard())
	ipUserInfo(@Req() request: Request, @Res() response: Response) {
		this.userService
			.ipUserInfo(request, response)
			.then((result) => {
				// Further processing or sending the result as a response
				response.send(result);
			})
			.catch((error) => {
				console.error('Error:', error);
				response.status(500).send({ error: 'Internal Server Error' });
			});
	}

	@Get('/organization/:id')
	organizationInfo(@Param('id') id: string) {
		return this.userService.organizationInfo(id);
	}

	// users/register on keycloak and hasura both side.
	@Post('/register')
	@HttpCode(200)
	@UsePipes(ValidationPipe)
	public async register(
		@Body() body: RegisterFacilitatorDto,
		@Req() request: Request,
	) {
		return this.userService.register(body, request);
	}

	@Get('/aadhaarDetails/:userId')
	@UseGuards(new AuthGuard())
	private async getAadhaarDetails(
		@Param('userId') id: string,
		@Res() response: Response,
	) {
		return this.userService.getAadhaarDetails(id, response);
	}

	@Get('/audit/:context/:context_id')
	@UseGuards(new AuthGuard())
	getAuditLogs(
		@Req() request: any,
		@Res() response: Response,
		@Param('context_id') context_id: string,
		@Param('context') context: number,
	) {
		return this.userService.getAuditLogs(
			context_id,
			context,
			request,
			response,
		);
	}

	@Post('/is-camp-exist/:id')
	@UseGuards(new AuthGuard())
	public async userCampExist(
		@Param('id') id: any,
		@Req() request: any,
		@Res() response: any,
		@Body() body: any,
	) {
		return this.userService.userCampExist(id, body, request, response);
	}

	@Get('cohorts/my/:type')
	@UseGuards(new AuthGuard())
	public async getUserCohorts(
		@Param('type') type: any,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.userService.getUserCohorts(type, request, response);
	}

	@Post('/onboarding/validate')
	@UsePipes(ValidationPipe)
	public async validateOnBoardingLink(
		@Body() body: LinkValidationDTO,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.userService.validateOnBoardingLink(body, request, response);
	}

	//get IP list
	@Post('/ip/list')
	@UseGuards(new AuthGuard())
	getIpList(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.userService.getIpList(request, req, response);
	}
	//get cohort list of ip
	@Post('/cohort/ip_list')
	@UseGuards(new AuthGuard())
	getCohortIpList(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.userService.getCohortIpList(request, req, response);
	}

	@Post('/ip_users/list')
	@UseGuards(new AuthGuard())
	getIpUserList(
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.userService.getIpUserList(body, req, response);
	}
	@Post('/ip/:id')
	@UseGuards(new AuthGuard())
	getIpDetails(
		@Req() request: any,
		@Body() body: any,
		@Param('id') id: number,
		@Res() response: any,
	) {
		return this.userService.getIpDetails(id, body, request, response);
	}

	@Post('/roles/list')
	@UseGuards(new AuthGuard())
	getRoleList(
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.userService.getRoleList(body, req, response);
	}
	/**************************************************************************/
	/******************************* V2 APIs **********************************/
	/**************************************************************************/
	@Version('2')
	@Post('/is_user_exist/:role')
	public async checkUserExistsV2(
		@Param('role') role: any,
		@Res() response: any,
		@Body() body: any,
	) {
		return this.userService.checkUserExistsV2(role, body, response);
	}
}
