const getUserController = require('../../../../src/controller/user/getUserController'); // Adjust path as needed
const userService = require('../../../../src/services/userService');

// Mock the userService
jest.mock('../../../../src/services/userService');

describe('getUserController middleware', () => {
    let req, res, next, mockUserServiceInstance, MockUserService;

    beforeEach(() => {
        // Setup request object
        req = {
            locals: {
                value: {
                    userId: '12345',
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
            getUser: jest.fn()
        };

        MockUserService = userService;
        MockUserService.mockImplementation(() => mockUserServiceInstance);

        // Mock console.error
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should get user successfully and return 200', async () => {
        const mockResult = {
            success: true,
            user: {
                id: '12345',
                email: 'user@example.com',
                username: 'testuser'
            }
        };
        mockUserServiceInstance.getUser.mockResolvedValue(mockResult);

        await getUserController(req, res, next);

        expect(MockUserService).toHaveBeenCalledTimes(1);
        expect(mockUserServiceInstance.getUser).toHaveBeenCalledWith({
            userId: '12345',
            email: 'user@example.com'
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockResult);
    });

    it('should handle service error with code and message', async () => {
        const serviceError = {
            code: 404,
            message: 'User not found'
        };
        mockUserServiceInstance.getUser.mockRejectedValue(serviceError);

        await getUserController(req, res, next);

        expect(console.error).toHaveBeenCalledWith(serviceError);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            code: 404,
            message: 'User not found'
        });
    });

    it('should handle unexpected error and return 500', async () => {
        const unexpectedError = new Error('Database connection failed');
        mockUserServiceInstance.getUser.mockRejectedValue(unexpectedError);

        await getUserController(req, res, next);

        expect(console.error).toHaveBeenCalledWith(unexpectedError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            message: 'Internan Server error'
        });
    });

    it('should handle missing value from req.locals', async () => {
        req.locals = {}; // Empty locals
        const unexpectedError = new Error('Cannot read property of undefined');
        mockUserServiceInstance.getUser.mockRejectedValue(unexpectedError);

        await getUserController(req, res, next);

        expect(mockUserServiceInstance.getUser).toHaveBeenCalledWith(undefined);
        expect(console.error).toHaveBeenCalledWith(unexpectedError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            message: 'Internan Server error'
        });
    });
});
