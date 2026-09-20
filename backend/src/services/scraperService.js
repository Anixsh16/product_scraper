const { getAllTrackedProducts, getTrackedProductById } = require('./trackingService');
const { recordPrice } = require('./priceHistoryService');
const { recordLog } = require('./scrapeLogService');
const { scrapeProductPage } = require('../scraper/productScraper');
const { SCRAPER } = require('../config/constants');
const logger = require('../utils/logger');

let isScrapeRunning = false;
let lastScrapeSummary = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scrapes a single product with retries, exponential backoff, and strict logging.
 *
 * @param {object} product - Tracked product record { id, product_name, product_url, ... }
 * @param {object} options - Scraper options { headless: boolean, maxRetries: number }
 */
async function scrapeProductWithRetries(product, options = {}) {
  const maxRetries = options.maxRetries || SCRAPER.MAX_RETRIES;
  const headless = options.headless !== undefined ? options.headless : true;
  let finalResult = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.info(`Scraping product "${product.product_name}" (ID: ${product.id}) - Attempt ${attempt}/${maxRetries}`);

    const result = await scrapeProductPage(product.product_url, {
      headless,
      timeoutMs: SCRAPER.DEFAULT_TIMEOUT_MS,
    });

    if (result.success) {
      // 1. Successful scrape
      await recordLog({
        trackedProductId: product.id,
        status: 'SUCCESS',
        attemptNumber: attempt,
        durationMs: result.durationMs,
        errorMessage: null,
      });

      // 2. Insert valid record into price_history
      await recordPrice(product.id, result.price, result.stock);

      logger.info(`Scrape SUCCESS for "${product.product_name}" on attempt ${attempt}`);
      finalResult = {
        success: true,
        productId: product.id,
        productName: product.product_name,
        price: result.price,
        stock: result.stock,
        attempts: attempt,
        durationMs: result.durationMs,
      };
      return finalResult;
    } else {
      // Attempt failed
      const isLastAttempt = attempt === maxRetries;
      const status = isLastAttempt ? 'FAILED' : 'RETRIED';

      await recordLog({
        trackedProductId: product.id,
        status: status,
        attemptNumber: attempt,
        durationMs: result.durationMs,
        errorMessage: result.error || 'Unknown scrape error',
      });

      if (!isLastAttempt) {
        // Exponential backoff: base * 2^(attempt - 1)
        const backoffMs = SCRAPER.BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        logger.warn(`Attempt ${attempt} failed for "${product.product_name}". Retrying in ${backoffMs}ms... Error: ${result.error}`);
        await sleep(backoffMs);
      } else {
        logger.error(`All ${maxRetries} attempts failed for product "${product.product_name}". Final error: ${result.error}`);
        finalResult = {
          success: false,
          productId: product.id,
          productName: product.product_name,
          error: result.error,
          attempts: attempt,
          durationMs: result.durationMs,
        };
      }
    }
  }

  return finalResult;
}

/**
 * Executes a scrape across all active tracked products.
 * Prevents concurrent runs and ensures errors in one product do not halt others.
 */
async function scrapeAllActiveProducts(options = {}) {
  if (isScrapeRunning) {
    logger.warn('Scrape run requested while another scrape is currently in progress. Rejecting duplicate run.');
    return {
      success: false,
      message: 'A scrape run is already in progress. Please wait for it to complete.',
      alreadyRunning: true,
    };
  }

  isScrapeRunning = true;
  const startTime = Date.now();

  try {
    const allProducts = await getAllTrackedProducts();
    const activeProducts = allProducts.filter((p) => p.active !== false);

    logger.info(`Beginning scheduled scrape for ${activeProducts.length} active products.`);

    const results = [];
    for (const product of activeProducts) {
      try {
        const res = await scrapeProductWithRetries(product, options);
        results.push(res);
      } catch (prodErr) {
        logger.error(`Unexpected exception while scraping product ${product.id}:`, prodErr.message);
        results.push({
          success: false,
          productId: product.id,
          productName: product.product_name,
          error: prodErr.message,
        });
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const successfulCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    lastScrapeSummary = {
      timestamp: new Date().toISOString(),
      totalProducts: activeProducts.length,
      successful: successfulCount,
      failed: failedCount,
      totalDurationMs,
      results,
    };

    logger.info(`Completed scrape run in ${totalDurationMs}ms: ${successfulCount} succeeded, ${failedCount} failed.`);
    return {
      success: true,
      ...lastScrapeSummary,
    };
  } finally {
    isScrapeRunning = false;
  }
}

/**
 * Manually scrapes a single product by ID (triggered from UI).
 */
async function scrapeSingleProduct(productId, options = {}) {
  const product = await getTrackedProductById(productId);
  if (!product) {
    throw new Error(`Tracked product with ID "${productId}" not found.`);
  }

  return await scrapeProductWithRetries(product, options);
}

module.exports = {
  scrapeAllActiveProducts,
  scrapeSingleProduct,
  scrapeProductWithRetries,
  isScrapeRunning: () => isScrapeRunning,
  getLastScrapeSummary: () => lastScrapeSummary,
};
