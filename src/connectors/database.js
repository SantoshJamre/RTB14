const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
require('dotenv').config();
const logger = require('../utils/logger');

class DatabaseConnector {
    constructor() {
        this.mongoConnection = null;
        this.sequelizeConnection = null;
    }

    async connectMongoDB() { 
        try {
            this.mongoConnection = await mongoose.connect(process.env.MONGODB_URI);
            logger.info('MongoDB connected successfully');
            return this.mongoConnection;
        } catch (error) {
            logger.error('MongoDB connection error:', error.message?.toString());
            logger.error('Note: Make sure MongoDB is running locally on port 27017');
            throw error;
        }
    }

    async connectMySQL() {
        try {
            this.sequelizeConnection = new Sequelize(
                process.env.MYSQL_DATABASE,
                process.env.MYSQL_USERNAME,
                process.env.MYSQL_PASSWORD || '',
                {
                    host: process.env.MYSQL_HOST,
                    port: process.env.MYSQL_PORT,
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

            await this.sequelizeConnection.authenticate();
            logger.info('MySQL connected successfully');
            return this.sequelizeConnection;
        } catch (error) {
            console.error('MySQL connection error:', error.message);
            logger.error('Note: Make sure MySQL is running and credentials are correct in .env file');
            throw error;
        }
    }

    async initializeDatabases() {
        await this.connectMongoDB();
        await this.connectMySQL();
    }

    getMongoConnection() {
        return this.mongoConnection;
    }

    getSequelizeConnection() {
        return this.sequelizeConnection;
    }
}

module.exports = new DatabaseConnector();
