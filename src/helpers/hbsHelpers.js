const Handlebars = require('hbs');

// Helper to extract username from email
Handlebars.registerHelper('getUsername', function(email) {
  if (!email) return '';
  const parts = email.split('@');
  return parts[0] || '';
});

// Helper to check if a string includes another string
Handlebars.registerHelper('includes', function(string, substring) {
  return string && string.includes ? string.includes(substring) : false;
});

module.exports = Handlebars;
