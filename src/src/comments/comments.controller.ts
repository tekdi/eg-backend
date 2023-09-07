import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
@Controller('comments')
export class CommentsController {
	constructor(private readonly commentsService: CommentsService) {}

	@Post('/:context/:context_id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	create(
		@Body() body: CreateCommentDto,
		@Req() request: any,
		@Param('context') context: string,
		@Param('context_id') context_id: string,
		@Res() response: Response,
	) {
		return this.commentsService.create(
			request,
			body,
			context,
			context_id,
			response,
		);
	}

	@Get('/:context/:context_id')
	@UseGuards(new AuthGuard())
	findAll(
		@Req() request: any,
		@Param('context') context: string,
		@Param('context_id') context_id: string,
		@Res() response: Response,
	) {
		return this.commentsService.findAll(
			request,
			context,
			context_id,
			response,
		);
	}

	@Get('/:context/:context_id/:id')
	async findOne(
		@Param('id') id: string,
		@Res() response: Response,
	) {
		const result: any = await this.commentsService.findOne(
			+id,
		);
		if (result?.data?.comments.length > 0) {
			return response.status(200).json({
				success: true,
				message: 'Comment Found successfully!',
				data: result?.data?.comments[0],
			});
		} else {
			return response.status(400).json({
				success: false,
				message: `Comment Not Found!`,
				data: {},
			});
		}
	}

	@Patch('/:context/:context_id/:id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	update(
		@Param('id') id: number,
		@Req() request: any,
		@Res() response: Response,
		@Body() body: UpdateCommentDto,
	) {
		return this.commentsService.update(
			id,
			body,
			request,
			response,
		);
	}

	@Delete('/:context/:context_id/:id')
	@UseGuards(new AuthGuard())
	remove(
		@Param('id') id: number,
		@Req() request: any,
		@Res() response: Response,
	) {
		return this.commentsService.remove(
			id,
			request,
			response,
		);
	}
}
