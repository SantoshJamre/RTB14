const forgotPasswordController = require('../../../../src/controller/user/forgotPasswordController'); // Adjust path as needed
const userService = require('../../../../src/services/userService');

// Mock the userService
jest.mock('../../../../src/services/userService');


describe('forgotPasswordController middleware', () => {
    let req, res, next, mockUserServiceInstance, MockUserService;

    beforeEach(() => {
        // Setup request object
        req = {
            locals: {
                value: {
                    email: 'user@example.com'
                }
            }
        };

        // Setup response object
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        next = jest.fn();

        // Mock the userService class instance
        mockUserServiceInstance = {
            forgotPassword: jest.fn()
        };

        MockUserService = userService;
        MockUserService.mockImplementation(() => mockUserServiceInstance);

        // Mock console.error
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Clear environment variable
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.NODE_ENV;
    });

    it('should process forgot password successfully and return 200 with email', async () => {
        const mockResult = {
            success: true,
            message: 'Password reset email sent',
            resetToken: 'abc123'
        };
        mockUserServiceInstance.forgotPassword.mockResolvedValue(mockResult);

        await forgotPasswordController(req, res, next);

        expect(MockUserService).toHaveBeenCalledTimes(1);
        expect(mockUserServiceInstance.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: 'Password reset email sent',
            resetToken: 'abc123',
            email: 'user@example.com'
        });
    });

    it('should handle service error with code and message', async () => {
        const serviceError = {
            code: 404,
            message: 'User not found'
        };
        mockUserServiceInstance.forgotPassword.mockRejectedValue(serviceError);

        await forgotPasswordController(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            code: 404,
            message: 'User not found'
        });
        expect(console.error).not.toHaveBeenCalled();
    });

    it('should handle unexpected error in development mode', async () => {
        process.env.NODE_ENV = 'development';
        const unexpectedError = new Error('Email service unavailable');
        mockUserServiceInstance.forgotPassword.mockRejectedValue(unexpectedError);

        await forgotPasswordController(req, res, next);

        expect(console.error).toHaveBeenCalledWith(
            'Error in forgotPasswordController:',
            unexpectedError.stack
        );
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            message: 'Internal Server Error',
            error: 'Email service unavailable'
        });
    });

    it('should handle missing email in value and production mode error', async () => {
        process.env.NODE_ENV = 'production';
        req.locals.value = {}; // No email
        const unexpectedError = new Error('Network timeout');
        mockUserServiceInstance.forgotPassword.mockRejectedValue(unexpectedError);

        await forgotPasswordController(req, res, next);

        expect(res.send).toHaveBeenCalledWith({
            message: 'Internal Server Error',
            error: undefined
        });
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
