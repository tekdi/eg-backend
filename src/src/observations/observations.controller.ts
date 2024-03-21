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
import { ObservationFieldsDto } from './dto/observation-fields.dto';
import { ObservationFieldSearchDto } from './dto/observation-fields-search.dto';
import { FieldResponsesDto } from './dto/field-responses.dto';
import { FieldResponsesSearchDto } from './dto/field-responses-search.dto';

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

	@Post('/observation-fields')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async createObservationFields(
		@Body() body: ObservationFieldsDto,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.createObservationFields(
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

	@Patch('/observation-fields/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async updateObservationField(
		@Body() body: ObservationFieldsDto,
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.updateObservationField(
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

	@Get('/observation-fields/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getObservationFieldList(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.getObservationFieldList(
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

	@Get('/observation-fields/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getObservationFieldById(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.getObservationFieldById(
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

	@Delete('observation-fields/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async deleteObservationFieldById(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.deleteObservationFieldById(
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

	@Post('/list/type/:type')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getObservationListByType(
		@Body() body: ObservationSearchDto,
		@Res() response: Response,
		@Req() request: Request,
		@Param('type') type: string,
	) {
		return this.observationsService.getObservationByType(
			body,
			response,
			request,
			type,
		);
	}

	@Post('/report')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getObservationReport(
		@Body() body: ObservationSearchDto,
		@Res() response: Response,
		@Req() request: Request,
		@Param('type') type: string,
	) {
		return this.observationsService.getObservationReport(
			body,
			response,
			request,
		);
	}

	@Post('observation-fields/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getObservationFieldsListByName(
		@Body() body: ObservationFieldSearchDto,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.getObservationFieldList(
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

	//

	@Post('/field-responses')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async createFieldResponses(
		@Body() body: FieldResponsesDto,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.createFieldResponses(
			body,
			response,
			request,
		);
	}

	@Post('/field-responses/bulk')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async createFieldResponsesMany(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.createFieldResponsesMany(
			body,
			response,
			request,
		);
	}

	@Patch('/field-responses/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async updateFieldResponses(
		@Body() body: FieldResponsesDto,
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.updateFieldResponses(
			body,
			response,
			request,
			id,
		);
	}

	@Get('/field-responses/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getFieldResponsesList(
		@Body() body: Body,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.getFieldResponsesList(
			body,
			response,
			request,
		);
	}

	@Get('/field-responses/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getFieldResponsesById(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.getFieldResponsesById(
			response,
			request,
			id,
		);
	}

	@Delete('/field-responses/:id')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async deleteFieldResponsesById(
		@Res() response: Response,
		@Req() request: Request,
		@Param('id') id: number,
	) {
		return this.observationsService.deleteFieldResponsesById(
			response,
			request,
			id,
		);
	}

	@Post('/field-responses/list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getFieldResponsesListByName(
		@Body() body: FieldResponsesSearchDto,
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.getFieldResponsesList(
			body,
			response,
			request,
		);
	}

	@Post('/camp-learner-list')
	@UsePipes(ValidationPipe)
	@UseGuards(new AuthGuard())
	public async getCampLearnersListForEPCP(
		@Res() response: Response,
		@Req() request: Request,
	) {
		return this.observationsService.getCampLearnersListForEPCP(
			response,
			request,
		);
	}
}
