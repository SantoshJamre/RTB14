const express = require('express');
const bookController = require('../../controller/book/bookController');
const { authenticate } = require('../../middleware/auth');
const { createBookValidator, updateBookValidator } = require('../../validators/bookValidator');

const router = express.Router();

router.get('/', authenticate, bookController.getAllBooks);
router.get('/:id', authenticate, bookController.getBookById);
router.post('/', authenticate, createBookValidator, bookController.createBook);
router.put('/:id', authenticate, updateBookValidator, bookController.updateBook);
router.delete('/:id', authenticate, bookController.deleteBook);

module.exports = router;
