import {
    IsNotEmpty,
    IsString,
    IsEnum,
    Matches,
    MinLength,
    IsOptional
} from 'class-validator';

import { mobileOwnership, mobileType } from '../../helper/enums/beneficiary';

export class RegisterBeneficiaryDto {
    @IsNotEmpty()
    @IsString()
    @IsOptional()
    first_name: string;

    @IsNotEmpty()
    @IsString()
    @IsOptional()
    last_name: string;

    @IsNotEmpty()
    @IsString()
    @IsOptional()
    middle_name: string;

    @IsNotEmpty()
    @IsString()
    @IsOptional()
    @Matches(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/)
    dob: string

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
