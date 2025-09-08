const UserService = require('../../../src/services/userService');
const userDB = require('../../../src/db/user/user.db.proccessor');
const util = require('../../../src/utils/util');
const emailService = require('../../../src/services/emailService');

// Mock dependencies
jest.mock('../../../src/db/user/user.db.proccessor');
jest.mock('../../../src/utils/util');
jest.mock('../../../src/services/emailService');

// Mock logger globally
global.logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

describe('UserService', () => {
    let userService;
    let mockUserDB;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create mock userDB instance
        mockUserDB = {
            get: jest.fn(),
            getByEmail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updatePassword: jest.fn(),
            delete: jest.fn()
        };

        // Mock the userDB constructor to return our mock
        userDB.mockImplementation(() => mockUserDB);
        
        userService = new UserService();
    });

    describe('getUser', () => {
        const mockUser = {
            _id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
            isVerified: true
        };

        it('should return user when found', async () => {
            mockUserDB.get.mockResolvedValue(mockUser);

            const result = await userService.getUser({ id: 'user123' });

            expect(mockUserDB.get).toHaveBeenCalledWith('user123');
            expect(result).toEqual(mockUser);
        });

        it('should throw error when database operation fails', async () => {
            const dbError = new Error('Database connection failed');
            mockUserDB.get.mockRejectedValue(dbError);

            await expect(userService.getUser({ id: 'user123' }))
                .rejects.toThrow('Database connection failed');
        });

        it('should handle null user response', async () => {
            mockUserDB.get.mockResolvedValue(null);

            const result = await userService.getUser({ id: 'user123' });

            expect(result).toBeNull();
        });
    });

    describe('createUser', () => {
        const mockUserData = {
            email: 'newuser@example.com',
            password: 'password123',
            name: 'New User'
        };

        const mockOtp = {
            otp: '123456',
            createdAt: new Date()
        };

        const mockPasswordHash = {
            hash: 'hashedpassword',
            salt: 'randomsalt'
        };

        beforeEach(() => {
            util.generateOTP.mockReturnValue(mockOtp);
            util.generatePasswordHash.mockReturnValue(mockPasswordHash);
            emailService.sendEmail.mockResolvedValue();
        });

        it('should create new user when email does not exist', async () => {
            const mockCreatedUser = {
                _id: 'user123',
                ...mockUserData,
                userPassword: mockPasswordHash,
                otpData: { ...mockOtp, type: 'register' },
                isVerified: false
            };

            mockUserDB.getByEmail.mockResolvedValue(null);
            mockUserDB.create.mockResolvedValue(mockCreatedUser);

            const result = await userService.createUser(mockUserData);

            expect(mockUserDB.getByEmail).toHaveBeenCalledWith(mockUserData.email);
            expect(util.generateOTP).toHaveBeenCalledWith(mockUserData);
            expect(util.generatePasswordHash).toHaveBeenCalledWith(mockUserData.password);
            expect(mockUserDB.create).toHaveBeenCalledWith({
                ...mockUserData,
                userPassword: mockPasswordHash,
                otpData: { ...mockOtp, type: 'register' }
            });
            expect(emailService.sendEmail).toHaveBeenCalledWith(
                mockUserData.email,
                'Your OTP for Account Verification',
                'emails/otp-email',
                { otp: mockOtp.otp }
            );
            expect(result).toEqual(mockCreatedUser);
        });

        it('should update existing unverified user', async () => {
            const existingUser = {
                _id: 'user123',
                email: mockUserData.email,
                isVerified: false
            };

            const mockUpdatedUser = {
                ...existingUser,
                otpData: { ...mockOtp, type: 'register', userPassword: mockPasswordHash }
            };

            mockUserDB.getByEmail.mockResolvedValue(existingUser);
            mockUserDB.update.mockResolvedValue(mockUpdatedUser);

            const result = await userService.createUser(mockUserData);

            expect(mockUserDB.update).toHaveBeenCalledWith(
                existingUser._id,
                { otpData: { ...mockOtp, type: 'register', userPassword: mockPasswordHash } }
            );
            expect(emailService.sendEmail).toHaveBeenCalledWith(
                mockUserData.email,
                'Your OTP for Account Verification',
                'emails/otp-email',
                { otp: mockOtp.otp }
            );
            expect(result).toEqual(mockUpdatedUser);
        });

        it('should throw error when user already exists and is verified', async () => {
            const existingUser = {
                _id: 'user123',
                email: mockUserData.email,
                isVerified: true
            };

            mockUserDB.getByEmail.mockResolvedValue(existingUser);

            await expect(userService.createUser(mockUserData))
                .rejects.toEqual({
                    message: 'User already exists',
                    code: 400
                });

            expect(logger.info).toHaveBeenCalledWith(`User found: ${existingUser.email}`);
        });

        it('should handle email sending failure gracefully', async () => {
            const mockCreatedUser = {
                _id: 'user123',
                ...mockUserData,
                email: mockUserData.email
            };

            mockUserDB.getByEmail.mockResolvedValue(null);
            mockUserDB.create.mockResolvedValue(mockCreatedUser);
            emailService.sendEmail.mockRejectedValue(new Error('Email service failed'));

            await expect(userService.createUser(mockUserData))
                .rejects.toThrow('Email service failed');

            expect(logger.error).toHaveBeenCalledWith(
                'Error in createUser:',
                expect.any(Error)
            );
        });

        it('should log when no existing user found', async () => {
            mockUserDB.getByEmail.mockResolvedValue(null);
            mockUserDB.create.mockResolvedValue({});

            await userService.createUser(mockUserData);

            expect(logger.info).toHaveBeenCalledWith('User found: Not found');
        });
    });

    describe('verifyOtp', () => {
        const mockUser = {
            _id: 'user123',
            email: 'test@example.com',
            otpData: {
                otp: '123456',
                type: 'register',
                createdAt: new Date(Date.now() - 5 * 60000), // 5 minutes ago
                userPassword: {
                    hash: 'hashedpassword',
                    salt: 'randomsalt'
                }
            },
            isVerified: false
        };

        it('should verify OTP successfully for register type', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();

            const result = await userService.verifyOtp('test@example.com', '123456', 'register');

            expect(mockUserDB.getByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockUserDB.update).toHaveBeenCalledWith(mockUser._id, {
                $unset: { otpData: 1 },
                $set: {
                    userPassword: mockUser.otpData.userPassword,
                    isVerified: true
                }
            });
            expect(result).toEqual({ success: true });
        });

        it('should verify OTP successfully for forgot-password type', async () => {
            const forgotPasswordUser = {
                ...mockUser,
                otpData: {
                    ...mockUser.otpData,
                    type: 'forgot-password'
                }
            };

            mockUserDB.getByEmail.mockResolvedValue(forgotPasswordUser);
            mockUserDB.updatePassword.mockResolvedValue();

            const result = await userService.verifyOtp('test@example.com', '123456', 'forgot-password');

            expect(mockUserDB.updatePassword).toHaveBeenCalledWith(forgotPasswordUser._id, {
                $unset: { otpData: 1 },
                $set: {
                    userPassword: forgotPasswordUser.otpData.userPassword
                }
            });
            expect(result).toEqual({ success: true });
        });

        it('should throw error when user not found', async () => {
            mockUserDB.getByEmail.mockResolvedValue(null);

            await expect(userService.verifyOtp('test@example.com', '123456'))
                .rejects.toEqual({
                    message: 'User not found',
                    code: 404
                });
        });

        it('should throw error when no OTP data exists', async () => {
            const userWithoutOtp = {
                ...mockUser,
                otpData: null
            };

            mockUserDB.getByEmail.mockResolvedValue(userWithoutOtp);

            await expect(userService.verifyOtp('test@example.com', '123456'))
                .rejects.toEqual({
                    message: 'OTP request not found',
                    code: 400
                });
        });

        it('should throw error when OTP type does not match', async () => {
            const userWithDifferentOtpType = {
                ...mockUser,
                otpData: {
                    ...mockUser.otpData,
                    type: 'forgot-password'
                }
            };

            mockUserDB.getByEmail.mockResolvedValue(userWithDifferentOtpType);

            await expect(userService.verifyOtp('test@example.com', '123456', 'register'))
                .rejects.toEqual({
                    message: 'OTP request not found',
                    code: 400
                });
        });

        it('should throw error when OTP has expired', async () => {
            const userWithExpiredOtp = {
                ...mockUser,
                otpData: {
                    ...mockUser.otpData,
                    createdAt: new Date(Date.now() - 15 * 60000) // 15 minutes ago (expired)
                }
            };

            mockUserDB.getByEmail.mockResolvedValue(userWithExpiredOtp);

            await expect(userService.verifyOtp('test@example.com', '123456'))
                .rejects.toEqual({
                    message: 'OTP has expired',
                    code: 400
                });
        });

        it('should throw error when OTP is invalid', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);

            await expect(userService.verifyOtp('test@example.com', '654321'))
                .rejects.toEqual({
                    message: 'Invalid OTP',
                    code: 400
                });
        });

        it('should handle register type without userPassword', async () => {
            const userWithoutPassword = {
                ...mockUser,
                otpData: {
                    ...mockUser.otpData,
                    userPassword: null
                }
            };

            mockUserDB.getByEmail.mockResolvedValue(userWithoutPassword);
            mockUserDB.update.mockResolvedValue();

            const result = await userService.verifyOtp('test@example.com', '123456', 'register');

            expect(mockUserDB.update).toHaveBeenCalledWith(userWithoutPassword._id, {
                $unset: { otpData: 1 },
                $set: { isVerified: true }
            });
            expect(result).toEqual({ success: true });
        });
    });

    describe('resendOtp', () => {
        const mockUser = {
            _id: 'user123',
            email: 'test@example.com',
            isVerified: false
        };

        const mockOtp = {
            otp: '654321',
            createdAt: new Date()
        };

        beforeEach(() => {
            util.generateOTP.mockReturnValue(mockOtp);
            emailService.sendEmail.mockResolvedValue();
        });

        it('should resend OTP successfully for register type', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();

            const result = await userService.resendOtp('test@example.com', 'register');

            expect(mockUserDB.getByEmail).toHaveBeenCalledWith('test@example.com');
            expect(util.generateOTP).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(mockUserDB.update).toHaveBeenCalledWith(mockUser._id, {
                otpData: {
                    ...mockOtp,
                    type: 'register',
                    updatedAt: expect.any(Date)
                }
            });
            expect(emailService.sendEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Your OTP for Account Verification',
                'emails/otp-email',
                { otp: mockOtp.otp }
            );
            expect(result).toEqual({ success: true });
        });

        it('should resend OTP successfully for forgot-password type', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();

            const result = await userService.resendOtp('test@example.com', 'forgot-password');

            expect(mockUserDB.update).toHaveBeenCalledWith(mockUser._id, {
                otpData: {
                    ...mockOtp,
                    type: 'forgot-password',
                    updatedAt: expect.any(Date)
                }
            });
            expect(emailService.sendEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Your OTP for Password Reset',
                'emails/otp-email',
                { otp: mockOtp.otp }
            );
            expect(result).toEqual({ success: true });
        });

        it('should use default register type when type not specified', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();

            await userService.resendOtp('test@example.com');

            expect(mockUserDB.update).toHaveBeenCalledWith(mockUser._id, {
                otpData: {
                    ...mockOtp,
                    type: 'register',
                    updatedAt: expect.any(Date)
                }
            });
            expect(emailService.sendEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Your OTP for Account Verification',
                'emails/otp-email',
                { otp: mockOtp.otp }
            );
        });

        it('should throw error when user not found', async () => {
            mockUserDB.getByEmail.mockResolvedValue(null);

            await expect(userService.resendOtp('test@example.com'))
                .rejects.toEqual({
                    message: 'User not found',
                    code: 404
                });

            expect(mockUserDB.update).not.toHaveBeenCalled();
            expect(emailService.sendEmail).not.toHaveBeenCalled();
        });

        it('should throw error when email service fails', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();
            emailService.sendEmail.mockRejectedValue(new Error('Email service failed'));

            await expect(userService.resendOtp('test@example.com'))
                .rejects.toThrow('Email service failed');
        });
    });

    describe('updateUser', () => {
        const updateData = {
            name: 'Updated Name',
            phone: '1234567890'
        };

        const mockUpdatedUser = {
            _id: 'user123',
            email: 'test@example.com',
            name: 'Updated Name',
            phone: '1234567890'
        };

        it('should update user successfully', async () => {
            mockUserDB.update.mockResolvedValue(mockUpdatedUser);

            const result = await userService.updateUser('user123', updateData);

            expect(mockUserDB.update).toHaveBeenCalledWith('user123', updateData);
            expect(result).toEqual(mockUpdatedUser);
        });

        it('should throw error when update operation fails', async () => {
            const updateError = new Error('Update failed');
            mockUserDB.update.mockRejectedValue(updateError);

            await expect(userService.updateUser('user123', updateData))
                .rejects.toThrow('Update failed');

            expect(logger.error).toHaveBeenCalledWith(
                'Error in createUser:',
                updateError
            );
        });
    });

    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            const mockDeleteResult = { deletedCount: 1 };
            mockUserDB.delete.mockResolvedValue(mockDeleteResult);

            const result = await userService.deleteUser('user123');

            expect(mockUserDB.delete).toHaveBeenCalledWith('user123');
            expect(result).toEqual(mockDeleteResult);
        });

        it('should throw error when delete operation fails', async () => {
            const deleteError = new Error('Delete failed');
            mockUserDB.delete.mockRejectedValue(deleteError);

            await expect(userService.deleteUser('user123'))
                .rejects.toThrow('Delete failed');

            expect(logger.error).toHaveBeenCalledWith(
                'Error in delete user:',
                deleteError
            );
        });
    });

    describe('loginUser', () => {
        const loginData = {
            email: 'test@example.com',
            password: 'password123'
        };

        const mockUser = {
            _id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
            isVerified: true,
            userPassword: {
                hash: 'hashedpassword',
                salt: 'randomsalt'
            }
        };

        const mockFormattedUser = {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User'
        };

        it('should login user successfully with valid credentials', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            util.verifyPassword.mockReturnValue(true);
            util.responseFormate.mockReturnValue(mockFormattedUser);

            const result = await userService.loginUser(loginData);

            expect(mockUserDB.getByEmail).toHaveBeenCalledWith(loginData.email, { isVerified: true });
            expect(util.verifyPassword).toHaveBeenCalledWith({
                hash: mockUser.userPassword.hash,
                salt: mockUser.userPassword.salt,
                password: loginData.password
            });
            expect(util.responseFormate).toHaveBeenCalledWith(mockUser);
            expect(result).toEqual(mockFormattedUser);
        });

        it('should throw error when user not found', async () => {
            mockUserDB.getByEmail.mockResolvedValue(null);

            await expect(userService.loginUser(loginData))
                .rejects.toEqual({
                    message: 'User not found, Please register first',
                    code: 404
                });

            expect(util.verifyPassword).not.toHaveBeenCalled();
        });

        it('should throw error when password is invalid', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            util.verifyPassword.mockReturnValue(false);

            await expect(userService.loginUser(loginData))
                .rejects.toEqual({
                    message: 'Invalid password',
                    code: 400
                });

            expect(util.responseFormate).not.toHaveBeenCalled();
        });

        it('should throw error when database operation fails', async () => {
            const dbError = new Error('Database error');
            mockUserDB.getByEmail.mockRejectedValue(dbError);

            await expect(userService.loginUser(loginData))
                .rejects.toThrow('Database error');
        });
    });

    describe('forgotPassword', () => {
        const forgotPasswordData = {
            email: 'test@example.com',
            password: 'newpassword123'
        };

        const mockUser = {
            _id: 'user123',
            email: 'test@example.com',
            isVerified: true
        };

        const mockOtp = {
            otp: '789012',
            createdAt: new Date()
        };

        const mockPasswordHash = {
            hash: 'newhashedpassword',
            salt: 'newsalt'
        };

        beforeEach(() => {
            util.generateOTP.mockReturnValue(mockOtp);
            util.generatePasswordHash.mockReturnValue(mockPasswordHash);
            emailService.sendEmail.mockResolvedValue();
        });

        it('should initiate forgot password process successfully', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();

            const result = await userService.forgotPassword(forgotPasswordData);

            expect(mockUserDB.getByEmail).toHaveBeenCalledWith(
                forgotPasswordData.email,
                { isVerified: true }
            );
            expect(util.generatePasswordHash).toHaveBeenCalledWith(forgotPasswordData.password);
            expect(util.generateOTP).toHaveBeenCalledWith(forgotPasswordData);
            expect(mockUserDB.update).toHaveBeenCalledWith(mockUser._id, {
                otpData: {
                    ...mockOtp,
                    type: 'forgot-password',
                    userPassword: mockPasswordHash
                }
            });
            expect(emailService.sendEmail).toHaveBeenCalledWith(
                forgotPasswordData.email,
                'Your OTP for Password Reset',
                'emails/otp-email',
                { otp: mockOtp.otp }
            );
            expect(result).toEqual({ success: true });
        });

        it('should throw error when user not found', async () => {
            mockUserDB.getByEmail.mockResolvedValue(null);

            await expect(userService.forgotPassword(forgotPasswordData))
                .rejects.toEqual({
                    message: 'User not found',
                    code: 404
                });

            expect(mockUserDB.update).not.toHaveBeenCalled();
            expect(emailService.sendEmail).not.toHaveBeenCalled();
        });

        it('should throw error when email service fails', async () => {
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();
            emailService.sendEmail.mockRejectedValue(new Error('Email service failed'));

            await expect(userService.forgotPassword(forgotPasswordData))
                .rejects.toThrow('Email service failed');
        });

        it('should throw error when database update fails', async () => {
            const updateError = new Error('Database update failed');
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockRejectedValue(updateError);

            await expect(userService.forgotPassword(forgotPasswordData))
                .rejects.toThrow('Database update failed');
        });
    });

    describe('Constructor and instance methods', () => {
        it('should create userDB instance in constructor', () => {
            const newUserService = new UserService();
            expect(userDB).toHaveBeenCalled();
            expect(newUserService.userDB).toBeDefined();
        });
    });

    describe('Integration scenarios', () => {
        it('should handle complete user registration flow', async () => {
            const userData = {
                email: 'newuser@example.com',
                password: 'password123',
                name: 'New User'
            };

            const mockOtp = { otp: '123456', createdAt: new Date() };
            const mockPasswordHash = { hash: 'hash', salt: 'salt' };
            const mockCreatedUser = { _id: 'user123', ...userData };

            // Mock createUser flow
            mockUserDB.getByEmail.mockResolvedValueOnce(null);
            util.generateOTP.mockReturnValue(mockOtp);
            util.generatePasswordHash.mockReturnValue(mockPasswordHash);
            mockUserDB.create.mockResolvedValue(mockCreatedUser);
            emailService.sendEmail.mockResolvedValue();

            await userService.createUser(userData);

            // Mock verifyOtp flow
            const userWithOtp = {
                ...mockCreatedUser,
                otpData: {
                    ...mockOtp,
                    type: 'register',
                    userPassword: mockPasswordHash
                }
            };

            mockUserDB.getByEmail.mockResolvedValueOnce(userWithOtp);
            mockUserDB.update.mockResolvedValue();

            const verifyResult = await userService.verifyOtp(userData.email, '123456', 'register');

            expect(verifyResult).toEqual({ success: true });
        });

        it('should handle complete forgot password flow', async () => {
            const email = 'user@example.com';
            const newPassword = 'newpassword123';
            const mockUser = { _id: 'user123', email, isVerified: true };
            const mockOtp = { otp: '789012', createdAt: new Date() };
            const mockPasswordHash = { hash: 'newhash', salt: 'newsalt' };

            // Mock forgotPassword flow
            mockUserDB.getByEmail.mockResolvedValueOnce(mockUser);
            util.generatePasswordHash.mockReturnValue(mockPasswordHash);
            util.generateOTP.mockReturnValue(mockOtp);
            mockUserDB.update.mockResolvedValue();
            emailService.sendEmail.mockResolvedValue();

            await userService.forgotPassword({ email, password: newPassword });

            // Mock verifyOtp flow for forgot-password
            const userWithForgotOtp = {
                ...mockUser,
                otpData: {
                    ...mockOtp,
                    type: 'forgot-password',
                    userPassword: mockPasswordHash
                }
            };

            mockUserDB.getByEmail.mockResolvedValueOnce(userWithForgotOtp);
            mockUserDB.updatePassword.mockResolvedValue();

            const verifyResult = await userService.verifyOtp(email, '789012', 'forgot-password');

            expect(verifyResult).toEqual({ success: true });
            expect(mockUserDB.updatePassword).toHaveBeenCalledWith(mockUser._id, {
                $unset: { otpData: 1 },
                $set: { userPassword: mockPasswordHash }
            });
        });
    });

    describe('Error handling and edge cases', () => {
        it('should handle malformed user data in createUser', async () => {
            const malformedData = {
                email: 'invalid-email',
                password: null
            };

            const utilError = new Error('Invalid password');
            util.generatePasswordHash.mockImplementation(() => {
                throw utilError;
            });

            await expect(userService.createUser(malformedData))
                .rejects.toThrow('Invalid password');

            expect(logger.error).toHaveBeenCalledWith(
                'Error in createUser:',
                utilError
            );
        });

        it('should handle concurrent OTP verification attempts', async () => {
            const mockUser = {
                _id: 'user123',
                email: 'test@example.com',
                otpData: {
                    otp: '123456',
                    type: 'register',
                    createdAt: new Date(Date.now() - 1000), // 1 second ago
                    userPassword: { hash: 'hash', salt: 'salt' }
                }
            };

            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();

            // Simulate concurrent requests
            const promises = [
                userService.verifyOtp('test@example.com', '123456', 'register'),
                userService.verifyOtp('test@example.com', '123456', 'register')
            ];

            const results = await Promise.all(promises);

            expect(results).toEqual([{ success: true }, { success: true }]);
            expect(mockUserDB.update).toHaveBeenCalledTimes(2);
        });

        it('should handle database connection timeout in various methods', async () => {
            const timeoutError = new Error('Connection timeout');

            // Test timeout in different methods
            mockUserDB.getByEmail.mockRejectedValue(timeoutError);

            await expect(userService.loginUser({ email: 'test@example.com', password: 'pass' }))
                .rejects.toThrow('Connection timeout');

            await expect(userService.resendOtp('test@example.com'))
                .rejects.toThrow('Connection timeout');

            await expect(userService.forgotPassword({ email: 'test@example.com', password: 'newpass' }))
                .rejects.toThrow('Connection timeout');
        });
    });

    describe('Method parameter validation', () => {
        it('should handle missing parameters gracefully', async () => {
            // Test getUser with undefined id
            mockUserDB.get.mockResolvedValue(null);
            const result = await userService.getUser({});
            expect(mockUserDB.get).toHaveBeenCalledWith(undefined);

            // Test verifyOtp with missing parameters
            mockUserDB.getByEmail.mockResolvedValue(null);
            await expect(userService.verifyOtp('', '', 'register'))
                .rejects.toEqual({
                    message: 'User not found',
                    code: 404
                });
        });

        it('should handle empty objects and null values', async () => {
            mockUserDB.update.mockResolvedValue({});

            await userService.updateUser('user123', {});

            expect(mockUserDB.update).toHaveBeenCalledWith('user123', {});
        });
    });

    describe('OTP expiry edge cases', () => {
        it('should handle OTP just before expiry', async () => {
            const justBeforeExpiry = new Date(Date.now() - 9 * 60000 - 59000); // 9 minutes 59 seconds ago
            const mockUser = {
                _id: 'user123',
                email: 'test@example.com',
                otpData: {
                    otp: '123456',
                    type: 'register',
                    createdAt: justBeforeExpiry,
                    userPassword: { hash: 'hash', salt: 'salt' }
                }
            };

            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();

            const result = await userService.verifyOtp('test@example.com', '123456', 'register');

            expect(result).toEqual({ success: true });
        });
    });

    describe('Email service integration', () => {
        it('should send correct email templates for different OTP types', async () => {
            const mockUser = { _id: 'user123', email: 'test@example.com' };
            const mockOtp = { otp: '123456', createdAt: new Date() };

            util.generateOTP.mockReturnValue(mockOtp);
            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockResolvedValue();
            emailService.sendEmail.mockResolvedValue();

            // Test register type
            await userService.resendOtp('test@example.com', 'register');
            expect(emailService.sendEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Your OTP for Account Verification',
                'emails/otp-email',
                { otp: '123456' }
            );

            jest.clearAllMocks();
            emailService.sendEmail.mockResolvedValue();

            // Test forgot-password type
            await userService.resendOtp('test@example.com', 'forgot-password');
            expect(emailService.sendEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Your OTP for Password Reset',
                'emails/otp-email',
                { otp: '123456' }
            );
        });
    });

    describe('Password handling', () => {
        it('should properly hash passwords in createUser', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'plainpassword'
            };

            const mockPasswordHash = { hash: 'hashedvalue', salt: 'saltvalue' };
            const mockOtp = { otp: '123456', createdAt: new Date() };

            mockUserDB.getByEmail.mockResolvedValue(null);
            util.generatePasswordHash.mockReturnValue(mockPasswordHash);
            util.generateOTP.mockReturnValue(mockOtp);
            mockUserDB.create.mockResolvedValue({});
            emailService.sendEmail.mockResolvedValue();

            await userService.createUser(userData);

            expect(util.generatePasswordHash).toHaveBeenCalledWith('plainpassword');
            expect(mockUserDB.create).toHaveBeenCalledWith({
                ...userData,
                userPassword: mockPasswordHash,
                otpData: { ...mockOtp, type: 'register' }
            });
        });

        it('should properly verify passwords in loginUser', async () => {
            const loginData = { email: 'test@example.com', password: 'userpassword' };
            const mockUser = {
                _id: 'user123',
                email: 'test@example.com',
                userPassword: { hash: 'storedHash', salt: 'storedSalt' },
                isVerified: true
            };

            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            util.verifyPassword.mockReturnValue(true);
            util.responseFormate.mockReturnValue({});

            await userService.loginUser(loginData);

            expect(util.verifyPassword).toHaveBeenCalledWith({
                hash: 'storedHash',
                salt: 'storedSalt',
                password: 'userpassword'
            });
        });
    });

    describe('Logging verification', () => {
        it('should log appropriate messages during user operations', async () => {
            // Test logging in createUser when user exists
            const existingUser = { email: 'existing@example.com', isVerified: false };
            mockUserDB.getByEmail.mockResolvedValue(existingUser);
            mockUserDB.update.mockResolvedValue({});
            util.generateOTP.mockReturnValue({ otp: '123456', createdAt: new Date() });
            util.generatePasswordHash.mockReturnValue({ hash: 'hash', salt: 'salt' });
            emailService.sendEmail.mockResolvedValue();

            await userService.createUser({ email: 'existing@example.com', password: 'pass' });

            expect(logger.info).toHaveBeenCalledWith('User found: existing@example.com');

            // Test error logging in updateUser
            jest.clearAllMocks();
            const updateError = new Error('Update failed');
            mockUserDB.update.mockRejectedValue(updateError);

            await expect(userService.updateUser('user123', {}))
                .rejects.toThrow('Update failed');

            expect(logger.error).toHaveBeenCalledWith('Error in createUser:', updateError);
        });
    });

    describe('Database query parameters', () => {
        it('should pass correct parameters to database methods', async () => {
            // Test getByEmail with filter parameters
            const mockUser = { _id: 'user123', isVerified: true };
            mockUserDB.getByEmail.mockResolvedValue(mockUser);

            await userService.loginUser({ email: 'test@example.com', password: 'pass' });

            expect(mockUserDB.getByEmail).toHaveBeenCalledWith(
                'test@example.com',
                { isVerified: true }
            );

            // Test update with complex data
            jest.clearAllMocks();
            const complexUpdateData = {
                $set: { name: 'New Name', phone: '123456' },
                $unset: { oldField: 1 }
            };

            mockUserDB.update.mockResolvedValue({});
            await userService.updateUser('user123', complexUpdateData);

            expect(mockUserDB.update).toHaveBeenCalledWith('user123', complexUpdateData);
        });
    });

    describe('Async error propagation', () => {
        it('should properly propagate async errors from nested operations', async () => {
            const nestedError = new Error('Nested operation failed');
            
            // Test error propagation in createUser -> emailService
            mockUserDB.getByEmail.mockResolvedValue(null);
            util.generateOTP.mockReturnValue({ otp: '123456', createdAt: new Date() });
            util.generatePasswordHash.mockReturnValue({ hash: 'hash', salt: 'salt' });
            mockUserDB.create.mockResolvedValue({ email: 'test@example.com' });
            emailService.sendEmail.mockRejectedValue(nestedError);

            await expect(userService.createUser({ email: 'test@example.com', password: 'pass' }))
                .rejects.toThrow('Nested operation failed');

            // Test error propagation in verifyOtp -> userDB.update
            jest.clearAllMocks();
            const mockUser = {
                _id: 'user123',
                email: 'test@example.com',
                otpData: {
                    otp: '123456',
                    type: 'register',
                    createdAt: new Date(),
                    userPassword: { hash: 'hash', salt: 'salt' }
                }
            };

            mockUserDB.getByEmail.mockResolvedValue(mockUser);
            mockUserDB.update.mockRejectedValue(nestedError);

            await expect(userService.verifyOtp('test@example.com', '123456', 'register'))
                .rejects.toThrow('Nested operation failed');
        });
    });
});