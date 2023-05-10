import { Injectable } from '@nestjs/common';
const crypto = require("crypto");

@Injectable()
export class AuthenticateService {

    public async sendOtp(mobileNo, response) {
        console.log("mobileNo", mobileNo)
        const otp = Math.floor(100000 + Math.random() * 900000);
        const ttl = 5 * 60 * 1000;
        const expires = Date.now() + ttl;
        //console.log("expires", expires);
        const data = `${mobileNo}.${otp}.${expires}`;
        const smsKey = "13893kjefbekbkb";
        const hash = crypto
            .createHmac("sha256", smsKey)
            .update(data)
            .digest("hex");
        const fullhash = `${hash}.${expires}`;
        console.log("fullhash", fullhash);
        console.log("otp", otp);

        const mobileNoStr = mobileNo.toString();

        if(otp && fullhash) {
            return response.status(200).json({
                statusCode: 200,
                success: true,
                message: `Otp successfully sent to XXXXXX${mobileNoStr.substring(6)}`,
                data: {hash: fullhash}
            });
        } else {
            return response.status(400).json({
                statusCode: 400,
                success: false,
                message: 'Unable to send OTP!',
                data: null
            });
        }
    }

    public async verifyOtp(req, response) {
        //console.log("req", req)
        const mobileNo = req.mobileNo;
        const hash = req.hash;
        const otp = req.otp;
        let [hashValue, expires] = hash.split(".");

        let now = Date.now();

        //console.log("now", now);
        //console.log("expires", parseInt(expires));

        if (now > parseInt(expires)) {
            return response.status(400).json({
                statusCode: 400,
                success: false,
                message: 'Timeout please try again',
                result: null
            });
        }
        const data = `${mobileNo}.${otp}.${expires}`;
        const smsKey = "13893kjefbekbkb";
        const newCalculatedHash = crypto
            .createHmac("sha256", smsKey)
            .update(data)
            .digest("hex");
        //console.log("newCalculatedHash", newCalculatedHash);
        //console.log("hashValue", hashValue);
        if (newCalculatedHash === hashValue) {
            //console.log("inside if verify otp");

            return response.status(200).json({
                statusCode: 200,
                success: true,
                message: 'OTP verified successfully!',
                data: null
            });


        } else {
            return response.status(400).json({
                statusCode: 400,
                success: false,
                message: 'Incorrect OTP',
                data: null
            });
        }
    }

    public async sendOtpService(mobileNo, otp) {
        
    }
}
