const { searchProducts } = require('../services/catalogService');

async function search(req, res, next) {
  try {
    const { q = '', page = 1, pageSize = 20, category } = req.query;
    const results = await searchProducts(q, { page, pageSize, category });
    res.json({
      success: true,
      ...results,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  search,
};
