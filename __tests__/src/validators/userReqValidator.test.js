const {
    creatUserValidator,
    loginUserValidator,
    forgotPasswordValidator
} = require('../../../src/validators/userReqValidator'); // Adjust path as needed

// Mock ErrorCodes
const ErrorCodes = {
    500: { message: 'Internal Server Error' }
};
global.ErrorCodes = ErrorCodes;

describe('Authentication Validators', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('loginUserValidator', () => {
        it('should call next on valid login data', () => {
            req.body = { email: 'user@example.com', password: 'password123' };

            loginUserValidator(req, res, next);

            expect(next).toHaveBeenCalledWith();
            expect(req.locals).toEqual({
                value: { email: 'user@example.com', password: 'password123' }
            });
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 400 when email is missing', () => {
            req.body = { password: 'password123' };

            loginUserValidator(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: expect.any(String) });
            expect(next).not.toHaveBeenCalled();
        });

    });

    describe('creatUserValidator', () => {
        it('should call next on valid user creation data', () => {
            req.body = {
                email: 'user@example.com',
                password: 'password123',
                confirmPassword: 'password123'
            };

            creatUserValidator(req, res, next);

            expect(next).toHaveBeenCalledWith();
            expect(req.locals.value.email).toBe('user@example.com');
        });

        it('should return 400 when passwords do not match', () => {
            req.body = {
                email: 'user@example.com',
                password: 'password123',
                confirmPassword: 'differentpassword'
            };

            creatUserValidator(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Password and confirm password do not match'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 400 when password is too short', () => {
            req.body = {
                email: 'user@example.com',
                password: '123',
                confirmPassword: '123'
            };

            creatUserValidator(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: expect.any(String) });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('forgotPasswordValidator', () => {
        it('should call next on valid forgot password data', () => {
            req.body = {
                email: 'user@example.com',
                password: 'newpassword123',
                confirmPassword: 'newpassword123'
            };

            forgotPasswordValidator(req, res, next);

            expect(next).toHaveBeenCalledWith();
            expect(req.locals.value.email).toBe('user@example.com');
        });

        it('should return 400 when passwords do not match', () => {
            req.body = {
                email: 'user@example.com',
                password: 'password123',
                confirmPassword: 'differentpassword'
            };

            forgotPasswordValidator(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                message: 'Password and confirm password do not match'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 400 when required fields are missing', () => {
            req.body = { email: 'user@example.com' }; // Missing passwords

            forgotPasswordValidator(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: expect.any(String) });
            expect(next).not.toHaveBeenCalled();
        });
    });
});
