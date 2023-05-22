import {
    IsOptional,
  } from 'class-validator';
  
  export class FilterFacilitatorDto {
    @IsOptional()
    limit: number;
  
    @IsOptional()
    page: number;

    @IsOptional()
    qualificationIds: [number];
  
    @IsOptional()
    work_experience: string;
    
    @IsOptional()
    vo_experience: string;
    
    @IsOptional()
    status: string;
    
    @IsOptional()
    district: string; 
}
