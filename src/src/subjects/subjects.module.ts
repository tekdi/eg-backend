import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/hasura/hasura.module';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
	imports: [HasuraModule],
	controllers: [SubjectsController],
	providers: [SubjectsService],
})
export class SubjectsModule {}
