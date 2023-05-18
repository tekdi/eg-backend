import { Injectable } from '@nestjs/common';
const crypto = require("crypto");
const axios = require('axios');

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

            const otpRes = await this.sendOtpService(mobile, reason, otp)
            console.log("otpRes", otpRes)
            if(otpRes) {
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

    public async sendOtpService(mobileNo, reason, otp) {

        console.log("mobileNo", mobileNo)
        console.log("otp", otp)
        console.log("reason", reason)

        let msg =  `नमस्ते, प्रगति प्लेटफॉर्म पर सत्यापन/लॉगिन के लिए आपका ओटीपी {#OTP#} है। FEGG`

        let encodeMsg = encodeURIComponent(msg)


        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.SMS_GATEWAY_BASE_URL}/VoicenSMS/webresources/CreateSMSCampaignGet?ukey=${process.env.SMS_GATEWAY_API_KEY}&msisdnlist=phoneno:${mobileNo},arg1:${otp}&language=2&credittype=7&senderid=${process.env.SENDER_ID}&templateid=1491&message=${encodeMsg}&isschd=false&isrefno=true&filetype=1`,
            headers: {}
        };

        try {
            const res = await axios.request(config)
            console.log("otp api res", res.data)
            return res.data
        } catch (err) {
            console.log("otp err", err)
        }


    }
}
