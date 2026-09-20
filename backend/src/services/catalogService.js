const { MOCK_STORE_URL } = require('../config/constants');
const logger = require('../utils/logger');

let catalogCache = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

/**
 * Loads products from the mock store API into memory.
 */
async function loadCatalog() {
  const now = Date.now();
  if (catalogCache && now - lastFetchedAt < CACHE_TTL_MS) {
    return catalogCache;
  }

  logger.info('Fetching fresh product catalog from mock store...');
  const allItems = [];

  try {
    // Fetch first 5 pages of 50 items (250 popular items for fast search and responsiveness)
    // or expand as needed
    const pagesToFetch = 10;
    const pageSize = 50;

    for (let page = 1; page <= pagesToFetch; page++) {
      try {
        const res = await fetch(`${MOCK_STORE_URL}/api/catalog?page=${page}&pageSize=${pageSize}`);
        if (!res.ok) {
          logger.warn(`Failed to fetch catalog page ${page}: HTTP ${res.status}`);
          break;
        }
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          allItems.push(...data.items);
          if (allItems.length >= data.total) break;
        }
      } catch (pageErr) {
        logger.warn(`Error on catalog page ${page}: ${pageErr.message}`);
        break;
      }
    }

    if (allItems.length > 0) {
      catalogCache = allItems;
      lastFetchedAt = now;
      logger.info(`Loaded ${allItems.length} products into catalog cache.`);
    }
  } catch (err) {
    logger.error('Error loading product catalog:', err.message);
  }

  return catalogCache || [];
}

/**
 * Searches the catalog by partial or full product name, brand, category, or SKU.
 *
 * @param {string} query - Search string
 * @param {object} options - { page: number, pageSize: number, category?: string }
 */
async function searchProducts(query = '', options = {}) {
  const items = await loadCatalog();
  const q = (query || '').trim().toLowerCase();
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(options.pageSize, 10) || 20));

  let filtered = items;

  if (q) {
    filtered = items.filter((item) => {
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const brandMatch = (item.brand || '').toLowerCase().includes(q);
      const categoryMatch = (item.category || '').toLowerCase().includes(q);
      const skuMatch = (item.sku || '').toLowerCase().includes(q);
      return nameMatch || brandMatch || categoryMatch || skuMatch;
    });
  }

  if (options.category) {
    const cat = options.category.toLowerCase();
    filtered = filtered.filter((item) => (item.category || '').toLowerCase() === cat);
  }

  const total = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

  // Map to frontend-friendly structure with product URL
  const results = paginatedItems.map((item) => ({
    id: String(item.id),
    name: item.name,
    brand: item.brand,
    category: item.category,
    sku: item.sku,
    description: item.description,
    url: `${MOCK_STORE_URL}/product/${item.id}`,
    imageUrl: null, // Mock store uses SVG graphics
  }));

  return {
    items: results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

module.exports = {
  loadCatalog,
  searchProducts,
};
