const createUserController = require('../../../../src/controller/user/createUserController'); // Adjust path as needed
const userService = require('../../../../src/services/userService');

// Mock the userService
jest.mock('../../../../src/services/userService');

describe('createUserController middleware', () => {
    let req, res, next, mockUserServiceInstance, MockUserService;

    beforeEach(() => {
        // Setup request object
        req = {
            locals: {
                value: {
                    email: 'test@example.com',
                    username: 'testuser',
                    password: 'password123'
                }
            }
        };

        // Setup response object with Jest mocks
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        // Setup next function
        next = jest.fn();

        // Mock the userService class instance
        mockUserServiceInstance = {
            createUser: jest.fn()
        };

        // Mock the userService constructor
        MockUserService = userService;
        MockUserService.mockImplementation(() => mockUserServiceInstance);

        // Mock console.error to avoid noise in test output
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Clear environment variable
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.NODE_ENV;
    });

    describe('successful user creation', () => {
        it('should create user successfully and return 200 with email included', async () => {
            const mockResult = {
                success: true,
                userId: '12345',
                message: 'User created successfully'
            };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);

            expect(MockUserService).toHaveBeenCalledTimes(1);
            expect(mockUserServiceInstance.createUser).toHaveBeenCalledWith(req.locals.value);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                userId: '12345',
                message: 'User created successfully',
                email: 'test@example.com'
            });
        });

        it('should spread all result properties and add email', async () => {
            const mockResult = {
                success: true,
                userId: '67890',
                token: 'abc123',
                expiresIn: '24h'
            };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);

            expect(res.send).toHaveBeenCalledWith({
                success: true,
                userId: '67890',
                token: 'abc123',
                expiresIn: '24h',
                email: 'test@example.com'
            });
        });

        it('should handle different email formats', async () => {
            req.locals.value.email = 'user.name+test@domain.co.uk';
            const mockResult = { success: true };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);

            expect(res.send).toHaveBeenCalledWith({
                success: true,
                email: 'user.name+test@domain.co.uk'
            });
        });
    });

    describe('service error handling', () => {
        it('should handle service error with code and message', async () => {
            const serviceError = {
                code: 409,
                message: 'User already exists'
            };
            mockUserServiceInstance.createUser.mockRejectedValue(serviceError);

            await createUserController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.send).toHaveBeenCalledWith({
                code: 409,
                message: 'User already exists'
            });
            expect(console.error).not.toHaveBeenCalled();
        });

        it('should handle service error with different status codes', async () => {
            const serviceError = {
                code: 400,
                message: 'Invalid email format'
            };
            mockUserServiceInstance.createUser.mockRejectedValue(serviceError);

            await createUserController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                code: 400,
                message: 'Invalid email format'
            });
        });

      
    });

    describe('unexpected error handling', () => {
        it('should handle unexpected error in production mode', async () => {
            process.env.NODE_ENV = 'production';
            const unexpectedError = new Error('Database connection failed');
            mockUserServiceInstance.createUser.mockRejectedValue(unexpectedError);

            await createUserController(req, res, next);

            expect(console.error).toHaveBeenCalledWith(
                'Error in createUserController:',
                unexpectedError.stack
            );
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Internal Server Error',
                error: undefined
            });
        });

        it('should handle unexpected error in development mode', async () => {
            process.env.NODE_ENV = 'development';
            const unexpectedError = new Error('Database connection failed');
            mockUserServiceInstance.createUser.mockRejectedValue(unexpectedError);

            await createUserController(req, res, next);

            expect(console.error).toHaveBeenCalledWith(
                'Error in createUserController:',
                unexpectedError.stack
            );
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Internal Server Error',
                error: 'Database connection failed'
            });
        });

        it('should handle error without NODE_ENV set', async () => {
            const unexpectedError = new Error('Network timeout');
            mockUserServiceInstance.createUser.mockRejectedValue(unexpectedError);

            await createUserController(req, res, next);

            expect(res.send).toHaveBeenCalledWith({
                message: 'Internal Server Error',
                error: undefined
            });
        });

        it('should handle error with empty message', async () => {
            process.env.NODE_ENV = 'development';
            const unexpectedError = new Error('');
            mockUserServiceInstance.createUser.mockRejectedValue(unexpectedError);

            await createUserController(req, res, next);

            expect(res.send).toHaveBeenCalledWith({
                message: 'Internal Server Error',
                error: ''
            });
        });
    });

    describe('edge cases and validation', () => {
        it('should handle missing req.locals.value', async () => {
            req.locals = {};
            const unexpectedError = new Error('Cannot read property of undefined');
            mockUserServiceInstance.createUser.mockRejectedValue(unexpectedError);

            await createUserController(req, res, next);

            expect(mockUserServiceInstance.createUser).toHaveBeenCalledWith(undefined);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should handle req.locals.value without email', async () => {
            req.locals.value = {
                username: 'testuser',
                password: 'password123'
            };
            const mockResult = { success: true };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);

            expect(res.send).toHaveBeenCalledWith({
                success: true,
                email: undefined
            });
        });

        it('should handle null email in req.locals.value', async () => {
            req.locals.value.email = null;
            const mockResult = { success: true };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);

            expect(res.send).toHaveBeenCalledWith({
                success: true,
                email: null
            });
        });

        it('should handle empty string email', async () => {
            req.locals.value.email = '';
            const mockResult = { success: true };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);

            expect(res.send).toHaveBeenCalledWith({
                success: true,
                email: ''
            });
        });
    });

    describe('service instantiation', () => {
        it('should create new userService instance for each request', async () => {
            const mockResult = { success: true };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);
            await createUserController(req, res, next);

            expect(MockUserService).toHaveBeenCalledTimes(2);
        });

        it('should call createUser with correct parameters', async () => {
            const complexValue = {
                email: 'complex@test.com',
                username: 'complexuser',
                password: 'complexpass',
                profile: {
                    firstName: 'John',
                    lastName: 'Doe'
                }
            };
            req.locals.value = complexValue;
            const mockResult = { success: true };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);

            expect(mockUserServiceInstance.createUser).toHaveBeenCalledWith(complexValue);
        });
    });

    describe('response format consistency', () => {
        it('should always include email in response even if service returns email', async () => {
            const mockResult = {
                success: true,
                email: 'service@email.com' // Different email from service
            };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);

            expect(res.send).toHaveBeenCalledWith({
                success: true,
                email: 'test@example.com' // Should use req.locals.value.email
            });
        });

        it('should maintain all response properties when spreading result', async () => {
            const mockResult = {
                success: true,
                data: { nested: 'object' },
                array: [1, 2, 3],
                number: 42,
                boolean: false
            };
            mockUserServiceInstance.createUser.mockResolvedValue(mockResult);

            await createUserController(req, res, next);

            expect(res.send).toHaveBeenCalledWith({
                success: true,
                data: { nested: 'object' },
                array: [1, 2, 3],
                number: 42,
                boolean: false,
                email: 'test@example.com'
            });
        });
    });
});
