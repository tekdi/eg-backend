import {
    IsNotEmpty, IsString, Matches, MinLength
} from 'class-validator';

export class UserExistDTO {
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @Matches(/^[6-9]\d{9}$/)
    // Should start with 6
    public mobile: string;

}
