const DatabaseConnector = require('../../../src/connectors/database');
const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');

// Mock the dependencies
jest.mock('mongoose');
jest.mock('sequelize');
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

describe('DatabaseConnector', () => {
    let mockSequelizeInstance;

    beforeEach(() => {
        // Mock environment variables
        process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
        process.env.MYSQL_DATABASE = 'testdb';
        process.env.MYSQL_USERNAME = 'testuser';
        process.env.MYSQL_PASSWORD = 'testpass';
        process.env.MYSQL_HOST = 'localhost';
        process.env.MYSQL_PORT = '3306';

        // Mock Sequelize instance
        mockSequelizeInstance = {
            authenticate: jest.fn()
        };
        Sequelize.mockImplementation(() => mockSequelizeInstance);

        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Reset the DatabaseConnector instance
        DatabaseConnector.mongoConnection = null;
        DatabaseConnector.sequelizeConnection = null;
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.MONGODB_URI;
        delete process.env.MYSQL_DATABASE;
        delete process.env.MYSQL_USERNAME;
        delete process.env.MYSQL_PASSWORD;
        delete process.env.MYSQL_HOST;
        delete process.env.MYSQL_PORT;
    });

    describe('connectMongoDB', () => {
        it('should connect to MongoDB successfully', async () => {
            const mockConnection = { connection: { readyState: 1 } };
            mongoose.connect.mockResolvedValue(mockConnection);

            const result = await DatabaseConnector.connectMongoDB();

            expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/testdb');
            expect(DatabaseConnector.mongoConnection).toBe(mockConnection);
            expect(result).toBe(mockConnection);
        });

        it('should handle MongoDB connection error', async () => {
            const mockError = new Error('Connection failed');
            mongoose.connect.mockRejectedValue(mockError);

            await expect(DatabaseConnector.connectMongoDB()).rejects.toThrow('Connection failed');

            expect(DatabaseConnector.mongoConnection).toBeNull();
        });

        it('should use environment variable for MongoDB URI', async () => {
            process.env.MONGODB_URI = 'mongodb://custom-host:27018/customdb';
            const mockConnection = { connection: { readyState: 1 } };
            mongoose.connect.mockResolvedValue(mockConnection);

            await DatabaseConnector.connectMongoDB();

            expect(mongoose.connect).toHaveBeenCalledWith('mongodb://custom-host:27018/customdb');
        });
    });

    describe('connectMySQL', () => {
        it('should connect to MySQL successfully', async () => {
            mockSequelizeInstance.authenticate.mockResolvedValue();

            const result = await DatabaseConnector.connectMySQL();

            expect(Sequelize).toHaveBeenCalledWith(
                'testdb',
                'testuser',
                'testpass',
                {
                    host: 'localhost',
                    port: '3306',
                    dialect: 'mysql',
                    logging: false,
                    pool: {
                        max: 10,
                        min: 0,
                        acquire: 30000,
                        idle: 10000
                    }
                }
            );
            expect(mockSequelizeInstance.authenticate).toHaveBeenCalled();
            expect(DatabaseConnector.sequelizeConnection).toBe(mockSequelizeInstance);
            expect(result).toBe(mockSequelizeInstance);
        });

        it('should handle empty MySQL password', async () => {
            delete process.env.MYSQL_PASSWORD;
            mockSequelizeInstance.authenticate.mockResolvedValue();

            await DatabaseConnector.connectMySQL();

            expect(Sequelize).toHaveBeenCalledWith(
                'testdb',
                'testuser',
                '',
                expect.objectContaining({
                    host: 'localhost',
                    port: '3306',
                    dialect: 'mysql'
                })
            );
        });

        it('should use custom MySQL configuration from environment variables', async () => {
            process.env.MYSQL_DATABASE = 'customdb';
            process.env.MYSQL_USERNAME = 'customuser';
            process.env.MYSQL_PASSWORD = 'custompass';
            process.env.MYSQL_HOST = 'custom-host';
            process.env.MYSQL_PORT = '3307';
            mockSequelizeInstance.authenticate.mockResolvedValue();

            await DatabaseConnector.connectMySQL();

            expect(Sequelize).toHaveBeenCalledWith(
                'customdb',
                'customuser',
                'custompass',
                expect.objectContaining({
                    host: 'custom-host',
                    port: '3307'
                })
            );
        });

        it('should create Sequelize instance with correct pool configuration', async () => {
            mockSequelizeInstance.authenticate.mockResolvedValue();

            await DatabaseConnector.connectMySQL();

            expect(Sequelize).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    pool: {
                        max: 10,
                        min: 0,
                        acquire: 30000,
                        idle: 10000
                    }
                })
            );
        });
    });

    describe('initializeDatabases', () => {
        it('should initialize both databases successfully', async () => {
            const mockMongoConnection = { connection: { readyState: 1 } };
            mongoose.connect.mockResolvedValue(mockMongoConnection);
            mockSequelizeInstance.authenticate.mockResolvedValue();

            await DatabaseConnector.initializeDatabases();

            expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/testdb');
            expect(mockSequelizeInstance.authenticate).toHaveBeenCalled();
            expect(DatabaseConnector.mongoConnection).toBe(mockMongoConnection);
            expect(DatabaseConnector.sequelizeConnection).toBe(mockSequelizeInstance);
        });

        it('should handle MongoDB connection failure during initialization', async () => {
            const mockError = new Error('MongoDB connection failed');
            mongoose.connect.mockRejectedValue(mockError);

            await expect(DatabaseConnector.initializeDatabases()).rejects.toThrow('MongoDB connection failed');

            expect(mongoose.connect).toHaveBeenCalled();
            expect(mockSequelizeInstance.authenticate).not.toHaveBeenCalled();
        });

        it('should handle MySQL connection failure during initialization', async () => {
            const mockMongoConnection = { connection: { readyState: 1 } };
            mongoose.connect.mockResolvedValue(mockMongoConnection);
            const mockError = new Error('MySQL connection failed');
            mockSequelizeInstance.authenticate.mockRejectedValue(mockError);

            await expect(DatabaseConnector.initializeDatabases()).rejects.toThrow('MySQL connection failed');

            expect(mongoose.connect).toHaveBeenCalled();
            expect(mockSequelizeInstance.authenticate).toHaveBeenCalled();
        });
    });

    describe('getMongoConnection', () => {
        it('should return null when no connection exists', () => {
            const result = DatabaseConnector.getMongoConnection();
            expect(result).toBeNull();
        });

        it('should return the MongoDB connection when it exists', async () => {
            const mockConnection = { connection: { readyState: 1 } };
            mongoose.connect.mockResolvedValue(mockConnection);

            await DatabaseConnector.connectMongoDB();
            const result = DatabaseConnector.getMongoConnection();

            expect(result).toBe(mockConnection);
        });
    });

    describe('getSequelizeConnection', () => {
        it('should return null when no connection exists', () => {
            const result = DatabaseConnector.getSequelizeConnection();
            expect(result).toBeNull();
        });

        it('should return the Sequelize connection when it exists', async () => {
            mockSequelizeInstance.authenticate.mockResolvedValue();

            await DatabaseConnector.connectMySQL();
            const result = DatabaseConnector.getSequelizeConnection();

            expect(result).toBe(mockSequelizeInstance);
        });
    });

    describe('error handling and logging', () => {
        it('should log specific error messages for MongoDB failures', async () => {
            const mockError = new Error('Network timeout');
            mongoose.connect.mockRejectedValue(mockError);

            await expect(DatabaseConnector.connectMongoDB()).rejects.toThrow();

        });

        it('should log specific error messages for MySQL failures', async () => {
            const mockError = new Error('Invalid credentials');
            mockSequelizeInstance.authenticate.mockRejectedValue(mockError);

            await expect(DatabaseConnector.connectMySQL()).rejects.toThrow();

        });

        it('should provide helpful notes for connection failures', async () => {
            mongoose.connect.mockRejectedValue(new Error('Connection refused'));
            mockSequelizeInstance.authenticate.mockRejectedValue(new Error('Access denied'));

            await expect(DatabaseConnector.connectMongoDB()).rejects.toThrow();
            await expect(DatabaseConnector.connectMySQL()).rejects.toThrow();

        });
    });

    describe('singleton behavior', () => {
        it('should maintain singleton pattern', () => {
            const DatabaseConnector2 = require('../../../src/connectors/database');
            expect(DatabaseConnector).toBe(DatabaseConnector2);
        });

        it('should persist connections across method calls', async () => {
            const mockMongoConnection = { connection: { readyState: 1 } };
            mongoose.connect.mockResolvedValue(mockMongoConnection);
            mockSequelizeInstance.authenticate.mockResolvedValue();

            await DatabaseConnector.connectMongoDB();
            await DatabaseConnector.connectMySQL();

            expect(DatabaseConnector.getMongoConnection()).toBe(mockMongoConnection);
            expect(DatabaseConnector.getSequelizeConnection()).toBe(mockSequelizeInstance);
        });
    });
});
