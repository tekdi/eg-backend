import {
    IsNotEmpty,
    IsString,
    IsMobilePhone,
    IsEnum
} from 'class-validator';

import { mobileOwnership, mobileType } from '../enums/beneficiary';

export class RegisterFacilitatorDto {
    
    @IsNotEmpty()
    @IsString()
    first_name: string;

    @IsMobilePhone('en-IN')
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
