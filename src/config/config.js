module.exports = {
    dbUrl: process.env.MONGODB_URI,
    hashConfig: {
        SIGNERKEY: process.env.SIGNERKEY,
        SALTSEPARATOR: process.env.SALTSEPARATOR,
        ALGORITHM: process.env.ALGORITHM,
        IV_LENGTH: process.env.IV_LENGTH,
        IV_VALUE: process.env.IV_VALUE,
        KEYLEN: process.env.KEYLEN,
        PARAMS: {
            "N": 16384,
            "r": 8,
            "p": 1,
            "maxmem": 33554432
        }
    },
    jwt: {
        user: { secret: process.env.JWT_SECRET },
        issuer: "test",
        accessTokenExpiresIn: "10 days",
        refreshTokenExpiresIn: "30 days",
    },
    mailConfig: {
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
        from: process.env.EMAIL_USER,
    },

}