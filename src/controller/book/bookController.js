const bookService = require('../../services/bookService');
const { validationResult } = require('express-validator');

class BookController {
    async getAllBooks(req, res) {
        try {
            const {
                search,
                author,
                category,
                sortBy,
                sortOrder,
                page,
                limit
            } = req.query;

            const { code, message, data } = await bookService.getAllBooks({
                search,
                author,
                category,
                sortBy,
                sortOrder,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10
            });

            res.status(code).json({
                code,
                message,
                data
            });
        } catch (error) {
            console.error('Get books error:', error);
            res.status(500).json({
                code: 500,
                message: 'Internal server error'
            });
        }
    }

    async getBookById(req, res) {
        try {
            const { id } = req.params;
            const book = await bookService.getBookById(id);

            res.status(200).json({
                code: 200,
                message: 'Book retrieved successfully',
                data: book
            });
        } catch (error) {
            if (error.code && error.message) {
                return res.status(error.code).json({
                    code: error.code,
                    message: error.message
                });
            }
            console.error('Get book error:', error);
            res.status(500).json({
                code: 500,
                message: 'Internal server error'
            });
        }
    }

    async createBook(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    code: 400,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const book = await bookService.createBook(req.body, req.user.uid);

            res.status(201).json({
                code: 201,
                message: 'Book created successfully',
                data: book
            });
        } catch (error) {
            if (error.code && error.message) {
                return res.status(error.code).json({
                    code: error.code,
                    message: error.message
                });
            }
            console.error('Create book error:', error);
            res.status(500).json({
                code: 500,
                message: 'Internal server error'
            });
        }
    }

    async updateBook(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    code: 400,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const book = await bookService.updateBook(id, req.body, req.user._id);

            res.status(200).json({
                code: 200,
                message: 'Book updated successfully',
                data: book
            });
        } catch (error) {
            if (error.code && error.message) {
                return res.status(error.code).json({
                    code: error.code,
                    message: error.message
                });
            }
            console.error('Update book error:', error);
            res.status(500).json({
                code: 500,
                message: 'Internal server error'
            });
        }
    }

    async deleteBook(req, res) {
        try {
            const { id } = req.params;
            const result = await bookService.deleteBook(id, req.user._id);

            res.status(200).json({
                code: 200,
                message: result.message
            });
        } catch (error) {
            if (error.code && error.message) {
                return res.status(error.code).json({
                    code: error.code,
                    message: error.message
                });
            }
            console.error('Delete book error:', error);
            res.status(500).json({
                code: 500,
                message: 'Internal server error'
            });
        }
    }

}

module.exports = new BookController();
