const express = require('express');
const userRoutes = require('./userRoutes');
const bookRoutes = require('./bookRoutes');
const router = express.Router();

router.use('/books', bookRoutes);
router.use('/user', userRoutes);

module.exports = router;