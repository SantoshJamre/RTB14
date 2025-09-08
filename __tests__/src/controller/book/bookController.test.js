const BookController = require('../../../../src/controller/book/bookController');
const bookService = require('../../../../src/services/bookService');
const { validationResult } = require('express-validator');

// Mock the dependencies
jest.mock('../../../../src/services/bookService');
jest.mock('express-validator');

describe('BookController', () => {
    let req, res, mockValidationResult;

    beforeEach(() => {
        req = {
            query: {},
            params: {},
            body: {},
            user: { _id: 'user123' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        // Mock validationResult
        mockValidationResult = {
            isEmpty: jest.fn(),
            array: jest.fn()
        };
        validationResult.mockReturnValue(mockValidationResult);

        // Mock console.error to avoid noise in test output
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllBooks', () => {
        it('should return books with default pagination when no query params provided', async () => {
            const mockResponse = {
                code: 200,
                message: 'Books retrieved successfully',
                data: { books: [], total: 0 }
            };
            bookService.getAllBooks.mockResolvedValue(mockResponse);

            await BookController.getAllBooks(req, res);

            expect(bookService.getAllBooks).toHaveBeenCalledWith({
                search: undefined,
                author: undefined,
                category: undefined,
                sortBy: undefined,
                sortOrder: undefined,
                page: 1,
                limit: 10
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResponse);
        });

        it('should return books with custom query parameters', async () => {
            req.query = {
                search: 'test',
                author: 'John Doe',
                category: 'fiction',
                sortBy: 'title',
                sortOrder: 'desc',
                page: '2',
                limit: '5'
            };

            const mockResponse = {
                code: 200,
                message: 'Books retrieved successfully',
                data: { books: [], total: 0 }
            };
            bookService.getAllBooks.mockResolvedValue(mockResponse);

            await BookController.getAllBooks(req, res);

            expect(bookService.getAllBooks).toHaveBeenCalledWith({
                search: 'test',
                author: 'John Doe',
                category: 'fiction',
                sortBy: 'title',
                sortOrder: 'desc',
                page: 2,
                limit: 5
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResponse);
        });

        it('should handle service errors and return 500', async () => {
            bookService.getAllBooks.mockRejectedValue(new Error('Database error'));

            await BookController.getAllBooks(req, res);

            expect(console.error).toHaveBeenCalledWith('Get books error:', expect.any(Error));
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                code: 500,
                message: 'Internal server error'
            });
        });

        it('should parse invalid page and limit to defaults', async () => {
            req.query = { page: 'invalid', limit: 'invalid' };

            const mockResponse = {
                code: 200,
                message: 'Books retrieved successfully',
                data: { books: [], total: 0 }
            };
            bookService.getAllBooks.mockResolvedValue(mockResponse);

            await BookController.getAllBooks(req, res);

            expect(bookService.getAllBooks).toHaveBeenCalledWith({
                search: undefined,
                author: undefined,
                category: undefined,
                sortBy: undefined,
                sortOrder: undefined,
                page: 1,
                limit: 10
            });
        });
    });

    describe('getBookById', () => {
        beforeEach(() => {
            req.params.id = 'book123';
        });

        it('should return book when found', async () => {
            const mockBook = { _id: 'book123', title: 'Test Book' };
            bookService.getBookById.mockResolvedValue(mockBook);

            await BookController.getBookById(req, res);

            expect(bookService.getBookById).toHaveBeenCalledWith('book123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                code: 200,
                message: 'Book retrieved successfully',
                data: mockBook
            });
        });

        it('should handle service error with code and message', async () => {
            const serviceError = { code: 404, message: 'Book not found' };
            bookService.getBookById.mockRejectedValue(serviceError);

            await BookController.getBookById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                code: 404,
                message: 'Book not found'
            });
        });

        it('should handle unexpected errors and return 500', async () => {
            bookService.getBookById.mockRejectedValue(new Error('Unexpected error'));

            await BookController.getBookById(req, res);

            expect(console.error).toHaveBeenCalledWith('Get book error:', expect.any(Error));
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                code: 500,
                message: 'Internal server error'
            });
        });
    });

    describe('createBook', () => {
        beforeEach(() => {
            req.body = { title: 'New Book', author: 'Author Name' };
            req.user = { uid: 'user123' };
        });

        it('should create book successfully when validation passes', async () => {
            mockValidationResult.isEmpty.mockReturnValue(true);
            const mockBook = { _id: 'book123', title: 'New Book' };
            bookService.createBook.mockResolvedValue(mockBook);

            await BookController.createBook(req, res);

            expect(bookService.createBook).toHaveBeenCalledWith(req.body, req.user.uid);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                code: 201,
                message: 'Book created successfully',
                data: mockBook
            });
        });

        it('should return validation errors when validation fails', async () => {
            const validationErrors = [
                { msg: 'Title is required', param: 'title' },
                { msg: 'Author is required', param: 'author' }
            ];

            mockValidationResult.isEmpty.mockReturnValue(false);
            mockValidationResult.array.mockReturnValue(validationErrors);

            await BookController.createBook(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                code: 400,
                message: 'Validation failed',
                errors: validationErrors
            });
            expect(bookService.createBook).not.toHaveBeenCalled();
        });

        it('should handle service error with code and message', async () => {
            mockValidationResult.isEmpty.mockReturnValue(true);
            const serviceError = { code: 409, message: 'Book already exists' };
            bookService.createBook.mockRejectedValue(serviceError);

            await BookController.createBook(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                code: 409,
                message: 'Book already exists'
            });
        });

        it('should handle unexpected errors and return 500', async () => {
            mockValidationResult.isEmpty.mockReturnValue(true);
            bookService.createBook.mockRejectedValue(new Error('Database error'));

            await BookController.createBook(req, res);

            expect(console.error).toHaveBeenCalledWith('Create book error:', expect.any(Error));
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                code: 500,
                message: 'Internal server error'
            });
        });
    });

    describe('updateBook', () => {
        beforeEach(() => {
            req.params.id = 'book123';
            req.body = { title: 'Updated Book' };
        });

        it('should update book successfully when validation passes', async () => {
            mockValidationResult.isEmpty.mockReturnValue(true);
            const mockBook = { _id: 'book123', title: 'Updated Book' };
            bookService.updateBook.mockResolvedValue(mockBook);

            await BookController.updateBook(req, res);

            expect(bookService.updateBook).toHaveBeenCalledWith('book123', req.body, 'user123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                code: 200,
                message: 'Book updated successfully',
                data: mockBook
            });
        });

        it('should return validation errors when validation fails', async () => {
            const validationErrors = [{ msg: 'Title is required', param: 'title' }];

            mockValidationResult.isEmpty.mockReturnValue(false);
            mockValidationResult.array.mockReturnValue(validationErrors);

            await BookController.updateBook(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                code: 400,
                message: 'Validation failed',
                errors: validationErrors
            });
            expect(bookService.updateBook).not.toHaveBeenCalled();
        });

        it('should handle service error with code and message', async () => {
            mockValidationResult.isEmpty.mockReturnValue(true);
            const serviceError = { code: 404, message: 'Book not found' };
            bookService.updateBook.mockRejectedValue(serviceError);

            await BookController.updateBook(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                code: 404,
                message: 'Book not found'
            });
        });

        it('should handle unexpected errors and return 500', async () => {
            mockValidationResult.isEmpty.mockReturnValue(true);
            bookService.updateBook.mockRejectedValue(new Error('Database error'));

            await BookController.updateBook(req, res);

            expect(console.error).toHaveBeenCalledWith('Update book error:', expect.any(Error));
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                code: 500,
                message: 'Internal server error'
            });
        });
    });

    describe('deleteBook', () => {
        beforeEach(() => {
            req.params.id = 'book123';
        });

        it('should delete book successfully', async () => {
            const mockResult = { message: 'Book deleted successfully' };
            bookService.deleteBook.mockResolvedValue(mockResult);

            await BookController.deleteBook(req, res);

            expect(bookService.deleteBook).toHaveBeenCalledWith('book123', 'user123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                code: 200,
                message: 'Book deleted successfully'
            });
        });

        it('should handle service error with code and message', async () => {
            const serviceError = { code: 404, message: 'Book not found' };
            bookService.deleteBook.mockRejectedValue(serviceError);

            await BookController.deleteBook(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                code: 404,
                message: 'Book not found'
            });
        });

        it('should handle unauthorized deletion attempt', async () => {
            const serviceError = { code: 403, message: 'Not authorized to delete this book' };
            bookService.deleteBook.mockRejectedValue(serviceError);

            await BookController.deleteBook(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                code: 403,
                message: 'Not authorized to delete this book'
            });
        });

        it('should handle unexpected errors and return 500', async () => {
            bookService.deleteBook.mockRejectedValue(new Error('Database error'));

            await BookController.deleteBook(req, res);

            expect(console.error).toHaveBeenCalledWith('Delete book error:', expect.any(Error));
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                code: 500,
                message: 'Internal server error'
            });
        });
    });
});
