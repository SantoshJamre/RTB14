const express = require('express');

const routes = express.Router();


// View Routes
routes.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/books');
  }
  res.redirect('/login');
});

// Login page route
routes.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('login', {
    title: 'Login',
    user: req.session.user || null,
    layout: 'main' // Use the correct layout path
  });
});

// Profile page route
routes.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // You might want to fetch fresh user data from the database here
  // For now, we'll use the session data
  res.render('profile', {
    title: 'My Profile',
    user: req.session.user,
    layout: 'main'
  });
});

// Logout route
routes.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      logger.error('Error destroying session:', { error: err });
      return res.status(500).send('Error logging out');
    }
    // Clear the session cookie
    res.clearCookie('connect.sid');
    // Redirect to login page
    res.redirect('/login');
  });
});

routes.get('/books', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('books', {
    title: 'Book Listing',
    user: req.session.user || null,
    layout: 'main'
  });
});

// API Status
routes.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// View routes
routes.get('/login', (req, res) => {
  res.render('login', { layout: false });
});

routes.get('/register', (req, res) => {
  res.render('register', { layout: false });
});

// Forgot password
routes.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

module.exports = routes;