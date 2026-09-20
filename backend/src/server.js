if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PORT, MOCK_STORE_URL } = require('./config/constants');
const { isSupabaseConfigured } = require('./config/supabase');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

const productRoutes = require('./routes/productRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const scrapeRoutes = require('./routes/scrapeRoutes');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// Root info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'INE Product Price Tracker API',
    status: 'running',
    frontend: 'http://localhost:3000',
    documentation: 'See README.md & DESIGN_NOTES.md',
    endpoints: {
      health: 'GET /api/health',
      catalogSearch: 'GET /api/products/search?q={query}',
      trackedProducts: 'GET /api/tracked-products',
      trackProduct: 'POST /api/tracked-products',
      priceHistory: 'GET /api/tracked-products/:id/history',
      scrapeAll: 'POST /api/scrape/all',
      scrapeSingle: 'POST /api/scrape/single/:id',
      scrapeLogs: 'GET /api/scrape/logs',
      scheduledScrape: 'POST /api/scrape (Requires Bearer CRON_SECRET)',
    },
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: isSupabaseConfigured() ? 'connected (Supabase)' : 'in-memory fallback (configure .env)',
    mockStoreUrl: MOCK_STORE_URL,
  });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/tracked-products', trackingRoutes);
app.use('/api/scrape', scrapeRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`===================================================`);
  logger.info(`  INE Product Price Tracker Backend API`);
  logger.info(`  Server running on http://localhost:${PORT}`);
  logger.info(`  Database: ${isSupabaseConfigured() ? 'Supabase' : 'In-Memory Fallback'}`);
  logger.info(`  Target Mock Store: ${MOCK_STORE_URL}`);
  logger.info(`===================================================`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

module.exports = app;
