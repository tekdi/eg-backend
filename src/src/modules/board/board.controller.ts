import {
	Controller,
	Get,
	Param,
	Res,
	Req,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
//import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { BoardService } from './board.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('board')
export class BoardController {
	constructor(private boardService: BoardService) {}
	@Get('/list/:id')
	// @UseInterceptors(CacheInterceptor)
	// @CacheTTL(parseInt(process.env.CACHE_ENUM_TTL, 10))
	@UseGuards(new AuthGuard())
	public async getBoardList(
		@Param('id') id: number,
		@Res() response: any,
		@Req() request: any,
	) {
		return this.boardService.getBoardList(id, response, request);
	}

	@Get('/subject/list/:id')
	// @UseInterceptors(CacheInterceptor)
	// @CacheTTL(parseInt(process.env.CACHE_ENUM_TTL, 10))
	@UseGuards(new AuthGuard())
	public async getSubjectsByBoard(
		@Param('id') id: number,
		@Res() response: any,
		@Req() request: any,
	) {
		return this.boardService.getSubjectsByBoard(id, response, request);
	}
}
