import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SubjectslistService } from './subjectslist.service';
import { CreateSubjectslistDto } from './dto/create-subjectslist.dto';
import { UpdateSubjectslistDto } from './dto/update-subjectslist.dto';

@Controller('subjectslist')
export class SubjectslistController {
  constructor(private readonly subjectslistService: SubjectslistService) {}

  @Post('/create')
  create(@Body() createSubjectslistDto: CreateSubjectslistDto) {
    return this.subjectslistService.create(createSubjectslistDto);
  }

  @Post()
  findAll(@Body() request: Record<string, any>) {
    return this.subjectslistService.findAll(request);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjectslistService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() request: Record<string, any>) {
    return this.subjectslistService.update(+id, request);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.subjectslistService.remove(+id);
  // }
}
