const refreshToken = require('../../../src/middleware/refreshToken'); // Adjust path as needed
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

describe('refreshToken middleware', () => {
    let req, res, next;

    beforeEach(() => {
        // Setup request object
        req = {
            headers: {}
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
            await refreshToken(req, res, next);

            expect(logger.info).toHaveBeenCalledWith('Refresh token header: missing');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when Authorization header is empty', async () => {
            req.headers.authorization = '';

            await refreshToken(req, res, next);

            expect(logger.info).toHaveBeenCalledWith('Refresh token header: missing');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
        });

        it('should return 401 when Authorization header does not start with Bearer', async () => {
            req.headers.authorization = 'Token abc123';

            await refreshToken(req, res, next);

            expect(logger.info).toHaveBeenCalledWith('Refresh token header: present');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
        });

        it('should return 401 when Authorization header is just "Bearer"', async () => {
            req.headers.authorization = 'Bearer';

            await refreshToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
        });
    });

    describe('token verification errors', () => {
        it('should return 401 when token verification fails', async () => {
            req.headers.authorization = 'Bearer invalidtoken';
            const tokenError = new Error('Token expired');
            util.verifyAccessToken.mockImplementation(() => {
                throw tokenError;
            });

            await refreshToken(req, res, next);

            expect(util.verifyAccessToken).toHaveBeenCalledWith('invalidtoken');
            expect(logger.error).toHaveBeenCalledWith('Error in refreshToken middleware:', tokenError);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Token expired'
            });
        });

        it('should return 401 with default message when error has no message', async () => {
            req.headers.authorization = 'Bearer invalidtoken';
            const errorWithoutMessage = new Error();
            errorWithoutMessage.message = '';
            util.verifyAccessToken.mockImplementation(() => {
                throw errorWithoutMessage;
            });

            await refreshToken(req, res, next);

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

            await refreshToken(req, res, next);

            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(mockUserQuery.select).toHaveBeenCalledWith('-password');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'invalid token'
            });
        });

        it('should handle database query error', async () => {
            const mockUserQuery = {
                select: jest.fn().mockRejectedValue(new Error('Database connection failed'))
            };
            User.findById.mockReturnValue(mockUserQuery);

            await refreshToken(req, res, next);

            expect(logger.error).toHaveBeenCalledWith('Error in refreshToken middleware:', expect.any(Error));
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Database connection failed'
            });
        });
    });

    describe('successful token refresh', () => {
        it('should refresh token successfully and return 200', async () => {
            req.headers.authorization = 'Bearer validtoken123';
            const mockUser = {
                _id: 'user123',
                email: 'user@example.com',
                username: 'testuser'
            };
            const mockRefreshedTokenData = {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
                expiresIn: '1h'
            };

            util.verifyAccessToken.mockReturnValue({ uid: 'user123' });
            const mockUserQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            User.findById.mockReturnValue(mockUserQuery);
            util.refreshToken.mockReturnValue(mockRefreshedTokenData);

            await refreshToken(req, res, next);

            expect(logger.info).toHaveBeenCalledWith('Refresh token header: present');
            expect(util.verifyAccessToken).toHaveBeenCalledWith('validtoken123');
            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(mockUserQuery.select).toHaveBeenCalledWith('-password');
            expect(util.refreshToken).toHaveBeenCalledWith(
                { uid: 'user123', email: 'user@example.com' },
                'validtoken123'
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                code: 200,
                message: 'success',
                data: mockRefreshedTokenData
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should extract token correctly and pass to refresh function', async () => {
            req.headers.authorization = 'Bearer   token-with-spaces   ';
            const mockUser = { _id: 'user123', email: 'user@example.com' };
            const mockRefreshedData = { accessToken: 'new-token' };

            util.verifyAccessToken.mockReturnValue({ uid: 'user123' });
            const mockUserQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            User.findById.mockReturnValue(mockUserQuery);
            util.refreshToken.mockReturnValue(mockRefreshedData);

            await refreshToken(req, res, next);

            expect(util.verifyAccessToken).toHaveBeenCalledWith('  token-with-spaces   ');
            expect(util.refreshToken).toHaveBeenCalledWith(
                { uid: 'user123', email: 'user@example.com' },
                '  token-with-spaces   '
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('edge cases', () => {
        it('should handle user with missing email field', async () => {
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
            util.refreshToken.mockReturnValue({ accessToken: 'new-token' });

            await refreshToken(req, res, next);

            expect(util.refreshToken).toHaveBeenCalledWith(
                { uid: 'user123', email: undefined },
                'validtoken123'
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should handle refresh token utility error', async () => {
            req.headers.authorization = 'Bearer validtoken123';
            const mockUser = { _id: 'user123', email: 'user@example.com' };

            util.verifyAccessToken.mockReturnValue({ uid: 'user123' });
            const mockUserQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            User.findById.mockReturnValue(mockUserQuery);
            util.refreshToken.mockImplementation(() => {
                throw new Error('Refresh token generation failed');
            });

            await refreshToken(req, res, next);

            expect(logger.error).toHaveBeenCalledWith('Error in refreshToken middleware:', expect.any(Error));
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Refresh token generation failed'
            });
        });

        it('should handle case-sensitive Bearer validation', async () => {
            req.headers.authorization = 'bearer validtoken';

            await refreshToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 401,
                message: 'Access token required'
            });
        });
    });
});
