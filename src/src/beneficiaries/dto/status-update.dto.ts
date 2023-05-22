import {
    IsNotEmpty, IsString
} from 'class-validator';

export class StatusUpdateDTO {
    @IsString()
    @IsNotEmpty()
    public id: string;

    @IsString()
    @IsNotEmpty()
    public status: string;
}