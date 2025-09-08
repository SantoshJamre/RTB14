const userService = require("../../services/userService");

const otpController = {
    async verifyOtp(req, res, next) {
        try {
            const { email, otp, type = 'register' } = req.body;
            if (!email || !otp) {
                return res.status(400).json({ message: 'Email and OTP are required' });
            }
             const UserService = new userService();
            
            const result = await UserService.verifyOtp(email, otp, type);
            res.status(200).json({ message: 'OTP verified successfully', data: result });
        } catch (error) {
            next(error);
        }
    },

    async resendOtp(req, res, next) {
        try {
            const { email, type = 'register' } = req.body;
            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }
            const UserService = new userService();
            
            const result = await UserService.resendOtp(email, type);
            res.status(200).json({ message: 'OTP resent successfully', data: result });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = otpController;
