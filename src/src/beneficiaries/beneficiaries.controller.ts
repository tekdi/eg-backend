import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Req,
    UsePipes,
    ValidationPipe
} from '@nestjs/common';
import { CreateEventDto } from 'src/events/dto/create-event.dto';
import { BeneficiariesService } from './beneficiaries.service';
import { RegisterFacilitatorDto } from '../helper/dto/register-beneficiary.dto';

import { StatusUpdateDTO } from './dto/status-update.dto';
@Controller('beneficiaries')
export class BeneficiariesController {

  constructor(private bs:BeneficiariesService){}

    // @Get('/list')
    // public async getAgList(
    //   @Body() request: Record<string, any>,
    //   @Req() req:any
    // ) {
    //    return this.bs.getAgList(request,req);
    // }
    
  // @Post('/create')
  // create(@Body() createEventDto: CreateEventDto) {
  //   return this.bs.create(createEventDto);
  // }

  @Post()
  findAll(@Body() request: Record<string, any>,
  @Req() req:any) {
    return this.bs.findAll(request,req);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bs.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bs.remove(+id);
  }

  @Post('/register')
  @UsePipes(ValidationPipe)
  private async registerBeneficiary (
      @Body() body: RegisterFacilitatorDto,
      @Req() request:any
  ) {
      return this.bs.registerBeneficiary(body, request);
  }

  @Patch(':id')
  public async updateBeneficiary(
    @Param('id') id: string,
    @Body() req: Record<string, any>,
    @Req() request:any
  ) {
      return this.bs.create({ ...req, id: id }, true, request);
  }
  
  @Put('statusUpdate')
  @UsePipes(ValidationPipe)
  statusUpdate( @Body() request: StatusUpdateDTO) {
    return this.bs.statusUpdate( request);
  }
}
