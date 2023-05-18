import { Injectable } from '@nestjs/common';
const crypto = require("crypto");
const axios = require('axios');

@Injectable()
export class AuthenticateService {

    public async sendOtp(req, response) {
        const mobileNo = req.mobile;
        const reason = req.reason;
        console.log("mobileNo", mobileNo)
        console.log("reason", reason)
        const otp = Math.floor(100000 + Math.random() * 900000);
        const ttl = 5 * 60 * 1000;
        const expires = Date.now() + ttl;
        //console.log("expires", expires);
        const data = `${mobileNo}.${reason}.${otp}.${expires}`;
        const smsKey = "13893kjefbekbkb";
        const hash = crypto
            .createHmac("sha256", smsKey)
            .update(data)
            .digest("hex");
        const fullhash = `${hash}.${expires}`;
        console.log("fullhash", fullhash);
        console.log("otp", otp);

        const mobileNoStr = mobileNo.toString();

        if (otp && fullhash) {

           const otpRes =  await this.sendOtpService(mobileNo, reason, otp)
           console.log("otpRes", otpRes)
           if(otpRes) {
            return response.status(200).json({
                statusCode: 200,
                success: true,
                message: `Otp successfully sent to XXXXXX${mobileNoStr.substring(6)}`,
                data: { hash: fullhash }
            });
           } else {
            return response.status(400).json({
                statusCode: 400,
                success: false,
                message: 'Unable to send OTP!',
                data: null
            });
           }
            
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
        const mobileNo = req.mobile;
        const reason = req.reason;
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
        const data = `${mobileNo}.${reason}.${otp}.${expires}`;
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

    public async resetPassword(req, response) {
        //console.log("req", req)
        const mobileNo = req.mobile;
        const reason = req.reason;
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
        const data = `${mobileNo}.${reason}.${otp}.${expires}`;
        const smsKey = "13893kjefbekbkb";
        const newCalculatedHash = crypto
            .createHmac("sha256", smsKey)
            .update(data)
            .digest("hex");
        //console.log("newCalculatedHash", newCalculatedHash);
        //console.log("hashValue", hashValue);
        if (newCalculatedHash === hashValue) {
            
            // keycloak reset-password

            


        } else {
            return response.status(400).json({
                statusCode: 400,
                success: false,
                message: 'Incorrect OTP',
                data: null
            });
        }
    }

    public async sendOtpService(mobileNo, reason, otp) {

        console.log("mobileNo", mobileNo)
        console.log("otp", otp)

        let msg = `OTP for ${reason} is ${otp}`

        let encryptMsg = encodeURIComponent(msg)

        console.log("encryptMsg", encryptMsg)

        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `http://125.16.147.178/VoicenSMS/webresources/CreateSMSCampaignGet?ukey=dRHa1WJpeOQuk64lE51qtxCws&msisdnlist=phoneno:${mobileNo},arg1:test21,arg2:test22&language=2&credittype=7&senderid=FEGGPR&templateid=1491&message=${encryptMsg}&isschd=false&isrefno=true&filetype=1`,
            headers: {}
        };

        try {
            const res = await axios.request(config)
            console.log("otp api res", res.data)
            return res.data
        } catch(err) {
            console.log("otp err", err)
        }
        

    }
}
