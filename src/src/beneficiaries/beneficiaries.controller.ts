import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Put,
	Query,
	Req,
	Res,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { UserService } from 'src/user/user.service';
import { BeneficiariesService } from './beneficiaries.service';
import { RegisterBeneficiaryDto } from './dto/register-beneficiary.dto';
import { StatusUpdateDTO } from './dto/status-update.dto';

@UseInterceptors(SentryInterceptor)
@Controller('beneficiaries')
export class BeneficiariesController {
	constructor(
		private beneficiariesService: BeneficiariesService,
		private userService: UserService,
	) {}

	// @Get('/list')
	// public async getAgList(
	//   @Body() request: Record<string, any>,
	//   @Req() req:any
	// ) {
	//    return this.beneficiariesService.getAgList(request,req);
	// }

	// @Post('/create')
	// create(@Body() createEventDto: CreateEventDto) {
	//   return this.beneficiariesService.create(createEventDto);
	// }

	@Post()
	@UseGuards(new AuthGuard())
	findAll(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.beneficiariesService.findAll(request, req, response);
	}

	@Post('/admin/list/duplicates-by-aadhaar')
	@UseGuards(new AuthGuard())
	async getBeneficiariesDuplicatesByAadhaar(
		@Body() body: Record<string, any>,
		@Query() query: any,
		@Res() response: Record<string, any>,
	) {
		const aadhaarNo = body.aadhar_no;
		const limit = !isNaN(parseInt(query.limit)) ? parseInt(query.limit) : 0;
		const page =
			!isNaN(parseInt(query.page)) && parseInt(query.page) > 0
				? parseInt(query.page)
				: 1;
		const skip = limit * (page - 1);
		const resultPayload =
			await this.beneficiariesService.getBeneficiariesDuplicatesByAadhaar(
				aadhaarNo,
				limit,
				skip,
			);

		if (resultPayload.count <= 1) {
			return response.status(200).json({
				success: false,
				message: 'Duplication not happening for this Aadhaar number!',
			});
		}

		if (resultPayload.success) {
			return response.status(200).json(resultPayload);
		} else {
			return response.status(200).json({
				success: false,
				message: 'Error while fetching results',
			});
		}
	}

	@Post('admin/list/deactivate-duplicates')
	@UseGuards(new AuthGuard())
	async deactivateDuplicateBeneficiaries(
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: Record<string, any>,
	) {
		const roles = req.mw_roles;
		let duplicateArr;
		// Fetch aadhar number of user to set as active
		const aadhar_no = (
			await this.beneficiariesService.findOne(+body.activeId)
		)?.data?.aadhar_no;

		// Fetch valid duplication list of the token user
		if (roles.includes('program_owner')) {
			duplicateArr = (
				await this.beneficiariesService.getAllDuplicatesUnderPo()
			).data;
		} else if (roles.includes('staff')) {
			duplicateArr = (
				await this.beneficiariesService.getAllDuplicatesUnderIp(
					req.mw_userid,
				)
			).data;
		}

		// Check if the Aadhaar number exists or not in the list
		if (
			!duplicateArr.some(
				(aadhaarData) => aadhaarData.aadhar_no == aadhar_no,
			)
		) {
			return response.status(400).json({
				success: false,
				message: 'Invalid Aadhaar!',
			});
		}

		// Set other AGs as deactivated and set is_duplicate flag to false
		const { success, data: updateData } =
			await this.beneficiariesService.deactivateDuplicateBeneficiaries(
				aadhar_no,
				+body.activeId,
				req.mw_userid,
			);

		return response.status(200).json({
			success: success,
			data: updateData,
		});
	}

	@Post('/admin/list')
	@UseGuards(new AuthGuard())
	findAllBeneficiariesForIp(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.beneficiariesService.getList(request, req, response);
	}

	@Post('/:id/is_enrollment_exists')
	@UseGuards(new AuthGuard())
	async isEnrollmentNumberExists(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Res() response: Response,
	) {
		const result = await this.beneficiariesService.isEnrollmentNumberExists(
			id,
			body,
		);
		return response.status(result.success ? 200 : 422).json(result);
	}

	@Get('/getStatuswiseCount')
	getStatuswiseCount(
		@Body() body: any,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.beneficiariesService.getStatuswiseCount(
			body,
			request,
			response,
		);
	}

	@Get('admin/list/duplicates-count-by-aadhaar')
	@UseGuards(new AuthGuard())
	async getAllDuplicateCountsByAadhaar(
		@Req() request: any,
		@Query() query: any,
		@Res() response: any,
	) {
		const roles = request.mw_roles;

		const limit = !isNaN(parseInt(query.limit)) ? parseInt(query.limit) : 0;
		const page =
			!isNaN(parseInt(query.page)) && parseInt(query.page) > 0
				? parseInt(query.page)
				: 1;
		const skip = limit * (page - 1);
		// Fetch duplicate counts based on role
		let resultPayload;
		if (roles.includes('program_owner')) {
			resultPayload =
				await this.beneficiariesService.getAllDuplicatesUnderPo(
					limit,
					skip,
				);
		} else if (roles.includes('staff')) {
			resultPayload =
				await this.beneficiariesService.getAllDuplicatesUnderIp(
					request.mw_userid,
					limit,
					skip,
					request,
					response,
				);
		}
		return response.status(200).json(resultPayload);
	}

