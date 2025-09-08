const express = require('express');
const userCntrl = require("../../controller/user/index.js");
const otpController = require("../../controller/user/otpController.js");
const UserReqValidator = require("../../validators/userReqValidator.js");
const refreshToken = require("../../middleware/refreshToken.js");

const routes = express.Router();

// User registration and authentication
routes.post('/register', UserReqValidator.creatUserValidator, userCntrl.create);
routes.post('/login', UserReqValidator.loginUserValidator, userCntrl.login);

// Logout route
routes.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      logger.error('Error destroying session:', { error: err });
      return res.status(500).send({ message: 'Error logging out' });
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.redirect('/');
  });
});

// OTP verification endpoints
routes.post('/verify-otp', otpController.verifyOtp);
routes.post('/resend-otp', otpController.resendOtp);

// Refresh token endpoint
routes.get('/refresh-token', refreshToken);

// Forgot password
routes.post('/forgot-password', UserReqValidator.forgotPasswordValidator, userCntrl.forgotPassword);

module.exports = routes;