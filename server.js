require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const routes = require('./src/routes/apiRoutes/index.js');
const viewRoutes = require('./src/routes/viewRoutes/viewRoutes.js');
const { errorHandler, notFoundHandler } = require('./src/utils/errorHandling.js');
const databaseConnector = require('./src/connectors/database.js');
const createBookModel = require('./src/models/Book');
const path = require('path');
const exphbs = require('express-handlebars');
const logger = require('./src/utils/logger.js');
// Import notification service to initialize event listeners
require('./src/services/notificationService');

// Session store
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: 'sessions',
  expires: 1000 * 60 * 60 * 24 * 7, // 1 week
  connectionOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
});

// Catch session store errors
store.on('error', function(error) {
  logger.error('Session store error:', error);
});

const app = express();
global.ErrorCodes = require('./src/constant/errorCodes.js');
global.logger = logger;

// Set NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const port = process.env.PORT || 5001;

// Configure Handlebars to use .hbs templates from src/templates
const hbsEngine = exphbs.create({
  defaultLayout: 'main',
  extname: '.hbs',
  helpers: {
    formatDate: function(date) {
      if (!date) return '';
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    getUsername: function(email) {
      if (!email) return '';
      const parts = email.split('@');
      return parts[0] || '';
    },
    includes: function(string, substring) {
      return string && string.includes ? string.includes(substring) : false;
    }
  }
});

app.engine('hbs', hbsEngine.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'src', 'templates'));

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Make user data available to all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging for development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info('--- Request ---');
    logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    logger.info('Headers:', req.headers);
    if (Object.keys(req.body).length > 0) logger.info('Body:', req.body);
    if (Object.keys(req.query).length > 0) logger.info('Query:', req.query);
    if (Object.keys(req.params).length > 0) logger.info('Params:', req.params);
    logger.info('---------------');
    next();
  });
}

// API routes
app.use('/api', routes);

// View routes
app.use('/', viewRoutes);

// 404 handler for unhandled routes
app.all('*', notFoundHandler);

// Handle Chrome DevTools configuration
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(200).json({});
});

// Global error handler
app.use(errorHandler);

async function startServer() {
  try {
    await databaseConnector.initializeDatabases();
    const sequelize = databaseConnector.getSequelizeConnection();
    const Book = createBookModel(sequelize);
    global.Book = Book;
    await Book.sync();
    
    app.listen(port, () => {
      logger.info(`API is listening on port ${port}: http://localhost:${port}/`);
      logger.info('MongoDB and MySQL databases connected successfully');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;

