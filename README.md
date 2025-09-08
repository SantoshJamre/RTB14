# Advanced NodeJS RESTful API

A comprehensive RESTful API server built with Node.js, Express.js, MongoDB (for users), and MySQL (for books) with JWT authentication, email notifications, and real-time features.

## Features

### Authentication & Authorization
- User registration with email verification
- JWT-based authentication (access & refresh tokens)
- Password reset functionality
- Role-based access control
- Secure logout with token invalidation

### Book Management
- CRUD operations for books
- Advanced search and filtering (by title, author, category)
- Sorting by published date
- Pagination support
- Real-time email notifications when new books are added

### Email System
- Welcome emails for new users
- Password reset emails
- New book notification emails
- Handlebars template engine for dynamic content

## Tech Stack

- **Backend**: Node.js, Express.js
- **Databases**: 
  - MongoDB (User management with Mongoose)
  - MySQL (Book management with Sequelize ORM)
- **Authentication**: JWT (jsonwebtoken)
- **Email**: Nodemailer with Handlebars templates
- **Validation**: Express-validator, Joi
- **Security**: bcryptjs for password hashing

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
PORT=4000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/advanced_nodejs_users
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=advanced_nodejs_books
MYSQL_USERNAME=root
MYSQL_PASSWORD=password

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
```

4. Start the server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/logout` - Logout user

### Books (Authenticated Routes)
- `GET /books` - Get all books with filtering, searching, sorting, pagination
- `GET /books/:id` - Get book by ID
- `POST /books` - Add new book (triggers email notifications)
- `PUT /books/:id` - Update book
- `DELETE /books/:id` - Delete book
- `GET /books/categories` - Get all book categories

### Query Parameters for Books
- `search` - Search in title and author
- `author` - Filter by author
- `category` - Filter by category
- `sortBy` - Sort field (default: published_date)
- `sortOrder` - ASC or DESC (default: DESC)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

## Database Schema

### User (MongoDB)
```javascript
{
  firstName: String,
  lastName: String,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  role: String (user/admin),
  isActive: Boolean,
  isEmailVerified: Boolean,
  profile: {
    age: Number,
    gender: String,
    avatar: String,
    phone: String,
    address: Object
  },
  preferences: {
    language: String,
    theme: String,
    notifications: Object
  }
}
```

### Book (MySQL)
```javascript
{
  id: Integer (Primary Key),
  title: String,
  author: String,
  pdf_url: String,
  published_date: Date,
  category: String,
  description: Text,
  isbn: String,
  pages: Integer,
  language: String,
  isActive: Boolean,
  addedBy: String (User ID)
}
```

## Postman Collection

Import the `postman_collection.json` file into Postman to test all API endpoints. The collection includes:
- Pre-configured environment variables
- Automatic token management
- Sample requests for all endpoints

## Error Handling

All endpoints return consistent error responses:
```json
{
  "code": 400,
  "message": "Error description",
  "errors": [] // For validation errors
}
```

## Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Input validation and sanitization
- CORS enabled
- Comprehensive error handling
- SQL injection prevention with Sequelize
- NoSQL injection prevention with Mongoose

## Email Templates

The system uses Handlebars templates for emails:
- Welcome email for new registrations
- Password reset email with secure tokens
- New book notification emails

## Development

Run with nodemon for development:
```bash
npm run dev
```

## License

ISC