	@Get(':id')
	@UseGuards(new AuthGuard())
	public async findOne(
		@Param('id') id: string,
		@Req() req: any,
		@Res() response: Response,
	) {
		if (req.mw_roles?.includes('program_owner')) {
			req.parent_ip_id = req.mw_ip_user_id;
		} else {
			const user = await this.userService.ipUserInfo(req);
			if (req.mw_roles?.includes('staff')) {
				req.parent_ip_id =
					user?.data?.program_users?.[0]?.organisation_id;
			} else if (req.mw_roles?.includes('facilitator')) {
				req.parent_ip_id = user?.data?.program_faciltators?.parent_ip;
			}
		}

		if (!req.parent_ip_id) {
			return response.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}

		return this.beneficiariesService.findOne(+id, response);
	}

	@Post('/register')
	@UsePipes(ValidationPipe)
	private async registerBeneficiary(
		@Body() body: RegisterBeneficiaryDto,
		@Req() request: any,
	) {
		return this.beneficiariesService.registerBeneficiary(body, request);
	}

	@Patch(':id')
	@UseGuards(new AuthGuard())
	public async updateBeneficiary(
		@Param('id') id: string,
		@Body() req: Record<string, any>,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.create(
			{
				...req,
				id: id,
				mw_userid: request.mw_userid,
				mw_roles: request.mw_roles,
			},
			request,
			response,
			true,
		);
	}

	@Put('statusUpdate')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	async statusUpdate(
		@Body() body: StatusUpdateDTO,
		@Res() response: any,
		@Req() request: any,
	) {
		const check = await this.beneficiariesService.updateRejectDropout(
			body,
			request,
		);

		if (check) {
			return response.status(check.status).json({
				success: check.success,
				message: check.message,
				data: check.data,
			});
		}

		const result = await this.beneficiariesService.statusUpdate(
			body,

			request,
		);
		return response.status(result.status).json({
			success: result.success,
			message: result.message,
			data: result.data,
		});
	}

	@Put('admin/statusUpdate')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	async statusUpdateByIp(
		@Body() body: StatusUpdateDTO,
		@Res() response: any,
		@Req() request: any,
	) {
		const check = await this.beneficiariesService.updateRejectDropout(
			body,
			request,
		);

		if (check) {
			return response.status(check.status).json({
				success: check.success,
				message: check.message,
				data: check.data,
			});
		}
		const result = await this.beneficiariesService.statusUpdateByIp(
			body,

			request,
		);
		return response.status(result.status).json({
			success: result.success,
			message: result.message,
			data: result.data,
		});
	}

	@Post('/admin/export-csv')
	@UseGuards(new AuthGuard())
	async exportCsv(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.exportCsv(request, body, response);
	}

	@Post('/admin/export-subjects-csv')
	@UseGuards(new AuthGuard())
	async exportSubjectsCsv(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.exportSubjectCsv(
			request,
			body,
			response,
		);
	}

	@Post('admin/verify-enrollment')
	@UseGuards(new AuthGuard())
	async verifyEnrollment(
		@Body() body: any,
		@Res() response: any,
		@Req() request: any,
	) {
		let result;

		const payload = {
			user_id: body.user_id,
			enrollment_verification_status: body.enrollment_verification_status,
			enrollment_verification_reason: body.enrollment_verification_reason
				? JSON.stringify(body.enrollment_verification_reason).replace(
						/"/g,
						'\\"',
				  )
				: '',
		};
		result = await this.beneficiariesService.setEnrollmentStatus(
			payload,
			request,
		);

		return response.status(result.status).json({
			success: result.success,
			message: result.message,
			data: result.data,
		});
	}

	@Post('admin/verify-psyc')
	@UseGuards(new AuthGuard())
	async verifyPSYC(
		@Body() body: any,
		@Res() response: any,
		@Req() request: any,
	) {
		let result;

		const payload = {
			user_id: body.user_id,
			psyc_status: body.psyc_status,
			syc_reason: body.syc_reason,
		};
		result = await this.beneficiariesService.setPsycStatus(
			payload,
			request,
		);

		return response.status(result.status).json({
			success: result.success,
			message: result.message,
			data: result.data,
		});
	}

