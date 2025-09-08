const messagesConfig = require('../../../src/constant/errorCodes'); // Adjust path as needed

describe('Messages Configuration', () => {
    describe('module structure', () => {
        it('should export an object with message property', () => {
            expect(messagesConfig).toBeDefined();
            expect(typeof messagesConfig).toBe('object');
            expect(messagesConfig).toHaveProperty('message');
        });

        it('should have message property as an object', () => {
            expect(typeof messagesConfig.message).toBe('object');
            expect(messagesConfig.message).not.toBeNull();
        });
    });

    describe('HTTP 500 error message', () => {
        it('should contain 500 error configuration', () => {
            expect(messagesConfig.message).toHaveProperty('500');
        });

        it('should have correct structure for 500 error', () => {
            const error500 = messagesConfig.message['500'];
            
            expect(error500).toHaveProperty('message');
            expect(error500).toHaveProperty('code');
        });

        it('should have correct values for 500 error', () => {
            const error500 = messagesConfig.message['500'];
            
            expect(error500.message).toBe('Internal Server Error');
            expect(error500.code).toBe(500);
        });

        it('should have correct data types for 500 error properties', () => {
            const error500 = messagesConfig.message['500'];
            
            expect(typeof error500.message).toBe('string');
            expect(typeof error500.code).toBe('number');
        });
    });

    describe('HTTP 404 error message', () => {
        it('should contain 404 error configuration', () => {
            expect(messagesConfig.message).toHaveProperty('404');
        });

        it('should have correct structure for 404 error', () => {
            const error404 = messagesConfig.message['404'];
            
            expect(error404).toHaveProperty('message');
            expect(error404).toHaveProperty('code');
        });

        it('should have correct values for 404 error', () => {
            const error404 = messagesConfig.message['404'];
            
            expect(error404.message).toBe('Not Found');
            expect(error404.code).toBe(404);
        });

        it('should have correct data types for 404 error properties', () => {
            const error404 = messagesConfig.message['404'];
            
            expect(typeof error404.message).toBe('string');
            expect(typeof error404.code).toBe('number');
        });
    });

    describe('message consistency', () => {
        it('should have consistent structure across all error messages', () => {
            const messageKeys = Object.keys(messagesConfig.message);
            
            messageKeys.forEach(key => {
                const errorConfig = messagesConfig.message[key];
                expect(errorConfig).toHaveProperty('message');
                expect(errorConfig).toHaveProperty('code');
                expect(typeof errorConfig.message).toBe('string');
                expect(typeof errorConfig.code).toBe('number');
            });
        });

        it('should have matching codes between key and code property', () => {
            const messageKeys = Object.keys(messagesConfig.message);
            
            messageKeys.forEach(key => {
                const errorConfig = messagesConfig.message[key];
                expect(errorConfig.code).toBe(parseInt(key));
            });
        });

        it('should have non-empty message strings', () => {
            const messageKeys = Object.keys(messagesConfig.message);
            
            messageKeys.forEach(key => {
                const errorConfig = messagesConfig.message[key];
                expect(errorConfig.message).toBeTruthy();
                expect(errorConfig.message.length).toBeGreaterThan(0);
            });
        });
    });

 
    describe('error message accessibility', () => {
        it('should allow access via bracket notation', () => {
            expect(messagesConfig.message['500']).toBeDefined();
            expect(messagesConfig.message['404']).toBeDefined();
        });

        it('should allow access via dot notation for numeric properties', () => {
            expect(messagesConfig.message[500]).toBeDefined();
            expect(messagesConfig.message[404]).toBeDefined();
        });

        it('should return undefined for non-existent error codes', () => {
            expect(messagesConfig.message['999']).toBeUndefined();
        });
    });

    describe('configuration completeness', () => {
        it('should contain expected number of error configurations', () => {
            const messageKeys = Object.keys(messagesConfig.message);
            expect(messageKeys).toHaveLength(5);
        });

        it('should contain only expected error codes', () => {
            const messageKeys = Object.keys(messagesConfig.message);
            const expectedCodes = ['500', '404', '400', '401', '403'];
            
            expect(messageKeys.sort()).toEqual(expectedCodes.sort());
        });

        it('should not contain extra properties in error objects', () => {
            const messageKeys = Object.keys(messagesConfig.message);
            
            messageKeys.forEach(key => {
                const errorConfig = messagesConfig.message[key];
                const errorConfigKeys = Object.keys(errorConfig);
                expect(errorConfigKeys.sort()).toEqual(['message', 'code'].sort());
            });
        });
    });

});
