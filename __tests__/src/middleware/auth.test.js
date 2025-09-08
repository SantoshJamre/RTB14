const { authenticate } = require('../../../src/middleware/auth'); // Adjust path as needed
const util = require('../../../src/utils/util');
const User = require('../../../src/models/User');

// Mock the dependencies
jest.mock('../../../src/utils/util');
jest.mock('../../../src/models/User');

// Mock logger if it's used globally
global.logger = {
    info: jest.fn(),
    error: jest.fn()
};

describe('authenticate middleware', () => {
    let req, res, next;

    beforeEach(() => {
        // Setup request object
        req = {
            headers: {},
            user: null
        };

        // Setup response object
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        next = jest.fn();

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('missing or invalid Authorization header', () => {
        it('should return 401 when Authorization header is missing', async () => {
            await authenticate(req, res, next);

            expect(logger.info).toHaveBeenCalledWith('Auth header: missing');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when Authorization header is empty', async () => {
            req.headers.authorization = '';

            await authenticate(req, res, next);

            expect(logger.info).toHaveBeenCalledWith('Auth header: missing');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when Authorization header does not start with Bearer', async () => {
            req.headers.authorization = 'Token abc123';

            await authenticate(req, res, next);

            expect(logger.info).toHaveBeenCalledWith('Auth header: present');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when Authorization header is just "Bearer"', async () => {
            req.headers.authorization = 'Bearer';

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
        });
    });

    describe('token verification', () => {
        it('should return 401 when token verification fails', async () => {
            req.headers.authorization = 'Bearer invalidtoken';
            util.verifyAccessToken.mockImplementation(() => {
                throw new Error('Invalid token signature');
            });

            await authenticate(req, res, next);

            expect(util.verifyAccessToken).toHaveBeenCalledWith('invalidtoken');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Invalid token signature'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 with default message when error has no message', async () => {
            req.headers.authorization = 'Bearer invalidtoken';
            const errorWithoutMessage = new Error();
            errorWithoutMessage.message = '';
            util.verifyAccessToken.mockImplementation(() => {
                throw errorWithoutMessage;
            });

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Invalid token'
            });
        });
    });

    describe('user lookup', () => {
        beforeEach(() => {
            req.headers.authorization = 'Bearer validtoken123';
            util.verifyAccessToken.mockReturnValue({ uid: 'user123' });
        });

        it('should return 401 when user is not found', async () => {
            const mockUserQuery = {
                select: jest.fn().mockResolvedValue(null)
            };
            User.findById.mockReturnValue(mockUserQuery);

            await authenticate(req, res, next);

            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(mockUserQuery.select).toHaveBeenCalledWith('-password');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'User not found or inactive'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should handle database query error', async () => {
            const mockUserQuery = {
                select: jest.fn().mockRejectedValue(new Error('Database connection failed'))
            };
            User.findById.mockReturnValue(mockUserQuery);

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Database connection failed'
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('successful authentication', () => {
        it('should authenticate successfully and call next', async () => {
            req.headers.authorization = 'Bearer validtoken123';
            const mockUser = {
                _id: 'user123',
                email: 'user@example.com',
                username: 'testuser'
            };

            util.verifyAccessToken.mockReturnValue({ uid: 'user123' });
            const mockUserQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            User.findById.mockReturnValue(mockUserQuery);

            await authenticate(req, res, next);

            expect(logger.info).toHaveBeenCalledWith('Auth header: present');
            expect(util.verifyAccessToken).toHaveBeenCalledWith('validtoken123');
            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(mockUserQuery.select).toHaveBeenCalledWith('-password');
            expect(req.user).toEqual({
                uid: 'user123',
                email: 'user@example.com'
            });
            expect(next).toHaveBeenCalledWith();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it('should extract token correctly from Authorization header', async () => {
            req.headers.authorization = 'Bearer   token-with-spaces   ';
            const mockUser = { _id: 'user123', email: 'user@example.com' };

            util.verifyAccessToken.mockReturnValue({ uid: 'user123' });
            const mockUserQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            User.findById.mockReturnValue(mockUserQuery);

            await authenticate(req, res, next);

            expect(util.verifyAccessToken).toHaveBeenCalledWith('  token-with-spaces   ');
            expect(req.user).toEqual({
                uid: 'user123',
                email: 'user@example.com'
            });
            expect(next).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle user with missing email', async () => {
            req.headers.authorization = 'Bearer validtoken123';
            const mockUser = {
                _id: 'user123',
                // email is missing
                username: 'testuser'
            };

            util.verifyAccessToken.mockReturnValue({ uid: 'user123' });
            const mockUserQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            User.findById.mockReturnValue(mockUserQuery);

            await authenticate(req, res, next);

            expect(req.user).toEqual({
                uid: 'user123',
                email: undefined
            });
            expect(next).toHaveBeenCalled();
        });

        it('should handle case-sensitive Bearer token', async () => {
            req.headers.authorization = 'bearer validtoken';

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
        });
    });
});
