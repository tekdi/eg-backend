import { PartialType } from '@nestjs/mapped-types';
import {
    IsNotEmpty, IsString
} from 'class-validator';
import { CreateCommentDto } from './create-comment.dto';
export class UpdateCommentDto extends PartialType(CreateCommentDto) {
    @IsString()
    @IsNotEmpty()
    public comment: string;
}
