import { Module } from '@nestjs/common';
import { BoardService } from './board.service';
import { HasuraModule } from '../../services/hasura/hasura.module';
import { BoardController } from './board.controller';

@Module({
	imports: [HasuraModule],
	providers: [BoardService],
	exports: [BoardService],
	controllers: [BoardController],
})
export class BoardModule {}
