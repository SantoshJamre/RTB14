const { NODE_ENV } = process.env;

const errorHandler = (error, request, response, next) => {
    try {
        // Default error response
        let statusCode = error.statusCode || 500;
        let message = error.message || 'Internal Server Error';
        let errorDetails = null;

        // Handle validation errors
        if (error.name === 'ValidationError') {
            statusCode = 400;
            const errors = {};
            Object.keys(error.errors).forEach((key) => {
                errors[key] = error.errors[key].message;
            });
            message = 'Validation Error';
            errorDetails = { errors };
        }
        // Handle duplicate key errors
        else if (error.code === 11000) {
            statusCode = 409;
            message = 'Duplicate field value entered';
            errorDetails = { field: Object.keys(error.keyPattern)[0] };
        }
        // Handle JWT errors
        else if (error.name === 'JsonWebTokenError') {
            statusCode = 401;
            message = 'Invalid token';
        } else if (error.name === 'TokenExpiredError') {
            statusCode = 401;
            message = 'Token expired';
        }
        // Handle custom errors
        else if (error.isOperational) {
            statusCode = error.statusCode || 500;
            message = error.message;
        }

        // Log the error
        logger.error(error.message, {
            stack: error.stack,
            name: error.name,
            ...(error.code && { code: error.code }),
            ...(error.errors && { errors: error.errors }),
            url: request.originalUrl,
            method: request.method
        });

        // Send error response
        response.status(statusCode).json({
            status: 'error',
            message,
            ...(errorDetails && { error: errorDetails }),
            ...(NODE_ENV === 'development' && { stack: error.stack })
        });
    } catch (error) {
        logger.error('Error in error handler:', error);
        response.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// Handle 404 - Not Found
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err });
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', { error: err });
    process.exit(1);
});

module.exports = {
    errorHandler,
    notFoundHandler
};