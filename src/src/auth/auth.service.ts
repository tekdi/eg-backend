import { Injectable } from '@nestjs/common';
const crypto = require("crypto");

@Injectable()
export class AuthService {

    public async sendOtp(req, response) {
        const mobile = req.mobile;
        const reason = req.reason;

        const otp = crypto.randomInt(100000, 999999);
        const ttl = parseInt(process.env.OTP_EXPIRY_IN_MINUTES) * 60 * 1000;
        const expires = Date.now() + ttl;
        const data = `${mobile}.${otp}.${reason}.${expires}`;
        const smsKey = "13893kjefbekbkb";

        const hash = crypto
            .createHmac("sha256", smsKey)
            .update(data)
            .digest("hex");
        const fullhash = `${hash}.${expires}`;

        console.log("OTP_EXPIRY_IN_MINUTES", process.env.OTP_EXPIRY_IN_MINUTES);
        console.log("mobile", mobile);
        console.log("reason", reason);
        console.log("fullhash", fullhash);
        console.log("otp", otp);

        const mobileStr = mobile.toString();

        if (otp && fullhash) {
            return response.status(200).json({
                success: true,
                message: `Otp successfully sent to XXXXXX${mobileStr.substring(6)}`,
                data: {
                    // @TODO - remove OTP later
                    otp: otp,
                    hash: fullhash
                }
            });
        } else {
            return response.status(400).json({
                success: false,
                message: 'Unable to send OTP!',
                data: {}
            });
        }
    }

    public async verifyOtp(req, response) {
        const mobile = req.mobile;
        const hash = req.hash;
        const otp = req.otp;
        const reason = req.reason;

        let [hashValue, expires] = hash.split(".");
        let now = Date.now();

        if (now > parseInt(expires)) {
            return response.status(400).json({
                success: false,
                message: 'Timeout please try again',
                data: {}
            });
        }

        const data = `${mobile}.${otp}.${reason}.${expires}`;
        const smsKey = "13893kjefbekbkb";

        const newCalculatedHash = crypto
            .createHmac("sha256", smsKey)
            .update(data)
            .digest("hex");

        if (newCalculatedHash === hashValue) {
            return response.status(200).json({
                success: true,
                message: 'OTP verified successfully!',
                data: {}
            });
        } else {
            return response.status(400).json({
                success: false,
                message: 'Incorrect OTP',
                data: {}
            });
        }
    }

    /*public async sendOtpService(mobile, otp) {
    }*/
}
