import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AuthenticateService } from './authenticate.service';
import { Response } from 'express';

@Controller('auth')
export class AuthenticateController {

    constructor( public authenticateService: AuthenticateService ) {}

    @Get('/otp-send')
    public sendOtp( @Query('mobileNo') mobileNo: Number, @Res() response: Response) {
        return this.authenticateService.sendOtp(mobileNo, response);
    }

    @Post('/otp-verify')
    public verifyOtp( @Body() req: Record<string, any>, @Res() response: Response) {
        return this.authenticateService.verifyOtp(req, response);
    }
}
