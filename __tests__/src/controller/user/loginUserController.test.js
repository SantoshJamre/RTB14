const loginUserController = require('../../../../src/controller/user/loginUserController'); // Adjust path as needed
const userService = require('../../../../src/services/userService');
const logger = require('../../../../src/utils/logger'); // Adjust path as needed

// Mock the userService
jest.mock('../../../../src/services/userService');

// Mock the dependencies
jest.mock('../../../../src/utils/logger');

describe('loginUserController middleware', () => {
    let req, res, next, mockUserServiceInstance, MockUserService;

    beforeEach(() => {
        // Setup request object with session mock
        req = {
            locals: {
                value: {
                    email: 'user@example.com',
                    password: 'password123'
                }
            },
            session: {
                save: jest.fn()
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
            loginUser: jest.fn()
        };

        MockUserService = userService;
        MockUserService.mockImplementation(() => mockUserServiceInstance);

        // Mock logger
        logger.error = jest.fn();

        // Clear environment variable
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.NODE_ENV;
    });

    it('should login user successfully, save session, and return 200 with redirect', async () => {
        const mockResult = {
            success: true,
            userId: 'user123',
            token: 'jwt-token'
        };
        mockUserServiceInstance.loginUser.mockResolvedValue(mockResult);
        req.session.save.mockImplementation((callback) => callback(null));

        await loginUserController(req, res, next);

        expect(MockUserService).toHaveBeenCalledTimes(1);
        expect(mockUserServiceInstance.loginUser).toHaveBeenCalledWith({
            email: 'user@example.com',
            password: 'password123'
        });
        expect(req.session.user).toEqual({
            id: 'user123',
            email: 'user@example.com'
        });
        expect(req.session.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            userId: 'user123',
            token: 'jwt-token',
            email: 'user@example.com',
            redirectTo: '/books'
        });
    });

    it('should handle service error with code and message', async () => {
        const serviceError = {
            code: 401,
            message: 'Invalid credentials'
        };
        mockUserServiceInstance.loginUser.mockRejectedValue(serviceError);

        await loginUserController(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
            code: 401,
            message: 'Invalid credentials'
        });
        expect(req.session.save).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle session save error and return 500 in development mode', async () => {
        process.env.NODE_ENV = 'development';
        const mockResult = { success: true, userId: 'user123' };
        mockUserServiceInstance.loginUser.mockResolvedValue(mockResult);
        
        const sessionError = new Error('Session save failed');
        req.session.save.mockImplementation((callback) => callback(sessionError));

        await loginUserController(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            message: 'Internal Server Error',
            error: 'Session save failed'
        });
    });

    it('should handle unexpected error in production mode', async () => {
        process.env.NODE_ENV = 'production';
        const unexpectedError = new Error('Database connection failed');
        mockUserServiceInstance.loginUser.mockRejectedValue(unexpectedError);

        await loginUserController(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            message: 'Internal Server Error',
            error: undefined
        });
    });
});
