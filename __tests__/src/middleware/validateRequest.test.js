const validateRequest = require('../../../src/middleware/validateRequest'); // Adjust path as needed
const Joi = require('joi');

describe('validateRequest middleware', () => {
    let req, next, schema;

    beforeEach(() => {
        // Setup request object
        req = {
            body: {}
        };

        next = jest.fn();

    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('successful validation', () => {
        it('should call next without error when validation passes', () => {
            schema = Joi.object({
                name: Joi.string().required(),
                age: Joi.number().positive().required()
            });
            req.body = { name: 'John Doe', age: 30 };

            validateRequest(req, next, schema);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(); // Called without error
            expect(req.body).toEqual({ name: 'John Doe', age: 30 });
        });

        it('should strip unknown properties from req.body', () => {
            schema = Joi.object({
                name: Joi.string().required(),
                email: Joi.string().email()
            });
            req.body = { 
                name: 'Alice Smith', 
                email: 'alice@example.com',
                unknownField: 'should be removed',
                anotherUnknown: 123
            };

            validateRequest(req, next, schema);

            expect(next).toHaveBeenCalledWith(); // No error
            expect(req.body).toEqual({ 
                name: 'Alice Smith', 
                email: 'alice@example.com' 
            });
            expect(req.body).not.toHaveProperty('unknownField');
            expect(req.body).not.toHaveProperty('anotherUnknown');
        });

        it('should handle optional fields correctly', () => {
            schema = Joi.object({
                name: Joi.string().required(),
                age: Joi.number().optional(),
                email: Joi.string().email().optional()
            });
            req.body = { name: 'Bob Johnson' }; // Only required field

            validateRequest(req, next, schema);

            expect(next).toHaveBeenCalledWith();
            expect(req.body).toEqual({ name: 'Bob Johnson' });
        });
    });

    describe('validation failures', () => {
        it('should call next with error when validation fails', () => {
            schema = Joi.object({
                name: Joi.string().required(),
                age: Joi.number().positive().required()
            });
            req.body = { name: '', age: -5 }; // Invalid data

            validateRequest(req, next, schema);

            expect(next).toHaveBeenCalledTimes(1);
            
            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('Validation error');
            expect(error.status).toBe(400);
            expect(error.errors).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: expect.any(String),
                    message: expect.any(String)
                })
            ]));
        });

        it('should include all validation errors with abortEarly: false', () => {
            schema = Joi.object({
                name: Joi.string().min(2).required(),
                age: Joi.number().min(18).required(),
                email: Joi.string().email().required()
            });
            req.body = { 
                name: 'A', // Too short
                age: 15,   // Too young
                email: 'invalid-email' // Invalid format
            };

            validateRequest(req, next, schema);

            const error = next.mock.calls[0][0];
            expect(error.errors).toHaveLength(3);
            expect(error.errors).toEqual(expect.arrayContaining([
                expect.objectContaining({ field: 'name' }),
                expect.objectContaining({ field: 'age' }),
                expect.objectContaining({ field: 'email' })
            ]));
        });

        it('should format error messages by removing quotes', () => {
            schema = Joi.object({
                status: Joi.string().valid('active', 'inactive').required()
            });
            req.body = { status: 'invalid' };

            validateRequest(req, next, schema);

            const error = next.mock.calls[0][0];
            expect(error.errors[0].message).not.toMatch(/['"]/);
            expect(error.errors[0].field).toBe('status');
        });

        it('should handle nested object validation errors', () => {
            schema = Joi.object({
                user: Joi.object({
                    name: Joi.string().required(),
                    profile: Joi.object({
                        age: Joi.number().required()
                    }).required()
                }).required()
            });
            req.body = { 
                user: { 
                    name: '',
                    profile: { age: 'not-a-number' }
                }
            };

            validateRequest(req, next, schema);

            const error = next.mock.calls[0][0];
            expect(error.errors).toEqual(expect.arrayContaining([
                expect.objectContaining({ field: 'user.name' }),
                expect.objectContaining({ field: 'user.profile.age' })
            ]));
        });

        it('should not modify req.body when validation fails', () => {
            schema = Joi.object({
                name: Joi.string().required()
            });
            const originalBody = { name: 123, extra: 'field' };
            req.body = originalBody;

            validateRequest(req, next, schema);

            // req.body should remain unchanged on validation failure
            expect(req.body).toEqual(originalBody);
        });
    });

    describe('edge cases', () => {
        it('should handle empty req.body', () => {
            schema = Joi.object({
                name: Joi.string().required()
            });
            req.body = {};

            validateRequest(req, next, schema);

            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Validation error');
            expect(error.status).toBe(400);
        });

        it('should handle null req.body', () => {
            schema = Joi.object({
                name: Joi.string().optional()
            });
            req.body = null;

            validateRequest(req, next, schema);

            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(Error);
        });

        it('should handle complex nested field paths', () => {
            schema = Joi.object({
                data: Joi.object({
                    items: Joi.array().items(
                        Joi.object({
                            id: Joi.number().required(),
                            name: Joi.string().required()
                        })
                    )
                })
            });
            req.body = { 
                data: { 
                    items: [
                        { id: 1, name: 'valid' },
                        { id: 'invalid', name: '' } // Invalid item
                    ]
                }
            };

            validateRequest(req, next, schema);

            const error = next.mock.calls[0][0];
            expect(error.errors).toEqual(expect.arrayContaining([
                expect.objectContaining({ field: expect.stringMatching(/data\.items\.\d+\.(id|name)/) })
            ]));
        });

       
    });
});
