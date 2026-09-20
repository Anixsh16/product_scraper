const {
  scrapeAllActiveProducts,
  scrapeSingleProduct,
  isScrapeRunning,
  getLastScrapeSummary,
} = require('../services/scraperService');

async function triggerScrapeAll(req, res, next) {
  try {
    if (isScrapeRunning()) {
      return res.status(409).json({
        success: false,
        message: 'A scrape job is already in progress. Please wait for completion.',
      });
    }

    // Run scrape job
    const summary = await scrapeAllActiveProducts({ headless: true });
    res.json({
      success: true,
      message: 'Scrape batch completed',
      ...summary,
    });
  } catch (err) {
    next(err);
  }
}

async function triggerScrapeSingle(req, res, next) {
  try {
    const { id } = req.params;
    const result = await scrapeSingleProduct(id, { headless: true });
    res.json({
      success: result.success,
      message: result.success ? 'Product scraped successfully' : 'Product scrape failed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

const { getAllLogs } = require('../services/scrapeLogService');

async function getStatus(req, res) {
  res.json({
    success: true,
    isRunning: isScrapeRunning(),
    lastSummary: getLastScrapeSummary(),
  });
}

async function getLogs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const logs = await getAllLogs(limit);
    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  triggerScrapeAll,
  triggerScrapeSingle,
  getStatus,
  getLogs,
};
