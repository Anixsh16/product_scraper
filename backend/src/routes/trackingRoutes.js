const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');

// GET /api/tracked-products
router.get('/', trackingController.getAll);

// POST /api/tracked-products
router.post('/', trackingController.create);

// GET /api/tracked-products/:id
router.get('/:id', trackingController.getById);

// PATCH /api/tracked-products/:id
router.patch('/:id', trackingController.update);

// GET /api/tracked-products/:id/history
router.get('/:id/history', trackingController.getHistory);

// GET /api/tracked-products/:id/logs
router.get('/:id/logs', trackingController.getLogs);

module.exports = router;
