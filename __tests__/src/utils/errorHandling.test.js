const { errorHandler, notFoundHandler } = require('../../../src/utils/errorHandling'); // Adjust path as needed

// Mock logger
const mockLogger = {
  error: jest.fn()
};

// Mock server
const mockServer = {
  close: jest.fn()
};

// Mock global objects
global.logger = mockLogger;
global.server = mockServer;

describe('Error Handler Middleware', () => {
  let mockRequest;
  let mockResponse;
  let mockNext;
  let consoleExitSpy;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock request object
    mockRequest = {
      originalUrl: '/api/test',
      method: 'POST'
    };

    // Mock response object with chaining
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock next function
    mockNext = jest.fn();

    // Spy on process.exit
    consoleExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original NODE_ENV after each test
    if (process.env.NODE_ENV !== undefined) {
      delete process.env.NODE_ENV;
    }
    consoleExitSpy.mockRestore();
  });

  describe('errorHandler', () => {
    it('should handle generic errors with default 500 status', () => {
      const error = new Error('Something went wrong');
      
      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Something went wrong'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Something went wrong',
        expect.objectContaining({
          stack: error.stack,
          name: 'Error',
          url: '/api/test',
          method: 'POST'
        })
      );
    });

    it('should handle errors with custom status code', () => {
      const error = new Error('Custom error');
      error.statusCode = 422;

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Custom error'
      });
    });

    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        email: { message: 'Email is required' },
        password: { message: 'Password must be at least 6 characters' }
      };

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation Error',
        error: {
          errors: {
            email: 'Email is required',
            password: 'Password must be at least 6 characters'
          }
        }
      });
    });

    it('should handle duplicate key errors (code 11000)', () => {
      const error = new Error('Duplicate key error');
      error.code = 11000;
      error.keyPattern = { email: 1 };

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Duplicate field value entered',
        error: { field: 'email' }
      });
    });

    it('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token'
      });
    });

    it('should handle TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token expired'
      });
    });

    it('should handle operational errors', () => {
      const error = new Error('Operational error');
      error.isOperational = true;
      error.statusCode = 400;

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Operational error'
      });
    });

    it('should not include stack trace in production environment', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Production error');

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Production error'
      });
    });

    it('should log error with additional fields when present', () => {
      const error = new Error('Complex error');
      error.code = 'CUSTOM_CODE';
      error.errors = { field: 'value' };

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Complex error',
        expect.objectContaining({
          stack: error.stack,
          name: 'Error',
          code: 'CUSTOM_CODE',
          errors: { field: 'value' },
          url: '/api/test',
          method: 'POST'
        })
      );
    });

    it('should handle error without message', () => {
      const error = new Error();
      error.message = '';

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal Server Error'
      });
    });

    it('should handle error with multiple keyPattern fields', () => {
      const error = new Error('Duplicate key error');
      error.code = 11000;
      error.keyPattern = { email: 1, username: 1 };

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Duplicate field value entered',
        error: { field: 'email' } // Should get first field
      });
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error and call next', () => {
      const req = { originalUrl: '/api/nonexistent' };
      const res = {};

      notFoundHandler(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not Found - /api/nonexistent',
          statusCode: 404
        })
      );
    });

    it('should handle root path', () => {
      const req = { originalUrl: '/' };
      const res = {};

      notFoundHandler(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not Found - /',
          statusCode: 404
        })
      );
    });

    it('should handle path with query parameters', () => {
      const req = { originalUrl: '/api/users?page=1&limit=10' };
      const res = {};

      notFoundHandler(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not Found - /api/users?page=1&limit=10',
          statusCode: 404
        })
      );
    });
  });


  describe('Integration Tests', () => {
    it('should handle complete error flow from notFoundHandler to errorHandler', () => {
      const req = { originalUrl: '/api/missing' };
      const res = mockResponse;

      // First call notFoundHandler
      notFoundHandler(req, res, (error) => {
        // Then call errorHandler with the created error
        errorHandler(error, req, res, mockNext);
      });

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Not Found - /api/missing'
      });
    });

    it('should properly chain middleware calls', () => {
      const error = new Error('Test error');
      const middlewareChain = [
        (err, req, res, next) => {
          // Some middleware that might modify the error
          err.processed = true;
          next(err);
        },
        errorHandler
      ];

      let currentError = error;
      middlewareChain.forEach((middleware) => {
        const nextFunc = jest.fn((err) => {
          currentError = err;
        });
        
        if (middleware === errorHandler) {
          middleware(currentError, mockRequest, mockResponse, nextFunc);
        } else {
          middleware(currentError, mockRequest, mockResponse, nextFunc);
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(currentError.processed).toBe(true);
    });
  });
});
