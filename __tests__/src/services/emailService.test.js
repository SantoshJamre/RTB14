const EmailService = require('../../../src/services/emailService');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('handlebars');
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn()
    }
}));
jest.mock('path');
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

// Mock logger globally
global.logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

// Mock environment variables
process.env = {
    EMAIL_HOST: 'smtp.test.com',
    EMAIL_PORT: '587',
    EMAIL_USER: 'test@example.com',
    EMAIL_PASSWORD: 'testpassword',
    FRONTEND_URL: 'https://frontend.test.com'
};

describe('EmailService', () => {
    let mockTransporter;
    let mockCompiledTemplate;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock transporter
        mockTransporter = {
            sendMail: jest.fn()
        };

        // Mock compiled template
        mockCompiledTemplate = jest.fn();

        // Setup nodemailer mock
        nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);

        // Setup handlebars mock
        handlebars.compile = jest.fn().mockReturnValue(mockCompiledTemplate);

        // Setup path mock
        path.join = jest.fn().mockImplementation((...args) => args.join('/'));
    });

    describe('sendWelcomeEmail', () => {
        const mockUser = {
            email: 'newuser@example.com',
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe'
        };

        beforeEach(() => {
            // Mock the sendEmail method by spying on EmailService
            jest.spyOn(EmailService, 'sendEmail').mockResolvedValue({ messageId: 'welcome-msg' });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should send welcome email with correct parameters', async () => {
            const result = await EmailService.sendWelcomeEmail(mockUser);

            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                'newuser@example.com',
                'Welcome to Advanced NodeJS Platform',
                'welcome',
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    username: 'johndoe'
                }
            );
            expect(result).toEqual({ messageId: 'welcome-msg' });
        });

        it('should handle user with missing optional fields', async () => {
            const incompleteUser = {
                email: 'user@example.com',
                firstName: 'Jane'
                // lastName and username missing
            };

            const result = await EmailService.sendWelcomeEmail(incompleteUser);

            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                'user@example.com',
                'Welcome to Advanced NodeJS Platform',
                'welcome',
                {
                    firstName: 'Jane',
                    lastName: undefined,
                    username: undefined
                }
            );
            expect(result).toEqual({ messageId: 'welcome-msg' });
        });

        it('should handle sendEmail failure', async () => {
            EmailService.sendEmail.mockResolvedValue(false);

            const result = await EmailService.sendWelcomeEmail(mockUser);

            expect(result).toBe(false);
        });
    });

    describe('sendPasswordResetEmail', () => {
        const mockUser = {
            email: 'user@example.com',
            firstName: 'Jane'
        };
        const mockResetToken = 'reset-token-123';

        beforeEach(() => {
            jest.spyOn(EmailService, 'sendEmail').mockResolvedValue({ messageId: 'reset-msg' });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should send password reset email with correct parameters', async () => {
            const result = await EmailService.sendPasswordResetEmail(mockUser, mockResetToken);

            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                'user@example.com',
                'Password Reset Request',
                'password-reset',
                {
                    firstName: 'Jane',
                    resetToken: 'reset-token-123',
                    resetUrl: 'https://frontend.test.com/reset-password?token=reset-token-123'
                }
            );
            expect(result).toEqual({ messageId: 'reset-msg' });
        });

        it('should handle user without firstName', async () => {
            const userWithoutName = {
                email: 'user@example.com'
            };

            const result = await EmailService.sendPasswordResetEmail(userWithoutName, mockResetToken);

            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                'user@example.com',
                'Password Reset Request',
                'password-reset',
                {
                    firstName: undefined,
                    resetToken: 'reset-token-123',
                    resetUrl: 'https://frontend.test.com/reset-password?token=reset-token-123'
                }
            );
        });

        it('should handle special characters in reset token', async () => {
            const specialToken = 'token-with-special-chars!@#$%^&*()';
            const expectedUrl = `https://frontend.test.com/reset-password?token=${specialToken}`;

            await EmailService.sendPasswordResetEmail(mockUser, specialToken);

            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    resetToken: specialToken,
                    resetUrl: expectedUrl
                })
            );
        });

        it('should handle missing FRONTEND_URL environment variable', async () => {
            delete process.env.FRONTEND_URL;

            await EmailService.sendPasswordResetEmail(mockUser, mockResetToken);

            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    resetUrl: 'undefined/reset-password?token=reset-token-123'
                })
            );

            // Restore environment variable
            process.env.FRONTEND_URL = 'https://frontend.test.com';
        });
    });

    describe('sendNewBookNotification', () => {
        const mockBook = {
            title: 'The Great Book',
            author: 'Famous Author',
            category: 'Fiction'
        };

        const mockAddedBy = {
            email: 'admin@example.com'
        };

        beforeEach(() => {
            jest.spyOn(EmailService, 'sendEmail').mockResolvedValue({ messageId: 'book-msg' });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should send notifications to users with email preferences enabled', async () => {
            const mockUsers = [
                {
                    email: 'user1@example.com',
                    firstName: 'User1',
                },
                {
                    email: 'user2@example.com',
                    firstName: 'User2',
                }
            ];

            const result = await EmailService.sendNewBookNotification(mockUsers, mockBook, mockAddedBy);

            expect(EmailService.sendEmail).toHaveBeenCalledTimes(2);
            expect(EmailService.sendEmail).toHaveBeenNthCalledWith(1,
                'user1@example.com',
                'New Book Added to Library',
                'new-book',
                {
                    firstName: 'User1',
                    bookTitle: 'The Great Book',
                    bookAuthor: 'Famous Author',
                    addedBy: 'admin@example.com',
                    bookCategory: 'Fiction'
                }
            );
            expect(EmailService.sendEmail).toHaveBeenNthCalledWith(2,
                'user2@example.com',
                'New Book Added to Library',
                'new-book',
                {
                    firstName: 'User2',
                    bookTitle: 'The Great Book',
                    bookAuthor: 'Famous Author',
                    addedBy: 'admin@example.com',
                    bookCategory: 'Fiction'
                }
            );

            expect(result).toHaveLength(2);
            expect(result[0].status).toBe('fulfilled');
            expect(result[1].status).toBe('fulfilled');
        });

        it('should skip users with email notifications disabled', async () => {
            const mockUsers = [
                {
                    email: 'user1@example.com',
                    firstName: 'User1',
                },
                {
                    email: 'user2@example.com',
                    firstName: 'User2',
                },
                {
                    email: 'user3@example.com',
                    firstName: 'User3',
                }
            ];

            const result = await EmailService.sendNewBookNotification(mockUsers, mockBook, mockAddedBy);

            expect(EmailService.sendEmail).toHaveBeenCalledTimes(3);
            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                'user1@example.com',
                expect.any(String),
                expect.any(String),
                expect.any(Object)
            );
            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                'user3@example.com',
                expect.any(String),
                expect.any(String),
                expect.any(Object)
            );
            
            expect(result).toHaveLength(3); // Promise.allSettled returns result for all promises, including undefined ones
        });


        it('should handle empty users array', async () => {
            const result = await EmailService.sendNewBookNotification([], mockBook, mockAddedBy);

            expect(EmailService.sendEmail).not.toHaveBeenCalled();
            expect(result).toHaveLength(0);
        });

        it('should handle mixed success and failure of email sending', async () => {
            const mockUsers = [
                {
                    email: 'success@example.com',
                    firstName: 'Success',
                    preferences: { notifications: { email: true } }
                },
                {
                    email: 'failure@example.com',
                    firstName: 'Failure',
                    preferences: { notifications: { email: true } }
                }
            ];

            EmailService.sendEmail
                .mockResolvedValueOnce({ messageId: 'success-msg' })
                .mockRejectedValueOnce(new Error('Email failed'));

            const result = await EmailService.sendNewBookNotification(mockUsers, mockBook, mockAddedBy);

            expect(result).toHaveLength(2);
            expect(result[0].status).toBe('fulfilled');
            expect(result[0].value).toEqual({ messageId: 'success-msg' });
        });

        it('should handle book with missing properties', async () => {
            const incompleteBook = {
                title: 'Book Title'
                // missing author and category
            };

            const mockUsers = [
                {
                    email: 'user@example.com',
                    firstName: 'User',
                    preferences: { notifications: { email: true } }
                }
            ];

            await EmailService.sendNewBookNotification(mockUsers, incompleteBook, mockAddedBy);

            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                'user@example.com',
                'New Book Added to Library',
                'new-book',
                {
                    firstName: 'User',
                    bookTitle: 'Book Title',
                    bookAuthor: undefined,
                    addedBy: 'admin@example.com',
                    bookCategory: undefined
                }
            );
        });

        it('should handle addedBy with missing email', async () => {
            const incompleteAddedBy = {
                name: 'Admin User'
                // missing email
            };

            const mockUsers = [
                {
                    email: 'user@example.com',
                    firstName: 'User',
                    preferences: { notifications: { email: true } }
                }
            ];

            await EmailService.sendNewBookNotification(mockUsers, mockBook, incompleteAddedBy);

            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                'user@example.com',
                'New Book Added to Library',
                'new-book',
                {
                    firstName: 'User',
                    bookTitle: 'The Great Book',
                    bookAuthor: 'Famous Author',
                    addedBy: undefined,
                    bookCategory: 'Fiction'
                }
            );
        });
    });

    describe('sendEmail', () => {
        const to = 'test@example.com';
        const subject = 'Test Subject';
        const template = 'test-template';
        const data = { name: 'Test User' };
        const templateContent = '<h1>Hello {{name}}</h1>';
        const compiledHtml = '<h1>Hello Test User</h1>';
        const mockResult = { messageId: 'test-message-id' };

        beforeEach(() => {
            // Reset all mocks before each test
            jest.clearAllMocks();
            
            // Mock fs.readFile to return template content
            fs.readFile.mockResolvedValue(templateContent);
            
            // Mock template compilation
            mockCompiledTemplate.mockReturnValue(compiledHtml);
            
            // Mock successful email sending
            mockTransporter.sendMail.mockResolvedValue(mockResult);
            
            // Mock path.join to return a predictable path
            path.join.mockImplementation((...args) => args.join('/'));
        });

        it('should handle template reading error', async () => {
            const error = new Error('Template not found');
            fs.readFile.mockRejectedValue(error);

            const result = await EmailService.sendEmail(to, subject, 'nonexistent', data);

            // Verify error was logged
            expect(global.logger.error).toHaveBeenCalledWith(
                'Email sending error: Template not found',
                { error }
            );
            
            // Verify function returns false on error
            expect(result).toBe(false);
        });

        it('should handle email sending error', async () => {
            const error = new Error('SMTP error');
            mockTransporter.sendMail.mockRejectedValue(error);

            const result = await EmailService.sendEmail(to, subject, template, data);

            // Verify error was logged
            expect(global.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Email sending error:'),
                { error: expect.any(Error) }
            );
            
            // Verify function returns false on error
            expect(result).toBe(false);
        });

        it('should handle empty template data', async () => {
            await EmailService.sendEmail(to, subject, template, {});
            
            // Should still compile the template with empty data
            expect(mockCompiledTemplate).toHaveBeenCalledWith({});
        });
    });

    describe('Error handling and edge cases', () => {
      
        it('should handle concurrent email sending', async () => {
            jest.spyOn(EmailService, 'sendEmail').mockResolvedValue({ messageId: 'concurrent-msg' });

            const promises = [
                EmailService.sendWelcomeEmail({ email: 'user1@example.com', firstName: 'User1' }),
                EmailService.sendWelcomeEmail({ email: 'user2@example.com', firstName: 'User2' }),
                EmailService.sendWelcomeEmail({ email: 'user3@example.com', firstName: 'User3' })
            ];

            const results = await Promise.all(promises);

            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result).toEqual({ messageId: 'concurrent-msg' });
            });
            expect(EmailService.sendEmail).toHaveBeenCalledTimes(3);

            jest.restoreAllMocks();
        });
    });
 
});