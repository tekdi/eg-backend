import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';

@Module({
	imports: [HasuraModule],
	controllers: [TaxonomyController],
	providers: [TaxonomyService],
})
export class TaxonomyModule {}
