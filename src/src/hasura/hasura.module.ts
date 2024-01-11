import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { HelperModule } from 'src/helper/helper.module';

@Module({
	imports: [HttpModule, HelperModule],
	providers: [HasuraService],
	exports: [HasuraService],
})
export class HasuraModule {}
