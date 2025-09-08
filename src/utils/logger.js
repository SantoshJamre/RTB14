require('dotenv').config();
const winston = require('winston');
const { combine, timestamp, printf } = winston.format;

// Create a format for the logs
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
    // Handle error objects
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaString}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.splat(),
        winston.format.errors({ stack: true }),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: 'log/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: 'log/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 2
        })
    ]
});

module.exports = logger;