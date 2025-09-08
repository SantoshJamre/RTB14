const Handlebars = require('hbs');

// Mock hbs to capture registered helpers
jest.mock('hbs', () => {
    const mockHandlebars = {
        registerHelper: jest.fn(),
        helpers: {}
    };
    
    // Store helpers when they're registered
    mockHandlebars.registerHelper.mockImplementation((name, fn) => {
        mockHandlebars.helpers[name] = fn;
    });
    
    return mockHandlebars;
});

// Import the module to trigger helper registration
const handlebarsHelpers = require('../../../src/helpers/hbsHelpers'); // Adjust path as needed

describe('Handlebars Helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUsername helper', () => {
        let getUsernameHelper;

        beforeAll(() => {
            // Get the registered helper function
            getUsernameHelper = Handlebars.helpers['getUsername'];
        });

        it('should extract username from valid email', () => {
            const result = getUsernameHelper('user@example.com');
            
            expect(result).toBe('user');
        });

        it('should extract complex username from email', () => {
            const result = getUsernameHelper('user.name+test@domain.co.uk');
            
            expect(result).toBe('user.name+test');
        });

        it('should return empty string when email is null', () => {
            const result = getUsernameHelper(null);
            
            expect(result).toBe('');
        });

        it('should return empty string when email is undefined', () => {
            const result = getUsernameHelper(undefined);
            
            expect(result).toBe('');
        });

        it('should return empty string when email is empty string', () => {
            const result = getUsernameHelper('');
            
            expect(result).toBe('');
        });

        it('should handle email starting with @', () => {
            const result = getUsernameHelper('@example.com');
            
            expect(result).toBe('');
        });

        it('should handle email without @ symbol', () => {
            const result = getUsernameHelper('invalidemail');
            
            expect(result).toBe('invalidemail');
        });

        it('should handle email with multiple @ symbols', () => {
            const result = getUsernameHelper('user@test@example.com');
            
            expect(result).toBe('user');
        });
    });

    describe('includes helper', () => {
        let includesHelper;

        beforeAll(() => {
            // Get the registered helper function
            includesHelper = Handlebars.helpers['includes'];
        });

        it('should return true when string includes substring', () => {
            const result = includesHelper('hello world', 'world');
            
            expect(result).toBe(true);
        });

        it('should return true for exact match', () => {
            const result = includesHelper('test', 'test');
            
            expect(result).toBe(true);
        });

        it('should return false when string does not include substring', () => {
            const result = includesHelper('hello world', 'planet');
            
            expect(result).toBe(false);
        });

        it('should be case sensitive', () => {
            const result = includesHelper('Hello World', 'hello');
            
            expect(result).toBe(false);
        });

        it('should return false when string is null', () => {
            const result = includesHelper(null, 'test');
            
            expect(result).toBe(false);
        });

        it('should return false when string is undefined', () => {
            const result = includesHelper(undefined, 'test');
            
            expect(result).toBe(false);
        });

        it('should return false when string is empty', () => {
            const result = includesHelper('', 'test');
            
            expect(result).toBe(false);
        });

        it('should return true when searching for empty string in non-empty string', () => {
            const result = includesHelper('hello', '');
            
            expect(result).toBe(true);
        });

        it('should handle string without includes method gracefully', () => {
            const stringWithoutIncludes = Object.create(null);
            stringWithoutIncludes.toString = () => 'test string';
            
            const result = includesHelper(stringWithoutIncludes, 'test');
            
            expect(result).toBe(false);
        });

        it('should handle number as string parameter', () => {
            const result = includesHelper(12345, '23');
            
            expect(result).toBe(false); // numbers don't have includes method
        });
    });

    describe('edge cases and integration', () => {
        it('should handle both helpers working together conceptually', () => {
            const getUsernameHelper = Handlebars.helpers['getUsername'];
            const includesHelper = Handlebars.helpers['includes'];
            
            const email = 'admin@company.com';
            const username = getUsernameHelper(email);
            const hasAdminRole = includesHelper(username, 'admin');
            
            expect(username).toBe('admin');
            expect(hasAdminRole).toBe(true);
        });

        it('should handle special characters in email username', () => {
            const getUsernameHelper = Handlebars.helpers['getUsername'];
            
            const result = getUsernameHelper('user.name+tag@example.com');
            
            expect(result).toBe('user.name+tag');
        });

        it('should handle includes with special characters', () => {
            const includesHelper = Handlebars.helpers['includes'];
            
            const result = includesHelper('Hello, World!', '!');
            
            expect(result).toBe(true);
        });
    });
});
