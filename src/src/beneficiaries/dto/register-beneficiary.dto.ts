import {
    IsNotEmpty,
    IsString,
    IsEnum,
    Matches,
    MinLength
} from 'class-validator';

import { mobileOwnership, mobileType } from '../../helper/enums/beneficiary';

export class RegisterBeneficiaryDto {
    
    @IsNotEmpty()
    @IsString()
    first_name: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @Matches(/^[6-9]\d{9}$/)
    mobile: string;

    @IsNotEmpty()
    @IsEnum(mobileOwnership)
    device_ownership: string;

    @IsNotEmpty()
    @IsEnum(mobileType)
    device_type: string;

    @IsNotEmpty()
    @IsString()
    facilitator_id: string;
}
