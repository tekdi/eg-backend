import { Module } from '@nestjs/common';
import { SubjectslistService } from './subjectslist.service';
import { SubjectslistController } from './subjectslist.controller';
import { HasuraModule } from 'src/hasura/hasura.module';

@Module({
  imports: [HasuraModule],
  controllers: [SubjectslistController],
  providers: [SubjectslistService],
})
export class SubjectslistModule {}
