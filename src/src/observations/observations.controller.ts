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
	Patch,
	Delete,
} from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { ObservationsService } from './observations.service';
import { ObservationDto } from './dto/observation.dto';
import { FieldDto } from './dto/field.dto';
import { FieldSearchDto } from './dto/field-search.dto';
import { ObservationSearchDto } from './dto/observation-search.dto';

@Controller('observations')
export class ObservationsController {
	constructor(public observationsService: ObservationsService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async createObservation(
		@Body() body: ObservationDto,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.createObservation(
			body,
			response,
			request,
		);
	}

	@Patch('/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async updateObservation(
		@Body() body: ObservationDto,
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.updateObservation(
			body,
			response,
			request,
			id,
		);
	}

	@Get('/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getObservationList(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.getObservationList(
			body,
			response,
			request,
		);
	}

	@Get('/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getObservationById(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.getObservationById(
			response,
			request,
			id,
		);
	}

	@Delete('/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async deleteObservationById(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.deleteObservationById(
			response,
			request,
			id,
		);
	}

	@Post('/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getObservationListByName(
		@Body() body: ObservationSearchDto,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.getObservationList(
			body,
			response,
			request,
		);
	}

	@Post('/fields')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async createFields(
		@Body() body: FieldDto,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.createFields(body, response, request);
	}

	@Patch('/fields/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async updateFields(
		@Body() body: FieldDto,
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.updateFields(
			body,
			response,
			request,
			id,
		);
	}

	@Get('/fields/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getFieldsList(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.getFieldsList(body, response, request);
	}

	@Get('/fields/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getFieldById(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.getFieldById(response, request, id);
	}

	@Delete('/fields/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async deleteFieldById(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.deleteFieldById(response, request, id);
	}

	@Post('/fields/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getFieldListByName(
		@Body() body: FieldSearchDto,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.getFieldsList(body, response, request);
	}
}
