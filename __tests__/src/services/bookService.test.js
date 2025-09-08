const BookService = require('../../../src/services/bookService');
const User = require('../../../src/models/User');
const emailService = require('../../../src/services/emailService');
const { Op } = require('sequelize');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/services/emailService');
jest.mock('sequelize', () => ({
    Op: {
        like: Symbol('like'),
        or: Symbol('or')
    }
}));

// Mock global Book model
const mockBookModel = {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
};

global.Book = mockBookModel;

describe('BookService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllBooks', () => {
        const mockBooks = [
            {
                id: 1,
                title: 'Test Book 1',
                author: 'Author 1',
                category: 'Fiction',
                published_date: '2023-01-01',
                isActive: true
            },
            {
                id: 2,
                title: 'Test Book 2',
                author: 'Author 2',
                category: 'Non-Fiction',
                published_date: '2023-02-01',
                isActive: true
            }
        ];

        it('should return all books with default pagination', async () => {
            mockBookModel.findAndCountAll.mockResolvedValue({
                count: 2,
                rows: mockBooks
            });

            const result = await BookService.getAllBooks();

            expect(mockBookModel.findAndCountAll).toHaveBeenCalledWith({
                where: { isActive: true },
                order: [['published_date', 'DESC']],
                limit: 10,
                offset: 0
            });

            expect(result).toEqual({
                code: 200,
                message: 'Books retrieved successfully',
                data: {
                    books: mockBooks,
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        totalBooks: 2,
                        limit: 10,
                        hasNext: false,
                        hasPrev: false
                    }
                }
            });
        });

        it('should filter books by search term', async () => {
            const filters = { search: 'Test' };
            mockBookModel.findAndCountAll.mockResolvedValue({
                count: 1,
                rows: [mockBooks[0]]
            });

            await BookService.getAllBooks(filters);

            expect(mockBookModel.findAndCountAll).toHaveBeenCalledWith({
                where: {
                    isActive: true,
                    [Op.or]: [
                        { title: { [Op.like]: '%Test%' } },
                        { author: { [Op.like]: '%Test%' } }
                    ]
                },
                order: [['published_date', 'DESC']],
                limit: 10,
                offset: 0
            });
        });

        it('should filter books by author', async () => {
            const filters = { author: 'Author 1' };
            mockBookModel.findAndCountAll.mockResolvedValue({
                count: 1,
                rows: [mockBooks[0]]
            });

            await BookService.getAllBooks(filters);

            expect(mockBookModel.findAndCountAll).toHaveBeenCalledWith({
                where: {
                    isActive: true,
                    author: { [Op.like]: '%Author 1%' }
                },
                order: [['published_date', 'DESC']],
                limit: 10,
                offset: 0
            });
        });

        it('should filter books by category', async () => {
            const filters = { category: 'Fiction' };
            mockBookModel.findAndCountAll.mockResolvedValue({
                count: 1,
                rows: [mockBooks[0]]
            });

            await BookService.getAllBooks(filters);

            expect(mockBookModel.findAndCountAll).toHaveBeenCalledWith({
                where: {
                    isActive: true,
                    category: 'Fiction'
                },
                order: [['published_date', 'DESC']],
                limit: 10,
                offset: 0
            });
        });

        it('should handle custom pagination and sorting', async () => {
            const filters = {
                page: 2,
                limit: 5,
                sortBy: 'title',
                sortOrder: 'ASC'
            };
            mockBookModel.findAndCountAll.mockResolvedValue({
                count: 15,
                rows: mockBooks
            });

            const result = await BookService.getAllBooks(filters);

            expect(mockBookModel.findAndCountAll).toHaveBeenCalledWith({
                where: { isActive: true },
                order: [['title', 'ASC']],
                limit: 5,
                offset: 5
            });

            expect(result.data.pagination).toEqual({
                currentPage: 2,
                totalPages: 3,
                totalBooks: 15,
                limit: 5,
                hasNext: true,
                hasPrev: true
            });
        });

        it('should throw error when database operation fails', async () => {
            const dbError = new Error('Database connection failed');
            mockBookModel.findAndCountAll.mockRejectedValue(dbError);

            await expect(BookService.getAllBooks()).rejects.toThrow('Database connection failed');
        });
    });

    describe('getBookById', () => {
        const mockBook = {
            id: 1,
            title: 'Test Book',
            author: 'Test Author',
            isActive: true
        };

        it('should return book when found', async () => {
            mockBookModel.findOne.mockResolvedValue(mockBook);

            const result = await BookService.getBookById(1);

            expect(mockBookModel.findOne).toHaveBeenCalledWith({
                where: { id: 1, isActive: true }
            });
            expect(result).toEqual(mockBook);
        });

        it('should throw 404 error when book not found', async () => {
            mockBookModel.findOne.mockResolvedValue(null);

            await expect(BookService.getBookById(999)).rejects.toEqual({
                code: 404,
                message: 'Book not found'
            });
        });

        it('should throw error when database operation fails', async () => {
            const dbError = new Error('Database error');
            mockBookModel.findOne.mockRejectedValue(dbError);

            await expect(BookService.getBookById(1)).rejects.toThrow('Database error');
        });
    });

    describe('createBook', () => {
        const mockBookData = {
            title: 'New Book',
            author: 'New Author',
            category: 'Fiction',
            published_date: '2023-01-01'
        };

        const mockCreatedBook = {
            id: 1,
            ...mockBookData,
            addedBy: 'user123'
        };

        const mockUsers = [
            { id: 'user1', email: 'user1@test.com', isVerified: true },
            { id: 'user2', email: 'user2@test.com', isVerified: true }
        ];

        const mockAddedByUser = {
            id: 'user123',
            name: 'John Doe',
            email: 'john@test.com'
        };

        it('should create book successfully and send notification emails', async () => {
            mockBookModel.create.mockResolvedValue(mockCreatedBook);
            User.find.mockResolvedValue(mockUsers);
            User.findById.mockResolvedValue(mockAddedByUser);
            emailService.sendNewBookNotification.mockResolvedValue();

            const result = await BookService.createBook(mockBookData, 'user123');

            expect(mockBookModel.create).toHaveBeenCalledWith({
                ...mockBookData,
                addedBy: 'user123'
            });
            expect(User.find).toHaveBeenCalledWith({ isVerified: true });
            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(result).toEqual(mockCreatedBook);
        });

        it('should create book successfully even if email notification fails', async () => {
            mockBookModel.create.mockResolvedValue(mockCreatedBook);
            User.find.mockResolvedValue(mockUsers);
            User.findById.mockResolvedValue(mockAddedByUser);
            emailService.sendNewBookNotification.mockRejectedValue(new Error('Email failed'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await BookService.createBook(mockBookData, 'user123');

            expect(result).toEqual(mockCreatedBook);
            consoleSpy.mockRestore();
        });

        it('should create book successfully when no verified users found', async () => {
            mockBookModel.create.mockResolvedValue(mockCreatedBook);
            User.find.mockResolvedValue([]);
            User.findById.mockResolvedValue(mockAddedByUser);

            const result = await BookService.createBook(mockBookData, 'user123');

            expect(result).toEqual(mockCreatedBook);
            expect(emailService.sendNewBookNotification).not.toHaveBeenCalled();
        });

        it('should create book successfully when addedBy user not found', async () => {
            mockBookModel.create.mockResolvedValue(mockCreatedBook);
            User.find.mockResolvedValue(mockUsers);
            User.findById.mockResolvedValue(null);

            const result = await BookService.createBook(mockBookData, 'user123');

            expect(result).toEqual(mockCreatedBook);
            expect(emailService.sendNewBookNotification).not.toHaveBeenCalled();
        });

        it('should throw error when book creation fails', async () => {
            const dbError = new Error('Database constraint violation');
            mockBookModel.create.mockRejectedValue(dbError);

            await expect(BookService.createBook(mockBookData, 'user123'))
                .rejects.toThrow('Database constraint violation');
        });
    });

    describe('updateBook', () => {
        const mockBook = {
            id: 1,
            title: 'Original Title',
            author: 'Original Author',
            isActive: true,
            update: jest.fn()
        };

        const updateData = {
            title: 'Updated Title',
            author: 'Updated Author'
        };

        beforeEach(() => {
            mockBook.update.mockClear();
        });

        it('should update book successfully', async () => {
            mockBookModel.findOne.mockResolvedValue(mockBook);
            mockBook.update.mockResolvedValue();

            const result = await BookService.updateBook(1, updateData, 'user123');

            expect(mockBookModel.findOne).toHaveBeenCalledWith({
                where: { id: 1, isActive: true }
            });
            expect(mockBook.update).toHaveBeenCalledWith(updateData);
            expect(result).toEqual(mockBook);
        });

        it('should throw 404 error when book not found', async () => {
            mockBookModel.findOne.mockResolvedValue(null);

            await expect(BookService.updateBook(999, updateData, 'user123'))
                .rejects.toEqual({
                    code: 404,
                    message: 'Book not found'
                });

            expect(mockBook.update).not.toHaveBeenCalled();
        });

        it('should throw error when update operation fails', async () => {
            const updateError = new Error('Update failed');
            mockBookModel.findOne.mockResolvedValue(mockBook);
            mockBook.update.mockRejectedValue(updateError);

            await expect(BookService.updateBook(1, updateData, 'user123'))
                .rejects.toThrow('Update failed');
        });

        it('should throw error when findOne operation fails', async () => {
            const dbError = new Error('Database error');
            mockBookModel.findOne.mockRejectedValue(dbError);

            await expect(BookService.updateBook(1, updateData, 'user123'))
                .rejects.toThrow('Database error');
        });
    });

    describe('deleteBook', () => {
        const mockBook = {
            id: 1,
            title: 'Test Book',
            isActive: true,
            update: jest.fn()
        };

        beforeEach(() => {
            mockBook.update.mockClear();
        });

        it('should soft delete book successfully', async () => {
            mockBookModel.findOne.mockResolvedValue(mockBook);
            mockBook.update.mockResolvedValue();

            const result = await BookService.deleteBook(1, 'user123');

            expect(mockBookModel.findOne).toHaveBeenCalledWith({
                where: { id: 1, isActive: true }
            });
            expect(mockBook.update).toHaveBeenCalledWith({ isActive: false });
            expect(result).toEqual({
                message: 'Book deleted successfully'
            });
        });

        it('should throw 404 error when book not found', async () => {
            mockBookModel.findOne.mockResolvedValue(null);

            await expect(BookService.deleteBook(999, 'user123'))
                .rejects.toEqual({
                    code: 404,
                    message: 'Book not found'
                });

            expect(mockBook.update).not.toHaveBeenCalled();
        });

        it('should throw error when soft delete operation fails', async () => {
            const updateError = new Error('Update failed');
            mockBookModel.findOne.mockResolvedValue(mockBook);
            mockBook.update.mockRejectedValue(updateError);

            await expect(BookService.deleteBook(1, 'user123'))
                .rejects.toThrow('Update failed');
        });

        it('should throw error when findOne operation fails', async () => {
            const dbError = new Error('Database error');
            mockBookModel.findOne.mockRejectedValue(dbError);

            await expect(BookService.deleteBook(1, 'user123'))
                .rejects.toThrow('Database error');
        });
    });

    describe('Edge cases and integration scenarios', () => {
        it('should handle getAllBooks with all filters applied', async () => {
            const filters = {
                search: 'Test',
                author: 'Author',
                category: 'Fiction',
                sortBy: 'title',
                sortOrder: 'ASC',
                page: 3,
                limit: 5
            };

            mockBookModel.findAndCountAll.mockResolvedValue({
                count: 20,
                rows: []
            });

            await BookService.getAllBooks(filters);

            expect(mockBookModel.findAndCountAll).toHaveBeenCalledWith({
                where: {
                    isActive: true,
                    [Op.or]: [
                        { title: { [Op.like]: '%Test%' } },
                        { author: { [Op.like]: '%Test%' } }
                    ],
                    author: { [Op.like]: '%Author%' },
                    category: 'Fiction'
                },
                order: [['title', 'ASC']],
                limit: 5,
                offset: 10
            });
        });

        it('should handle pagination correctly with hasNext and hasPrev flags', async () => {
            const filters = { page: 2, limit: 5 };
            mockBookModel.findAndCountAll.mockResolvedValue({
                count: 15,
                rows: []
            });

            const result = await BookService.getAllBooks(filters);

            expect(result.data.pagination).toEqual({
                currentPage: 2,
                totalPages: 3,
                totalBooks: 15,
                limit: 5,
                hasNext: true,
                hasPrev: true
            });
        });

        it('should handle string parameters correctly by parsing them to integers', async () => {
            const filters = { page: '3', limit: '8' };
            mockBookModel.findAndCountAll.mockResolvedValue({
                count: 25,
                rows: []
            });

            const result = await BookService.getAllBooks(filters);

            expect(mockBookModel.findAndCountAll).toHaveBeenCalledWith({
                where: { isActive: true },
                order: [['published_date', 'DESC']],
                limit: 8,
                offset: 16
            });

            expect(result.data.pagination.currentPage).toBe(3);
            expect(result.data.pagination.limit).toBe(8);
        });
    });

    describe('Email notification scenarios in createBook', () => {
        const mockBookData = {
            title: 'New Book',
            author: 'New Author'
        };

        const mockCreatedBook = {
            id: 1,
            ...mockBookData,
            addedBy: 'user123'
        };

        it('should handle User.find error gracefully', async () => {
            mockBookModel.create.mockResolvedValue(mockCreatedBook);
            User.find.mockRejectedValue(new Error('User find failed'));
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await BookService.createBook(mockBookData, 'user123');

            expect(result).toEqual(mockCreatedBook);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Book notification email failed:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        it('should handle User.findById error gracefully', async () => {
            mockBookModel.create.mockResolvedValue(mockCreatedBook);
            User.find.mockResolvedValue([{ id: 'user1', isVerified: true }]);
            User.findById.mockRejectedValue(new Error('User findById failed'));
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await BookService.createBook(mockBookData, 'user123');

            expect(result).toEqual(mockCreatedBook);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Book notification email failed:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Error handling consistency', () => {
        it('should maintain error format consistency across methods', async () => {
            // Test getBookById error format
            mockBookModel.findOne.mockResolvedValue(null);
            
            try {
                await BookService.getBookById(999);
            } catch (error) {
                expect(error).toEqual({
                    code: 404,
                    message: 'Book not found'
                });
            }

            // Test updateBook error format
            try {
                await BookService.updateBook(999, {}, 'user123');
            } catch (error) {
                expect(error).toEqual({
                    code: 404,
                    message: 'Book not found'
                });
            }

            // Test deleteBook error format
            try {
                await BookService.deleteBook(999, 'user123');
            } catch (error) {
                expect(error).toEqual({
                    code: 404,
                    message: 'Book not found'
                });
            }
        });
    });
});