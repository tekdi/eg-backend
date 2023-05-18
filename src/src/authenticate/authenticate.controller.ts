import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AuthenticateService } from './authenticate.service';
import { Response } from 'express';

@Controller('auth')
export class AuthenticateController {

    constructor( public authenticateService: AuthenticateService ) {}

    @Post('/otp-send')
    public sendOtp( @Body() req: Record<string, any>, @Res() response: Response) {
        return this.authenticateService.sendOtp(req, response);
    }

    @Post('/otp-verify')
    public verifyOtp( @Body() req: Record<string, any>, @Res() response: Response) {
        return this.authenticateService.verifyOtp(req, response);
    }

    @Post('/reset-password')
    public resetPassword( @Body() req: Record<string, any>, @Res() response: Response) {
        return this.authenticateService.resetPassword(req, response);
    }
}
