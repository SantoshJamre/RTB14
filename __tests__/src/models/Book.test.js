const { DataTypes } = require('sequelize');
const createBookModel = require('../../../src/models/Book'); // Adjust path as needed

describe('createBookModel', () => {
    let sequelizeMock, defineMock;

    beforeEach(() => {
        defineMock = jest.fn().mockReturnValue({});
        sequelizeMock = {
            define: defineMock
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('model definition', () => {
        it('should define Book model with correct name and return model', () => {
            const result = createBookModel(sequelizeMock);

            expect(defineMock).toHaveBeenCalledTimes(1);
            expect(defineMock).toHaveBeenCalledWith('Book', expect.any(Object), expect.any(Object));
            expect(result).toBeDefined();
        });

        it('should define model with correct table options', () => {
            createBookModel(sequelizeMock);

            const [, , options] = defineMock.mock.calls[0];

            expect(options.tableName).toBe('books');
            expect(options.timestamps).toBe(true);
        });

        it('should define model with correct indexes', () => {
            createBookModel(sequelizeMock);

            const [, , options] = defineMock.mock.calls[0];

            expect(options.indexes).toHaveLength(4);
            expect(options.indexes).toEqual(
                expect.arrayContaining([
                    { fields: ['title'] },
                    { fields: ['author'] },
                    { fields: ['category'] },
                    { fields: ['published_date'] }
                ])
            );
        });
    });

    describe('attribute definitions', () => {
        let attributes;

        beforeEach(() => {
            createBookModel(sequelizeMock);
            [, attributes] = defineMock.mock.calls[0];
        });

        describe('id field', () => {
            it('should define id as primary key with auto increment', () => {
                expect(attributes.id).toEqual({
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                });
            });
        });

        describe('title field', () => {
            it('should define title as required string with validation', () => {
                expect(attributes.title.type).toBe(DataTypes.STRING);
                expect(attributes.title.allowNull).toBe(false);
                expect(attributes.title.validate).toEqual({
                    notEmpty: true,
                    len: [1, 255]
                });
            });
        });

        describe('author field', () => {
            it('should define author as required string with validation', () => {
                expect(attributes.author.type).toBe(DataTypes.STRING);
                expect(attributes.author.allowNull).toBe(false);
                expect(attributes.author.validate).toEqual({
                    notEmpty: true,
                    len: [1, 255]
                });
            });
        });

        describe('pdf_url field', () => {
            it('should define pdf_url as required text with validation', () => {
                expect(attributes.pdf_url.type).toBe(DataTypes.TEXT);
                expect(attributes.pdf_url.allowNull).toBe(false);
                expect(attributes.pdf_url.validate).toEqual({
                    notEmpty: true
                });
            });
        });

        describe('published_date field', () => {
            it('should define published_date as required date', () => {
                expect(attributes.published_date.type).toBe(DataTypes.DATE);
                expect(attributes.published_date.allowNull).toBe(false);
            });
        });

        describe('category field', () => {
            it('should define category as required string with length validation', () => {
                expect(attributes.category.type).toBe(DataTypes.STRING);
                expect(attributes.category.allowNull).toBe(false);
                expect(attributes.category.validate).toEqual({
                    notEmpty: true,
                    len: [1, 100]
                });
            });
        });

        describe('description field', () => {
            it('should define description as optional text field', () => {
                expect(attributes.description.type).toBe(DataTypes.TEXT);
                expect(attributes.description.allowNull).toBe(true);
                expect(attributes.description.validate).toBeUndefined();
            });
        });

        describe('isbn field', () => {
            it('should define isbn as optional unique string', () => {
                expect(attributes.isbn.type).toBe(DataTypes.STRING);
                expect(attributes.isbn.allowNull).toBe(true);
                expect(attributes.isbn.unique).toBe(true);
            });
        });

        describe('language field', () => {
            it('should define language as optional string with English default', () => {
                expect(attributes.language.type).toBe(DataTypes.STRING);
                expect(attributes.language.allowNull).toBe(true);
                expect(attributes.language.defaultValue).toBe('English');
            });
        });

        describe('isActive field', () => {
            it('should define isActive as boolean with true default', () => {
                expect(attributes.isActive.type).toBe(DataTypes.BOOLEAN);
                expect(attributes.isActive.defaultValue).toBe(true);
                expect(attributes.isActive.allowNull).toBeUndefined(); // Should default to false
            });
        });
    });

    describe('validation rules comprehensive check', () => {
        let attributes;

        beforeEach(() => {
            createBookModel(sequelizeMock);
            [, attributes] = defineMock.mock.calls[0];
        });

        it('should have all required fields configured as non-nullable', () => {
            const requiredFields = ['title', 'author', 'pdf_url', 'published_date', 'category'];
            
            requiredFields.forEach(field => {
                expect(attributes[field].allowNull).toBe(false);
            });
        });

        it('should have all optional fields configured as nullable', () => {
            const optionalFields = ['description', 'isbn', 'language'];
            
            optionalFields.forEach(field => {
                expect(attributes[field].allowNull).toBe(true);
            });
        });

        it('should have string length validations for text fields', () => {
            expect(attributes.title.validate.len).toEqual([1, 255]);
            expect(attributes.author.validate.len).toEqual([1, 255]);
            expect(attributes.category.validate.len).toEqual([1, 100]);
        });

        it('should have notEmpty validation for required text fields', () => {
            const fieldsWithNotEmpty = ['title', 'author', 'pdf_url', 'category'];
            
            fieldsWithNotEmpty.forEach(field => {
                expect(attributes[field].validate.notEmpty).toBe(true);
            });
        });
    });

    describe('data types verification', () => {
        let attributes;

        beforeEach(() => {
            createBookModel(sequelizeMock);
            [, attributes] = defineMock.mock.calls[0];
        });

        it('should use correct DataTypes for each field', () => {
            expect(attributes.id.type).toBe(DataTypes.INTEGER);
            expect(attributes.title.type).toBe(DataTypes.STRING);
            expect(attributes.author.type).toBe(DataTypes.STRING);
            expect(attributes.pdf_url.type).toBe(DataTypes.TEXT);
            expect(attributes.published_date.type).toBe(DataTypes.DATE);
            expect(attributes.category.type).toBe(DataTypes.STRING);
            expect(attributes.description.type).toBe(DataTypes.TEXT);
            expect(attributes.isbn.type).toBe(DataTypes.STRING);
            expect(attributes.language.type).toBe(DataTypes.STRING);
            expect(attributes.isActive.type).toBe(DataTypes.BOOLEAN);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle null sequelize parameter gracefully', () => {
            expect(() => {
                createBookModel(null);
            }).toThrow();
        });

        it('should handle sequelize without define method', () => {
            const invalidSequelize = {};
            
            expect(() => {
                createBookModel(invalidSequelize);
            }).toThrow();
        });

        it('should return the result of sequelize.define', () => {
            const mockModel = { name: 'Book' };
            defineMock.mockReturnValue(mockModel);

            const result = createBookModel(sequelizeMock);

            expect(result).toBe(mockModel);
        });
    });
});
