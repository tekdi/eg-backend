import {
	Controller,
	Get,
	Param,
	Res,
	Req,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('board')
export class BoardController {
	constructor(private boardService: BoardService) {}
	@Get('/list')
	@UsePipes(ValidationPipe)
	// @UseInterceptors(CacheInterceptor)
	// @CacheTTL(parseInt(process.env.CACHE_ENUM_TTL, 10))
	@UseGuards(new AuthGuard())
	public async getBoardList(@Res() response: any, @Req() request: any) {
		return this.boardService.getBoardList(response, request);
	}

	@Get('/subject/list/:id')
	@UsePipes(ValidationPipe)
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

	@Get('/:id')
	@UsePipes(ValidationPipe)
	// @UseInterceptors(CacheInterceptor)
	// @CacheTTL(parseInt(process.env.CACHE_ENUM_TTL, 10))
	@UseGuards(new AuthGuard())
	public async getBoardNameById(
		@Param('id') id: number,
		@Res() response: any,
		@Req() request: any,
	) {
		return this.boardService.getBoardNameById(id, response, request);
	}
}
