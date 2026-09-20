const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { memoryStore } = require('./trackingService');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Records an observable scrape attempt in scrape_logs.
 * Status must be one of: 'SUCCESS', 'RETRIED', 'FAILED'.
 */
async function recordLog({ trackedProductId, status, attemptNumber = 1, errorMessage = null, durationMs = 0 }) {
  const validStatuses = ['SUCCESS', 'RETRIED', 'FAILED'];
  const normalizedStatus = validStatuses.includes(status) ? status : 'FAILED';

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('scrape_logs')
        .insert([
          {
            tracked_product_id: trackedProductId,
            status: normalizedStatus,
            attempt_number: attemptNumber,
            error_message: errorMessage ? String(errorMessage).slice(0, 1000) : null,
            duration_ms: Math.round(durationMs),
            attempted_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        logger.error('Error inserting into scrape_logs:', error.message);
      }
      return data;
    } catch (err) {
      logger.error('Failed to write scrape log to Supabase:', err.message);
    }
  }

  // Memory fallback
  const record = {
    id: crypto.randomUUID(),
    tracked_product_id: trackedProductId,
    status: normalizedStatus,
    attempt_number: attemptNumber,
    error_message: errorMessage,
    duration_ms: Math.round(durationMs),
    attempted_at: new Date().toISOString(),
  };

  if (!memoryStore.scrapeLogs.has(trackedProductId)) {
    memoryStore.scrapeLogs.set(trackedProductId, []);
  }
  memoryStore.scrapeLogs.get(trackedProductId).unshift(record);
  return record;
}

/**
 * Fetches scrape logs for a given tracked product ordered by attempted_at DESC.
 */
async function getLogsForProduct(trackedProductId, limit = 50) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('scrape_logs')
      .select('*')
      .eq('tracked_product_id', trackedProductId)
      .order('attempted_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching scrape logs:', error.message);
      throw error;
    }
    return data || [];
  }

  // Memory fallback
  const list = memoryStore.scrapeLogs.get(trackedProductId) || [];
  return list.slice(0, limit);
}

/**
 * Fetches all recent scrape logs across all products with product details.
 */
async function getAllLogs(limit = 100) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('scrape_logs')
      .select('*, tracked_products(product_name, product_url)')
      .order('attempted_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching all scrape logs:', error.message);
      throw error;
    }
    return data || [];
  }

  // Memory fallback
  const allLogs = [];
  for (const [prodId, logs] of memoryStore.scrapeLogs.entries()) {
    const prod = memoryStore.products.get(prodId);
    for (const log of logs) {
      allLogs.push({
        ...log,
        tracked_products: prod ? { product_name: prod.product_name, product_url: prod.product_url } : null,
      });
    }
  }
  allLogs.sort((a, b) => new Date(b.attempted_at) - new Date(a.attempted_at));
  return allLogs.slice(0, limit);
}

module.exports = {
  recordLog,
  getLogsForProduct,
  getAllLogs,
};
