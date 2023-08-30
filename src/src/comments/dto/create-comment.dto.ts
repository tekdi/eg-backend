import {
    IsNotEmpty, IsOptional, IsString
} from 'class-validator';
export class CreateCommentDto {
    @IsString()
    @IsNotEmpty()
    public comment: string;

    @IsString()
    @IsOptional()
    public parent_id: string;

    @IsString()
    @IsOptional()
    public status: string;
}
