# Database Setup Guide

## Prerequisites

Before running the application, you need to set up the required databases:

### 1. MongoDB Setup
- Download and install MongoDB Community Server from https://www.mongodb.com/try/download/community
- Start MongoDB service:
  ```bash
  # Windows (as Administrator)
  net start MongoDB
  
  # Or start manually
  mongod --dbpath "C:\data\db"
  ```
- MongoDB will run on `mongodb://localhost:27017`

### 2. MySQL Setup
- Download and install MySQL Server from https://dev.mysql.com/downloads/mysql/
- During installation, set root password (leave empty for development)
- Start MySQL service:
  ```bash
  # Windows (as Administrator)
  net start MySQL80
  ```
- Create the database:
  ```sql
  CREATE DATABASE advanced_nodejs_books;
  ```

### 3. Environment Configuration
Update the `.env` file with your actual database credentials:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/advanced_nodejs_users

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=advanced_nodejs_books
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_mysql_password

# Email (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

## Quick Start (Without Database Setup)

If you want to test the API structure without setting up databases, you can:

1. Comment out database connections in `server.js`
2. Use the provided Postman collection to see API structure
3. Set up databases later when ready for full functionality

## Running the Application

```bash
# Install dependencies
npm install

# Start the server
npm start

# For development with auto-reload
npm run dev
```

## Testing with Postman

1. Import `postman_collection.json` into Postman
2. The collection includes all API endpoints with sample data
3. Environment variables are pre-configured for localhost:4000

## API Endpoints Overview

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Reset password
- `POST /auth/logout` - User logout

### Books (Requires Authentication)
- `GET /books` - List books with search/filter/pagination
- `GET /books/:id` - Get specific book
- `POST /books` - Add new book
- `PUT /books/:id` - Update book
- `DELETE /books/:id` - Delete book
- `GET /books/categories` - Get all categories

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Ensure MongoDB service is running
   - Check if port 27017 is available
   - Verify MONGODB_URI in .env

2. **MySQL Connection Error**
   - Ensure MySQL service is running
   - Check credentials in .env file
   - Create the database if it doesn't exist

3. **Email Service Error**
   - Email functionality is optional
   - Update EMAIL_* variables in .env for notifications
   - Use app passwords for Gmail

### Database Status Check:

```bash
# Check if MongoDB is running
mongo --eval "db.stats()"

# Check if MySQL is running
mysql -u root -p -e "SELECT 1"
```
