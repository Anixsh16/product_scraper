const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { memoryStore } = require('./trackingService');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Adds a verified price/stock record to price_history.
 */
async function recordPrice(trackedProductId, price, stock) {
  if (price === null || isNaN(price) || price <= 0) {
    throw new Error(`Cannot record invalid price: ${price}`);
  }

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('price_history')
      .insert([
        {
          tracked_product_id: trackedProductId,
          price: Number(price),
          stock: String(stock || 'In stock'),
          scraped_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error('Error inserting into price_history:', error.message);
      throw error;
    }
    return data;
  }

  // Memory fallback
  const record = {
    id: crypto.randomUUID(),
    tracked_product_id: trackedProductId,
    price: Number(price),
    stock: String(stock || 'In stock'),
    scraped_at: new Date().toISOString(),
  };

  if (!memoryStore.priceHistory.has(trackedProductId)) {
    memoryStore.priceHistory.set(trackedProductId, []);
  }
  memoryStore.priceHistory.get(trackedProductId).push(record);
  return record;
}

/**
 * Retrieves price history for a given tracked product.
 */
async function getPriceHistory(trackedProductId, options = {}) {
  const ascending = options.ascending !== undefined ? options.ascending : true;

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('tracked_product_id', trackedProductId)
      .order('scraped_at', { ascending });

    if (error) {
      logger.error('Error fetching price history:', error.message);
      throw error;
    }
    return (data || []).map((row) => ({
      ...row,
      price: Number(row.price),
    }));
  }

  // Memory fallback
  const list = memoryStore.priceHistory.get(trackedProductId) || [];
  const sorted = [...list].sort((a, b) => {
    const diff = new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime();
    return ascending ? diff : -diff;
  });
  return sorted;
}

module.exports = {
  recordPrice,
  getPriceHistory,
};
