import { IsArray, ArrayNotEmpty } from 'class-validator';

export class EditRequestDto{
    @IsArray()
    @ArrayNotEmpty()
    fields: string;
}