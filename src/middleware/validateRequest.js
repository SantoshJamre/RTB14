const { errorHandler } = require('../utils/errorHandling');

/**
 * Middleware to validate request data against a Joi schema
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @param {Joi.Schema} schema - Joi validation schema
 */
const validateRequest = (req, next, schema) => {
    const options = {
        abortEarly: false, // Include all errors
        allowUnknown: true, // Ignore unknown props
        stripUnknown: true // Remove unknown props
    };

    const { error, value } = schema.validate(req.body, options);

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message.replace(/['"]/g, '')
        }));
        
        const err = new Error('Validation error');
        err.status = 400;
        err.errors = errors;
        return next(err);
    }

    // Replace req.body with validated data
    req.body = value;
    next();
};

module.exports = validateRequest;
