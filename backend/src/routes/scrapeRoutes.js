const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');
const { verifyCronSecret } = require('../middleware/authMiddleware');

// POST /api/scrape - Triggered every 2 hours by external scheduler (e.g. cron-job.org)
// Protected by CRON_SECRET token
router.post('/', verifyCronSecret, scrapeController.triggerScrapeAll);

// POST /api/scrape/all - Also allow manual trigger from frontend dashboard
router.post('/all', scrapeController.triggerScrapeAll);

// POST /api/scrape/single/:id - Manual trigger for a single product from UI
router.post('/single/:id', scrapeController.triggerScrapeSingle);

// GET /api/scrape/status - Status check
router.get('/status', scrapeController.getStatus);

// GET /api/scrape/logs - Recent system-wide scrape logs
router.get('/logs', scrapeController.getLogs);

module.exports = router;
