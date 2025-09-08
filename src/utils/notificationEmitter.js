// notificationEmitter.js
const EventEmitter = require("events");
class NotificationEmitter extends EventEmitter {}
module.exports = new NotificationEmitter();
