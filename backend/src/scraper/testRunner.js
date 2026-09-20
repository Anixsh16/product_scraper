const { scrapeProductPage } = require('./productScraper');
const { parsePrice, parseStock } = require('./priceParser');
const { getAllTrackedProducts } = require('../services/trackingService');
const { scrapeProductWithRetries } = require('../services/scraperService');
const { MOCK_STORE_URL } = require('../config/constants');
const logger = require('../utils/logger');

async function testParser() {
  logger.info('--- Testing Price & Stock Parser ---');

  const testPrices = [
    { input: '₹3,499', expected: 3499 },
    { input: '₹ 12 500/- (incl. of all taxes)', expected: 12500 },
    { input: '₹3.499,00', expected: 3499 },
    { input: 'Rs. 450.50', expected: 450.5 },
    { input: '₹３４９９', expected: 3499 },
    { input: '₹\u200B3\u200B4\u200B9\u200B9', expected: 3499 },
    { input: '₹21,767 | ₹ \u00A0\u200B1\u00A0\u200B8\u00A0\u200B,\u00A0\u200B7\u00A0\u200B2\u00A0\u200B0 | 14% off', expected: 21767 },
  ];

  for (const t of testPrices) {
    const res = parsePrice(t.input);
    const passed = res.isValid && res.price === t.expected;
    console.log(`[Parser Test] "${t.input.slice(0, 30)}" -> ${res.price} : ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) throw new Error(`Parser failed for "${t.input}"`);
  }

  const testStocks = [
    { input: 'In stock · 14 left', expectedStock: 'In stock · 14 left', inStock: true },
    { input: 'Out of stock', expectedStock: 'Out of stock', inStock: false },
    { input: 'HURRY, JUST 44 LEFT', expectedStock: 'HURRY, JUST 44 LEFT', inStock: true },
  ];

  for (const t of testStocks) {
    const res = parseStock(t.input);
    const passed = res.isValid && res.inStock === t.inStock;
    console.log(`[Stock Test] "${t.input}" -> "${res.stock}" : ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) throw new Error(`Stock parser failed for "${t.input}"`);
  }

  logger.info('Parser tests passed successfully!\n');
}

async function testLiveScraper() {
  logger.info('--- Testing Live Headless Scraper with Retry Engine ---');

  // Check if we have tracked products in the database
  const trackedProducts = await getAllTrackedProducts().catch(() => []);
  let targetProduct = trackedProducts.find((p) => p.product_id === '57') || trackedProducts[0];

  if (!targetProduct) {
    const targetId = '57';
    const url = `${MOCK_STORE_URL}/product/${targetId}`;
    logger.info(`No tracked products in DB; testing scrapeProductPage directly for: ${url}`);
    const res = await scrapeProductPage(url, { headless: true });
    if (!res.success) {
      throw new Error(`Scraper failed: ${res.error}`);
    }
    logger.info(`Direct scrape succeeded! Price: ₹${res.price}, Stock: "${res.stock}"`);
    return;
  }

  logger.info(`Scraping target product: "${targetProduct.product_name}" (${targetProduct.product_url})`);
  const result = await scrapeProductWithRetries(targetProduct, { headless: true, maxRetries: 3 });

  console.log('Result:', result);
  if (!result.success) {
    throw new Error(`Scraper failed: ${result.error}`);
  }
  if (!result.price || typeof result.price !== 'number') {
    throw new Error(`Price invalid: ${result.price}`);
  }
  logger.info(
    `Live scraper test succeeded! Product: "${result.productName}", Price: ₹${result.price.toLocaleString('en-IN')}, Stock: "${result.stock}"`
  );
}

async function run() {
  try {
    await testParser();
    await testLiveScraper();
    logger.info('ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    logger.error('Test failed:', err.message);
    process.exit(1);
  }
}

run();
