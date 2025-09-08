// src/services/notificationService.js
const notificationEmitter = require("../utils/notificationEmitter");
const emailService = require("./emailService");
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    notificationEmitter.on("bookCreated", async (users, book, addedBy) => {
      try {
        logger.info('Sending book creation notifications...');
        await emailService.sendNewBookNotification(users, book, addedBy);
        logger.info('Book notification emails sent successfully');
      } catch (err) {
        logger.error('Failed to send email notifications:', err);
      }
    });
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;