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

        if (mobile && reason) {
            const sendOtpRes = await this.sendOtpSMS(mobile, reason)
            console.log("sendOtpRes", sendOtpRes)

            if (sendOtpRes.success) {
                return response.status(200).json(sendOtpRes);
            } else {
                return response.status(400).json(sendOtpRes);
            }
        }
    }

    public async verifyOtp(req, response) {
        const mobile = req.mobile;
        const hash = req.hash;
        const otp = req.otp;
        const reason = req.reason;

        const otpVerify = await this.otpVerification(mobile, hash, otp, reason);

        if (otpVerify === 'Timeout please try again') {
            return response.status(400).json({
                success: false,
                message: 'Timeout please try again',
                data: {}
            });
        }

        if (otpVerify === 'OTP verified successfully') {
            return response.status(200).json({
                success: true,
                message: 'OTP verified successfully!',
                data: {}
            });
        }

        if (otpVerify === 'Incorrect OTP') {
            return response.status(400).json({
                success: false,
                message: 'Incorrect OTP',
                data: {}
            });
        }

    }

    public async resetPasswordUsingOtp(req, response) {
        console.log("req", req)
        const username = req.username;
        const hash = req.hash;
        const otp = req.otp;
        const reason = req.reason;

        //find mobile no.
        let query = {
            query: `query MyQuery2 {
                users(where: {username: {_eq: ${username} }}) {
                  keycloak_id
                  last_name
                  id
                  first_name
                  mobile
                }
              }`
        }
        const userRes = await this.hasuraService.postData(query)
        console.log("userRes", userRes)

        if (userRes.data.users.length > 0) {

            const mobile = userRes.data.users[0].mobile
            const keycloak_id = userRes.data.users[0].keycloak_id

            console.log("mobile", mobile)
            console.log("keycloak_id", keycloak_id)
            if (mobile && keycloak_id) {
                const otpVerify = await this.otpVerification(mobile, hash, otp, reason)

                if (otpVerify === 'Timeout please try again') {
                    return response.status(400).json({
                        success: false,
                        message: 'Timeout please try again',
                        data: {}
                    });
                }

                if (otpVerify === 'OTP verified successfully') {

                    const token = await this.keycloakService.getAdminKeycloakToken()
                    if (token?.access_token && keycloak_id) {

                        const resetPasswordRes = await this.keycloakService.resetPassword(keycloak_id, token.access_token, req.password)

                        if (resetPasswordRes) {
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

                }

                if (otpVerify === 'Incorrect OTP') {
                    return response.status(400).json({
                        success: false,
                        message: 'Incorrect OTP',
                        data: {}
                    });
                }
            } else {
                return response.status(400).json({
                    success: false,
                    message: 'Mobile no. not found!',
                    data: {}
                });
            }
        } else {
            return response.status(400).json({
                success: false,
                message: 'Username not found!',
                data: {}
            });
        }

    }

    public async getMobileByUsernameSendOtp(req, response) {
        const username = req.username;
        const reason = req.reason;

        //find mobile by username
        let query = {
            query: `query MyQuery2 {
                users(where: {username: {_eq: ${username} }}) {
                  keycloak_id
                  last_name
                  id
                  first_name
                  mobile
                }
              }`
        }
        const userRes = await this.hasuraService.postData(query)
        console.log("userRes", userRes)

        if (userRes.data.users.length > 0) {
            const mobile = userRes.data.users[0].mobile

            if (mobile) {
                const sendOtpRes = await this.sendOtpSMS(mobile, reason)
                console.log("sendOtpRes", sendOtpRes)

                if (sendOtpRes.success) {
                    return response.status(200).json(sendOtpRes);
                } else {
                    return response.status(400).json(sendOtpRes);
                }
            } else {
                return response.status(400).json({
                    success: false,
                    message: 'Mobile no. not found!',
                    data: {}
                });
            }
        } else {
            return response.status(400).json({
                success: false,
                message: 'Username not found!',
                data: {}
            });
        }




    }

    public async resetPasswordUsingId(req, response) {
        console.log("req", req)
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


    //helper function
    public async sendOtpSMS(mobile, reason) {

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

            const otpRes = await this.sendSMS(mobile, otp)
            console.log("otpRes", otpRes)
            if (otpRes) {
                return {
                    success: true,
                    message: `Otp successfully sent to XXXXXX${mobileStr.substring(6)}`,
                    data: {
                        // @TODO - remove OTP later
                        otp: otp,
                        hash: fullhash
                    }
                }

            } else {
                return {
                    success: false,
                    message: 'Unable to send OTP!',
                    data: {}
                }

            }

        } else {
            return {
                success: false,
                message: 'Unable to send OTP!',
                data: {}
            }

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

    public async sendSMS(mobileNo, otp) {

        console.log("mobileNo", mobileNo)
        console.log("otp", otp)

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
}
