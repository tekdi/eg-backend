import {
    IsNotEmpty, IsString, Matches, MinLength
} from 'class-validator';

export class UserOtpSendDTO {
    @IsString()
    @IsNotEmpty()
    
    public username: string;

    @IsString()
    @IsNotEmpty()
    public reason: string;
}
