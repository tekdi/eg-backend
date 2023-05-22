import {
    Body, Controller, Post, Res, UseGuards, UsePipes,
    ValidationPipe
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { OtpSendDTO } from './dto/otp-send.dto';
import { OtpVerifyDTO } from './dto/otp-verify.dto';
import { GetMobileByUsernameSendOtpDTO } from './dto/get-mobile-by-username-send-otp.dto';
import { UserOtpSendDTO } from './dto/username-otp.dto';
import { AuthGuard } from './auth.guard';
import { ResetPasswordAdminDTO } from './dto/reset-password-admin.dto';

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

    @Post('/get-mobile-by-username-send-otp')
    @UsePipes(ValidationPipe)
    public getMobileByUsernameSendOtp(@Body() req: UserOtpSendDTO, @Res() response: Response) {
        return this.authService.getMobileByUsernameSendOtp(req, response);
    }

    @Post('/forgot-password-otp')
    @UsePipes(ValidationPipe)
    public resetPasswordUsingOtp(@Body() req: GetMobileByUsernameSendOtpDTO, @Res() response: Response) {
        return this.authService.resetPasswordUsingOtp(req, response);
    }

    @Post('/reset-password-admin')
    @UseGuards(new AuthGuard())
    @UsePipes(ValidationPipe)
    public resetPasswordUsingId(@Body() req: ResetPasswordAdminDTO, @Res() response: Response) {
        return this.authService.resetPasswordUsingId(req, response);
    }
}
