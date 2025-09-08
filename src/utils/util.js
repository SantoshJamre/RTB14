const crypto = require('crypto');
const JWT = require('jsonwebtoken');
const Config = require('../config/config');

function generatePasswordHash(password, salt = null) {
    try {
        if (!salt) salt = crypto.randomBytes(16);
        salt = salt.toString('base64');
        const hash = crypto.createHmac('sha512', salt);
        hash.update(password);
        const value = hash.digest('hex');
        return {
            salt: salt,
            hash: value
        };

    } catch (error) {
        console.error(`Error in generatePasswordHash`, error);
        throw error; // Make sure to rethrow the error
    }
}

function verifyAccessToken(token) {
    try {
        const decoded = JWT.verify(token, Config.jwt.user.secret);
        return decoded;
    } catch (error) {
        throw error;
    }
}


function customsAuthTokens(payLoad = {}) {
    const secret = Config.jwt.user.secret
    const access_token = JWT.sign(payLoad, secret, { expiresIn: Config.jwt.accessTokenExpiresIn, issuer: Config.jwt.issuer });
    const refresh_token = JWT.sign(payLoad, secret, { expiresIn: Config.jwt.refreshTokenExpiresIn, issuer: Config.jwt.issuer });
    const accessTokenDecoded = JWT.decode(access_token);

    return ({
        accessToken: access_token,
        refreshToken: refresh_token,
        expirationTime: accessTokenDecoded['exp']
    });
}

function refreshToken(payLoad = {}, refreshToken = "") {
    const access_token = JWT.sign(payLoad, Config.jwt.user.secret, { expiresIn: Config.jwt.accessTokenExpiresIn, issuer: Config.jwt.issuer });
    const accessTokenDecoded = JWT.decode(access_token);

    return ({
        accessToken: access_token,
        refreshToken: refreshToken,
        expirationTime: accessTokenDecoded['exp']
    });
}

function verifyPassword({ hash, salt, password }) {
    if (hash && salt) {
        const passwordDetails = generatePasswordHash(password, salt);
        if (hash !== passwordDetails.hash) {
            return false
        }
        return true;
    }
    return false
}

function responseFormate(userData) {
    const response = {
        uid: userData._id,
        email: userData.email,
        authToken: customsAuthTokens({ uid: userData._id, email: userData.email, })
    }

    return response;
}


function generateOTP(signUpData) {
    const now = new Date();
    let otp = signUpData?.otp;
    const lastUpdated = signUpData?.updatedAt ? new Date(signUpData.updatedAt) : null;

    const timeDiffInMs = lastUpdated ? now.getTime() - lastUpdated.getTime() : Infinity;
    const timeDiffInMinutes = timeDiffInMs / (1000 * 60);

    if (!otp || timeDiffInMinutes >= 5) {
        otp = Math.floor(100000 + Math.random() * 900000); // Generate new 6-digit OTP
    }

    return {
        otp,
        updatedAt: now
    };
}


module.exports = {
    generatePasswordHash,
    responseFormate,
    verifyPassword,
    generateOTP,
    refreshToken,
    verifyAccessToken,
    customsAuthTokens
}