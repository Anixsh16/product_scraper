#!/usr/bin/env node

/**
 * Headed Scraper Runner for Live Demonstration & Video Recording.
 * Launches Playwright Chromium visibly with smooth pacing so every interaction
 * (page load, mouse movements, challenge resolution, price reveal, extraction)
 * can be clearly observed.
 *
 * Usage:
 *   npm run scrape:headed
 *   node src/scraper/headedRunner.js [product_id_or_url]
 */

const { scrapeProductPage } = require('./productScraper');
const { MOCK_STORE_URL } = require('../config/constants');
const logger = require('../utils/logger');

async function main() {
  console.log('\n========================================================');
  console.log('  INE Mock Store Scraper - Headed Demonstration Mode');
  console.log('========================================================\n');

  const arg = process.argv[2] || '57';
  let targetUrl = arg;

  if (!targetUrl.startsWith('http')) {
    targetUrl = `${MOCK_STORE_URL}/product/${arg}`;
  }

  console.log(`Target Product URL: ${targetUrl}`);
  const { scrapeProductWithRetries } = require('../services/scraperService');
  const { getAllTrackedProducts } = require('../services/trackingService');

  const trackedProducts = await getAllTrackedProducts().catch(() => []);
  const matching = trackedProducts.find((p) => p.product_id === String(arg) || p.id === String(arg));
  const productRecord = matching || {
    id: (trackedProducts[0] && trackedProducts[0].id) || 'ebea928a-224b-43cf-b3f6-4ac89cd721b9',
    product_name: matching ? matching.product_name : `Test Product (${arg})`,
    product_url: targetUrl,
  };

  const result = await scrapeProductWithRetries(
    productRecord,
    {
      headless: false,
      slowMo: 180, // Slow down operations by 180ms for visible recording
      maxRetries: 3,
    }
  );

  console.log('\n========================================================');
  console.log('  SCRAPE DEMONSTRATION RESULT');
  console.log('========================================================');
  console.log(`Status:       ${result.success ? 'SUCCESS (OK)' : 'FAILED'}`);
  if (result.success) {
    console.log(`Product Name: ${result.productName}`);
    console.log(`Price:        ₹${result.price}`);
    console.log(`Raw Price:    ${result.rawPrice}`);
    console.log(`Stock:        ${result.stock}`);
    console.log(`Duration:     ${result.durationMs} ms`);
  } else {
    console.log(`Error:        ${result.error}`);
    console.log(`Duration:     ${result.durationMs} ms`);
  }
  console.log('========================================================\n');

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error in headed runner:', err);
  process.exit(1);
});
