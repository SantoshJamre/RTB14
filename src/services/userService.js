
const userDB = require('../db/user/user.db.proccessor');
const util = require('../utils/util');
const emailService = require('./emailService');

class userService {
    constructor() {
        this.userDB = new userDB()
    }

    async getUser({ id }) {
        try {
            const user = await this.userDB.get(id);
            return user;
        } catch (error) {
            throw error;
        }
    }

    async createUser(userData) {
        try {

            const user = await this.userDB.getByEmail(userData.email);
            logger.info(`User found: ${user ? user.email : 'Not found'}`)
            if (user?.isVerified) {
                throw { message: 'User already exists', code: 400 };
            }

            const otp = util.generateOTP(userData);
            let newUser;

            const { hash, salt } = util.generatePasswordHash(userData.password);
            const userPassword = { hash, salt };

            if (user && !user.isVerified) {
                newUser = await this.userDB.update(user._id, { otpData: { ...otp, type: 'register', userPassword } });
            } else {
                userData.userPassword = { hash, salt };
                userData.otpData = { ...otp, type: 'register' };
                newUser = await this.userDB.create(userData);
            }


            // Send OTP email
            await emailService.sendEmail(
                newUser.email,
                'Your OTP for Account Verification',
                'emails/otp-email',
                { otp: otp.otp }
            );

            return newUser;
        } catch (error) {
            logger.error('Error in createUser:', error)
            throw error;
        }
    }

    async verifyOtp(email, otp, type = 'register') {
        try {
            const user = await this.userDB.getByEmail(email);
            if (!user) {
                throw { message: 'User not found', code: 404 };
            }

            if (!user.otpData || user.otpData.type !== type) {
                throw { message: 'OTP request not found', code: 400 };
            }

            const now = new Date();
            const otpExpiry = new Date(user.otpData.createdAt.getTime() + 10 * 60000); // 10 minutes expiry

            if (now > otpExpiry) {
                throw { message: 'OTP has expired', code: 400 };
            }

            if (user.otpData.otp !== otp) {
                throw { message: 'Invalid OTP', code: 400 };
            }

            // Prepare update data
            const updateData = {
                $unset: { otpData: 1 }
            };

            // For register and forgot-password flows, update the password
            if ((type === 'register' || type === 'forgot-password') && user.otpData.userPassword) {
                updateData.$set = {
                    userPassword: user.otpData.userPassword
                };

                // For register flow, also mark as verified
                if (type === 'register') {
                    updateData.$set.isVerified = true;
                }
            } else if (type === 'register') {
                // For register without password (shouldn't happen, but just in case)
                updateData.$set = { isVerified: true };
            }

            if (type === 'register') {
                await this.userDB.update(user._id, updateData);
            } else if (type === 'forgot-password') {
                await this.userDB.updatePassword(user._id, updateData);
            }
            // Apply the updates

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    async resendOtp(email, type = 'register') {
        try {
            const user = await this.userDB.getByEmail(email);
            if (!user) {
                throw { message: 'User not found', code: 404 };
            }

            const otp = util.generateOTP({ email });
            await this.userDB.update(user._id, {
                otpData: {
                    ...otp,
                    type,
                    updatedAt: new Date()
                }
            });

            // Send OTP email
            await emailService.sendEmail(
                email,
                type === 'register'
                    ? 'Your OTP for Account Verification'
                    : 'Your OTP for Password Reset',
                'emails/otp-email',
                { otp: otp.otp }
            );

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    async updateUser(id, userData) {
        try {
            return await this.userDB.update(id, userData);

        } catch (error) {
            logger.error('Error in createUser:', error)
            throw error
        }
    }

    async deleteUser(id) {
        try {
            return await this.userDB.delete(id);
        } catch (error) {
            logger.error('Error in delete user:', error)
            throw error
        }
    }

    async loginUser(userData) {
        try {
            const user = await this.userDB.getByEmail(userData.email, { isVerified: true });
            if (!user) {
                throw { message: 'User not found, Please register first', code: 404 };
            }

            const isPasswordValid = util.verifyPassword({ hash: user.userPassword?.hash, salt: user.userPassword?.salt, password: userData.password });
            if (!isPasswordValid) {
                throw { message: 'Invalid password', code: 400 };
            }

            return util.responseFormate(user)
        } catch (error) {
            throw error;
        }
    }

    async forgotPassword(userData) {
        try {
            const user = await this.userDB.getByEmail(userData.email, { isVerified: true });
            if (!user) {
                throw { message: 'User not found', code: 404 };
            }

            const { hash, salt } = util.generatePasswordHash(userData.password);
            const userPassword = { hash, salt };

            const otp = util.generateOTP(userData);
            await this.userDB.update(user._id, { otpData: { ...otp, type: 'forgot-password', userPassword } });

            // Send OTP email
            await emailService.sendEmail(
                userData.email,
                'Your OTP for Password Reset',
                'emails/otp-email',
                { otp: otp.otp }
            );

            return { success: true };
        } catch (error) {
            throw error;
        }
    }
}



module.exports = userService;