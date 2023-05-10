import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AuthenticateService } from './authenticate.service';
import { Response } from 'express';

@Controller('authenticate')
export class AuthenticateController {

    constructor( public authenticateService: AuthenticateService ) {}

    @Get('/sendOtp')
    public sendOtp( @Query('mobileNo') mobileNo: Number, @Res() response: Response) {
        return this.authenticateService.sendOtp(mobileNo, response);
    }

    @Post('/verifyOtp')
    public verifyOtp( @Body() req: Record<string, any>, @Res() response: Response) {
        return this.authenticateService.verifyOtp(req, response);
    }
}
