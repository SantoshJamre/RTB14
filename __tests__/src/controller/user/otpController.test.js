const otpController = require('../../../../src/controller/user/otpController'); // Adjust path as needed
const userService = require('../../../../src/services/userService');

// Mock the userService
jest.mock('../../../../src/services/userService');

describe('otpController', () => {
    let req, res, next, mockUserServiceInstance, MockUserService;

    beforeEach(() => {
        // Setup request object
        req = {
            body: {}
        };

        // Setup response object
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        next = jest.fn();

        // Mock the userService class instance
        mockUserServiceInstance = {
            verifyOtp: jest.fn(),
            resendOtp: jest.fn()
        };

        MockUserService = userService;
        MockUserService.mockImplementation(() => mockUserServiceInstance);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('verifyOtp', () => {
        it('should verify OTP successfully with default type', async () => {
            req.body = {
                email: 'user@example.com',
                otp: '123456'
            };
            
            const mockResult = {
                success: true,
                message: 'User verified successfully'
            };
            mockUserServiceInstance.verifyOtp.mockResolvedValue(mockResult);

            await otpController.verifyOtp(req, res, next);

            expect(MockUserService).toHaveBeenCalledTimes(1);
            expect(mockUserServiceInstance.verifyOtp).toHaveBeenCalledWith(
                'user@example.com', 
                '123456', 
                'register'
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'OTP verified successfully',
                data: mockResult
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 400 when email or OTP is missing', async () => {
            req.body = {
                email: 'user@example.com'
                // Missing OTP
            };

            await otpController.verifyOtp(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Email and OTP are required'
            });
            expect(mockUserServiceInstance.verifyOtp).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('resendOtp', () => {
        it('should resend OTP successfully with custom type', async () => {
            req.body = {
                email: 'user@example.com',
                type: 'forgot-password'
            };
            
            const mockResult = {
                success: true,
                message: 'OTP sent to email'
            };
            mockUserServiceInstance.resendOtp.mockResolvedValue(mockResult);

            await otpController.resendOtp(req, res, next);

            expect(MockUserService).toHaveBeenCalledTimes(1);
            expect(mockUserServiceInstance.resendOtp).toHaveBeenCalledWith(
                'user@example.com',
                'forgot-password'
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'OTP resent successfully',
                data: mockResult
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should handle service errors by calling next', async () => {
            req.body = {
                email: 'user@example.com'
            };
            
            const serviceError = new Error('Email service unavailable');
            mockUserServiceInstance.resendOtp.mockRejectedValue(serviceError);

            await otpController.resendOtp(req, res, next);

            expect(mockUserServiceInstance.resendOtp).toHaveBeenCalledWith(
                'user@example.com',
                'register'
            );
            expect(next).toHaveBeenCalledWith(serviceError);
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });
    });
});
