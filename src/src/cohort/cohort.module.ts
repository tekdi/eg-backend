import { Module } from '@nestjs/common';
import { CohortController } from './cohort.controller';
import { CohortService } from './cohort.service';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
@Module({
    imports: [HasuraModuleFromServices],
	controllers: [CohortController],
	providers: [CohortService],
    exports: [CohortService]
})
export class CohortModule {}