	@Post('admin/reassign')
	@UseGuards(new AuthGuard())
	async reassignBeneficiary(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		const result = {
			success: false,
			message: '',
			data: {
				unsuccessfulReassignmentIds: [],
			},
		};

		let isInvalidParams = false;

		// Check if facilitator-ID is valid and verify if it is under given IP
		const isValidFacilitator = await this.beneficiariesService.verifyEntity(
			body.facilitatorId,
			'facilitator',
			request.mw_userid,
			request.mw_program_id,
		);
		if (!isValidFacilitator.isVerified) isInvalidParams = true;

		// Check if beneficiary-IDs are valid and verify if they are under given IP
		const allBenDetails = {};
		if (!isInvalidParams) {
			for (const benId of body.beneficiaryIds) {
				const isValidBeneficiary =
					await this.beneficiariesService.verifyEntity(
						benId,
						'beneficiary',
						request.mw_userid,
						request.mw_program_id,
					);
				if (!isValidBeneficiary.isVerified) {
					isInvalidParams = true;
					break;
				}
				allBenDetails[isValidBeneficiary.data.id] =
					isValidBeneficiary.data;
			}
		}

		// Check if beneficiaries' facilitator ID and new reassigned facilitator-ID is not same
		if (!isInvalidParams) {
			isInvalidParams = Object.values(allBenDetails).some(
				(benData: any) =>
					benData.program_beneficiaries[0].facilitator_id ===
					body.facilitatorId,
			);
		}

		// Throw error in case of invalid params
		if (isInvalidParams) {
			result.message = 'Invalid params';
			result.data = null;
			return response.status(400).json(result);
		}

		// Reassign beneficiary one by one
		for (const benId of body.beneficiaryIds) {
			const updatedResult =
				await this.beneficiariesService.reassignBeneficiary(
					benId,
					body.facilitatorId,
					true,
				);
			if (!updatedResult.success)
				result.data.unsuccessfulReassignmentIds.push(benId);
			else {
				// Add audit logs if reassignment is successful
				await this.userService.addAuditLog(
					benId,
					request.mw_userid,
					'program_beneficiaries.facilitator_id',
					updatedResult.data.id,
					{
						facilitator_id:
							allBenDetails[benId].program_beneficiaries[0]
								.facilitator_id,
						original_facilitator_id:
							allBenDetails[benId].program_beneficiaries[0]
								.original_facilitator_id,
					},
					{
						facilitator_id: updatedResult.data.facilitator_id,
						original_facilitator_id:
							updatedResult.data.original_facilitator_id,
					},
					['facilitator_id', 'original_facilitator_id'],
				);
			}
		}

		if (result.data.unsuccessfulReassignmentIds.length) {
			result.message = "Some beneficiaries couldn't be reassigned";
		}

		result.success = true;
		return response.status(200).json(result);
	}

	@Patch('update-Beneficiaries-aadhar/:id')
	@UseGuards(new AuthGuard())
	updateBeneficiariesAadhar(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Req() req: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.updateBeneficiariesAadhar(
			id,
			req,
			body,
			response,
		);
	}

	@Post('/beneficiaries-for-camp')
	@UseGuards(new AuthGuard())
	notRegisteredBeneficiaries(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.notRegisteredBeneficiaries(
			body,
			request,
			response,
		);
	}

	@Post('/update-scholarship/:id')
	@UseGuards(new AuthGuard())
	public async updateScholarshipId(
		@Param('id') id: string,
		@Body() body: any,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.updateScholarshipId(
			id,
			body,
			request,
			response,
		);
	}

	@Post('/beneficiaries-without-baseline')
	@UseGuards(new AuthGuard())
	withOutBaseline(@Req() request: any, @Res() response: any) {
		return this.beneficiariesService.withOutBaseline(request, response);
	}

	@Post('/beneficiaries-scores')
	@UseGuards(new AuthGuard())
	learnerScore(@Body() body: any, @Res() response: any) {
		return this.beneficiariesService.learnerScore(body, response);
	}

	@Get('/enrollment-validation/:id')
	@UseGuards(new AuthGuard())
	enrollmentValidation(
		@Param('id') id: number,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.checkEnrollmentValidation(
			id,
			request,
			response,
		);
	}

	@Post('/ssoid-validation')
	@UseGuards(new AuthGuard())
	ssoidValidation(
		@Req() request: any,
		@Res() response: any,
		@Body() body: any,
	) {
		return this.beneficiariesService.checkDuplicateSSOID(
			body,
			request,
			response,
		);
	}

	@Patch('/disability/:id')
	@UseGuards(new AuthGuard())
	public async updateBeneficiaryDisabilityDetails(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.updateBeneficiaryDisabilityDetails(
			id,
			body,
			request,
			response,
		);
	}

	@Get('/is_enrollment_available/:id')
	@UseGuards(new AuthGuard())
	public async isEnrollmentAvailiable(
		@Param('id') id: string,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.isEnrollmentAvailiable(
			id,
			request,
			response,
		);
	}
}
