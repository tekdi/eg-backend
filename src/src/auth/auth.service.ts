import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { KeycloakService } from 'src/services/keycloak/keycloak.service';
const crypto = require("crypto");
const axios = require('axios');

@Injectable()
export class AuthService {

    public smsKey = this.configService.get<string>('SMS_KEY');;

    constructor(private configService: ConfigService, private readonly keycloakService: KeycloakService, private readonly hasuraService: HasuraService) { }

    public async sendOtp(req, response) {
        const mobile = req.mobile;
        const reason = req.reason;

        const otp = crypto.randomInt(100000, 999999);
        const ttl = parseInt(process.env.OTP_EXPIRY_IN_MINUTES) * 60 * 1000;
        const expires = Date.now() + ttl;
        const data = `${mobile}.${otp}.${reason}.${expires}`;
        const smsKey = this.smsKey;

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
            if (otpRes) {
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

        const otpVerify = await this.otpVerification(mobile, hash, otp, reason);

        if(otpVerify === 'Timeout please try again') {
            return response.status(400).json({
                success: false,
                message: 'Timeout please try again',
                data: {}
            });
        }

        if(otpVerify === 'OTP verified successfully') {
            return response.status(200).json({
                success: true,
                message: 'OTP verified successfully!',
                data: {}
            }); 
        }

        if(otpVerify === 'Incorrect OTP') {
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

        let msg = `नमस्ते, प्रगति प्लेटफॉर्म पर सत्यापन/लॉगिन के लिए आपका ओटीपी {#OTP#} है। FEGG`

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

    public async resetPasswordUsingOtp(req, response) {
        console.log("req", req)
        const mobile = req.mobile;
        const hash = req.hash;
        const otp = req.otp;
        const reason = req.reason;

        const otpVerify = await this.otpVerification(mobile, hash, otp, reason)

        if(otpVerify === 'Timeout please try again') {
            return response.status(400).json({
                success: false,
                message: 'Timeout please try again',
                data: {}
            });
        }

        if(otpVerify === 'OTP verified successfully') {

            let query = {
                query: `query MyQuery {
                    users_by_pk(id: ${req.id}) {
                      keycloak_id
                      last_name
                      id
                      first_name
                    }
                  }`
            }
            const userRes = await this.hasuraService.postData(query)
            console.log("userRes", userRes)
            if (userRes) {
                const token = await this.keycloakService.getAdminKeycloakToken()
                if (token?.access_token && userRes.data.users_by_pk.keycloak_id) {
    
                    const resetPasswordRes = await this.keycloakService.resetPassword(userRes.data.users_by_pk.keycloak_id, token.access_token, req.password)
                    
                    if(resetPasswordRes) {
                        return response.status(200).json({
                            success: true,
                            message: 'Password updated successfully!',
                            data: {}
                        });
                    } else {
                        return response.status(200).json({
                            success: false,
                            message: 'unable to reset password!',
                            data: {}
                        }); 
                    }
                    
                } else {
                    return response.status(200).json({
                        success: false,
                        message: 'unable to get token',
                        data: {}
                    });
                }
            } else {
                return response.status(200).json({
                    success: false,
                    message: 'User not found!',
                    data: {}
                });
            }

            
        }

        if(otpVerify === 'Incorrect OTP') {
            return response.status(400).json({
                success: false,
                message: 'Incorrect OTP',
                data: {}
            });
        }

        

    }

    public async otpVerification(mobile, hash, otp, reason) {
        let [hashValue, expires] = hash.split(".");
        let now = Date.now();

        if (now > parseInt(expires)) {

            return 'Timeout please try again';
    
        }

        const data = `${mobile}.${otp}.${reason}.${expires}`;
        const smsKey = this.smsKey;

        const newCalculatedHash = crypto
            .createHmac("sha256", smsKey)
            .update(data)
            .digest("hex");

        if (newCalculatedHash === hashValue) {

            return 'OTP verified successfully';
            
        } else {

            return 'Incorrect OTP';
        
        }
    }
}
