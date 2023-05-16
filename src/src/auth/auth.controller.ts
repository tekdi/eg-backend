import {
    Body, Controller, Post, Res, UsePipes,
    ValidationPipe
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { OtpSendDTO } from './dto/otp-send.dto';
import { OtpVerifyDTO } from './dto/otp-verify.dto';

@Controller('auth')
export class AuthController {

    constructor(public authService: AuthService) { }

    @Post('/otp-send')
    @UsePipes(ValidationPipe)
    public sendOtp(@Body() req: OtpSendDTO, @Res() response: Response) {
        return this.authService.sendOtp(req, response);
    }

    @Post('/otp-verify')
    @UsePipes(ValidationPipe)
    public verifyOtp(@Body() req: OtpVerifyDTO, @Res() response: Response) {
        return this.authService.verifyOtp(req, response);
    }
}
