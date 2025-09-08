const getBookModel = () => global.Book;
const User = require('../models/User');
const notificationEmitter = require("./../utils/notificationEmitter");
const { Op } = require('sequelize');

class BookService {
    async getAllBooks(filters = {}) {
        try {
            const {
                search,
                author,
                category,
                sortBy = 'published_date',
                sortOrder = 'DESC',
                page = 1,
                limit = 10
            } = filters;

            const offset = (page - 1) * limit;
            const where = { isActive: true };

            if (search) {
                where[Op.or] = [
                    { title: { [Op.like]: `%${search}%` } },
                    { author: { [Op.like]: `%${search}%` } }
                ];
            }

            if (author) {
                where.author = { [Op.like]: `%${author}%` };
            }

            if (category) {
                where.category = category;
            }

            const Book = getBookModel();
            const { count, rows } = await Book.findAndCountAll({
                where,
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                code: 200,
                message: 'Books retrieved successfully',
                data: {
                    books: rows,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(count / limit),
                        totalBooks: count,
                        limit: parseInt(limit),
                        hasNext: page * limit < count,
                        hasPrev: page > 1
                    }
                }
            };
        } catch (error) {
            throw error;
        }
    }

    async getBookById(id) {
        try {
            const Book = getBookModel();
            const book = await Book.findOne({
                where: { id, isActive: true }
            });

            if (!book) {
                throw {
                    code: 404,
                    message: 'Book not found'
                };
            }

            return book;
        } catch (error) {
            throw error;
        }
    }

    async createBook(bookData, userId) {
        try {
            const Book = getBookModel();
            const book = await Book.create({
                ...bookData,
                addedBy: userId
            });

            try {
                const users = await User.find({ isVerified: true });
                const addedBy = await User.findById(userId);
                
                if (users.length > 0 && addedBy) {
                     notificationEmitter.emit("bookCreated", users, bookData, addedBy);
                }
            } catch (emailError) {
                console.error('Book notification email failed:', emailError);
            }

            return book;
        } catch (error) {
            throw error;
        }
    }

    async updateBook(id, updateData, userId) {
        try {
            const Book = getBookModel();
            const book = await Book.findOne({
                where: { id, isActive: true }
            });

            if (!book) {
                throw {
                    code: 404,
                    message: 'Book not found'
                };
            }

            await book.update(updateData);
            return book;
        } catch (error) {
            throw error;
        }
    }

    async deleteBook(id, userId) {
        try {
            const Book = getBookModel();
            const book = await Book.findOne({
                where: { id, isActive: true }
            });

            if (!book) {
                throw {
                    code: 404,
                    message: 'Book not found'
                };
            }

            await book.update({ isActive: false });
            return {
                message: 'Book deleted successfully'
            };
        } catch (error) {
            throw error;
        }
    }
 
}

module.exports = new BookService();
