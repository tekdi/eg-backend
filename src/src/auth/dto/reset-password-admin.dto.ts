import {
    IsNotEmpty, IsString
} from 'class-validator';

export class ResetPasswordAdminDTO {
    @IsString()
    @IsNotEmpty()
    public id: string;

    @IsNotEmpty()
    @IsString()
    public password: string
}
