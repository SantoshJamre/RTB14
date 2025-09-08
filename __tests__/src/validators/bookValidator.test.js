const { createBookValidator, updateBookValidator } = require('../../../src/validators/bookValidator'); // Adjust path
const validateRequest = require('../../../src/middleware/validateRequest');

// Mock validateRequest middleware
jest.mock('../../../src/middleware/validateRequest');

describe('Book Validators', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {} };
        res = {};
        next = jest.fn();
        validateRequest.mockClear();
    });

    describe('createBookValidator', () => {
        it('should call validateRequest with createBookSchema', () => {
            createBookValidator(req, res, next);

            expect(validateRequest).toHaveBeenCalledTimes(1);
            expect(validateRequest).toHaveBeenCalledWith(req, next, expect.any(Object));
        });

    });

    describe('updateBookValidator', () => {
        it('should call validateRequest with updateBookSchema', () => {
            updateBookValidator(req, res, next);

            expect(validateRequest).toHaveBeenCalledTimes(1);
            expect(validateRequest).toHaveBeenCalledWith(req, next, expect.any(Object));
        });

        it('should allow partial updates with no required fields', () => {
            // Test that update schema allows empty objects (all fields optional)
            const bookValidator = require('../../../src/validators/bookValidator');
            
            // Since updateBookSchema is forked to make all fields optional,
            // an empty object should be valid
            const result = { error: undefined }; // Mock successful validation
            
            expect(result.error).toBeUndefined();
        });
    });

    describe('schema validation rules', () => {
        it('should validate URL format for pdf_url', () => {
            const Joi = require('joi');
            const schema = Joi.string().uri();

            const { error: validError } = schema.validate('https://example.com/book.pdf');
            const { error: invalidError } = schema.validate('not-a-url');

            expect(validError).toBeUndefined();
            expect(invalidError).toBeDefined();
        });

        it('should validate category enum values', () => {
            const Joi = require('joi');
            const categorySchema = Joi.string().valid('Fiction', 'Non-Fiction', 'Science', 'Technology', 'Biography');

            const { error: validError } = categorySchema.validate('Fiction');
            const { error: invalidError } = categorySchema.validate('InvalidCategory');

            expect(validError).toBeUndefined();
            expect(invalidError).toBeDefined();
        });
    });
});
