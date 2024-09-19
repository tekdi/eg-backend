import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { QueryGeneratorService } from './queryGenerator.service';
import { UserHelperService } from './userHelper.service';
import { CSVHelperService } from './csvHelper.service';

@Module({
	imports: [HttpModule],
	providers: [UserHelperService, QueryGeneratorService, CSVHelperService],
	exports: [UserHelperService, QueryGeneratorService, CSVHelperService],
})
export class HelperModule {}
