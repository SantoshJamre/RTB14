const Joi = require('joi');
const validateRequest = require('../middleware/validateRequest');

// Create Book Schema
const createBookSchema = Joi.object({
    title: Joi.string()
        .required()
        .min(1)
        .max(255)
        .messages({
            'string.empty': 'Title is required',
            'string.min': 'Title must be at least 1 character long',
            'string.max': 'Title cannot be longer than 255 characters',
            'any.required': 'Title is required'
        }),

    author: Joi.string()
        .required()
        .min(1)
        .max(255)
        .messages({
            'string.empty': 'Author is required',
            'string.min': 'Author must be at least 1 character long',
            'string.max': 'Author cannot be longer than 255 characters',
            'any.required': 'Author is required'
        }),

    pdf_url: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'PDF URL must be a valid URL',
            'string.empty': 'PDF URL is required',
            'any.required': 'PDF URL is required'
        }),

    published_date: Joi.date()
        .iso()
        .required()
        .messages({
            'date.base': 'Published date must be a valid date',
            'date.format': 'Published date must be in ISO 8601 format',
            'any.required': 'Published date is required'
        }),

    category: Joi.string()
        .valid('Fiction', 'Non-Fiction', 'Science', 'Technology', 'Biography')
        .messages({
            'any.only': 'Category must be one of: Fiction, Non-Fiction, Science, Technology, Biography'
        }),

    description: Joi.string()
        .max(1000)
        .optional()
        .messages({
            'string.max': 'Description must not exceed 1000 characters'
        }),
});

// Create Book Validator
const createBookValidator = (req, res, next) => {
    validateRequest(req, next, createBookSchema);
};

// Update Book Schema (all fields optional)
const updateBookSchema = createBookSchema.fork(
    Object.keys(createBookSchema.describe().keys),
    (schema) => schema.optional()
);

// Update Book Validator
const updateBookValidator = (req, res, next) => {
    validateRequest(req, next, updateBookSchema);
};

module.exports = {
    createBookValidator,
    updateBookValidator
};
