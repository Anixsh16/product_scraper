const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products/search?q=
router.get('/search', productController.search);

module.exports = router;
