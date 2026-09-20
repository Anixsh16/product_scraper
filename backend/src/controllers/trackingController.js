const {
  getAllTrackedProducts,
  getTrackedProductById,
  addTrackedProduct,
  updateTrackedProduct,
} = require('../services/trackingService');
const { getPriceHistory } = require('../services/priceHistoryService');
const { getLogsForProduct } = require('../services/scrapeLogService');
const { scrapeSingleProduct } = require('../services/scraperService');
const logger = require('../utils/logger');

async function getAll(req, res, next) {
  try {
    const products = await getAllTrackedProducts();
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await getTrackedProductById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Tracked product not found',
      });
    }
    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { productName, productUrl, productId } = req.body;

    if (!productName || !productUrl) {
      return res.status(400).json({
        success: false,
        error: 'Both productName and productUrl are required fields.',
      });
    }

    const { product, alreadyTracked, reactivated } = await addTrackedProduct({
      productName,
      productUrl,
      productId,
    });

    // If newly tracked or reactivated, trigger an initial scrape asynchronously in the background
    // so the product will quickly have fresh price & stock data
    if (!alreadyTracked || reactivated) {
      scrapeSingleProduct(product.id, { headless: true }).catch((err) => {
        logger.warn(`Initial scrape failed for product ${product.id}: ${err.message}`);
      });
    }

    res.status(alreadyTracked && !reactivated ? 200 : 201).json({
      success: true,
      alreadyTracked: !!alreadyTracked && !reactivated,
      reactivated: !!reactivated,
      message: alreadyTracked && !reactivated
        ? 'Product is already being tracked'
        : reactivated
        ? 'Product was reactivated for tracking'
        : 'Product added to tracking successfully',
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const existing = await getTrackedProductById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Tracked product not found',
      });
    }

    const updated = await updateTrackedProduct(id, {
      active: active !== undefined ? Boolean(active) : existing.active,
    });

    res.json({
      success: true,
      message: updated.active ? 'Tracking activated' : 'Tracking paused',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const { id } = req.params;
    const history = await getPriceHistory(id, { ascending: true });
    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (err) {
    next(err);
  }
}

async function getLogs(req, res, next) {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await getLogsForProduct(id, limit);
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
  getAll,
  getById,
  create,
  update,
  getHistory,
  getLogs,
};
