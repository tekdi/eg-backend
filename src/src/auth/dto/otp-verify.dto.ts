import {
    IsNotEmpty, IsString, Matches, MinLength
} from 'class-validator';

export class OtpVerifyDTO {
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @Matches(/^[6-9]{1}[0-9]{9}$/)
    // Should start with 6
    public mobile: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @Matches(/^[0-9]{6}$/)
    public otp: string;

    @IsString()
    @IsNotEmpty()
    public reason: string;

    @IsString()
    @IsNotEmpty()
    public hash: string;
}
