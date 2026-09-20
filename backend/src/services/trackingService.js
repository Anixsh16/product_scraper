const { supabase, isSupabaseConfigured } = require('../config/supabase');
const logger = require('../utils/logger');
const crypto = require('crypto');

// In-memory fallback store if Supabase is temporarily unconfigured
const memoryStore = {
  products: new Map(),
  priceHistory: new Map(), // tracked_product_id -> array
  scrapeLogs: new Map(),   // tracked_product_id -> array
};

/**
 * Retrieves all tracked products with their latest price, stock, and last scrape time.
 */
async function getAllTrackedProducts() {
  if (isSupabaseConfigured()) {
    try {
      const { data: products, error } = await supabase
        .from('tracked_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with latest price history
      const enriched = await Promise.all(
        (products || []).map(async (prod) => {
          const { data: history } = await supabase
            .from('price_history')
            .select('*')
            .eq('tracked_product_id', prod.id)
            .order('scraped_at', { ascending: false })
            .limit(1);

          const latest = history && history.length > 0 ? history[0] : null;

          return {
            ...prod,
            current_price: latest ? Number(latest.price) : null,
            current_stock: latest ? latest.stock : null,
            last_scraped_at: latest ? latest.scraped_at : null,
          };
        })
      );

      return enriched;
    } catch (err) {
      logger.error('Error fetching tracked products from Supabase:', err.message);
      throw err;
    }
  }

  // Memory fallback
  return Array.from(memoryStore.products.values()).map((prod) => {
    const history = memoryStore.priceHistory.get(prod.id) || [];
    const latest = history[history.length - 1] || null;
    return {
      ...prod,
      current_price: latest ? Number(latest.price) : null,
      current_stock: latest ? latest.stock : null,
      last_scraped_at: latest ? latest.scraped_at : null,
    };
  });
}

/**
 * Retrieves a single tracked product by ID with latest scrape details.
 */
async function getTrackedProductById(id) {
  if (isSupabaseConfigured()) {
    const { data: prod, error } = await supabase
      .from('tracked_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !prod) {
      return null;
    }

    const { data: history } = await supabase
      .from('price_history')
      .select('*')
      .eq('tracked_product_id', id)
      .order('scraped_at', { ascending: false })
      .limit(1);

    const latest = history && history.length > 0 ? history[0] : null;

    return {
      ...prod,
      current_price: latest ? Number(latest.price) : null,
      current_stock: latest ? latest.stock : null,
      last_scraped_at: latest ? latest.scraped_at : null,
    };
  }

  const prod = memoryStore.products.get(id);
  if (!prod) return null;
  const history = memoryStore.priceHistory.get(id) || [];
  const latest = history[history.length - 1] || null;
  return {
    ...prod,
    current_price: latest ? Number(latest.price) : null,
    current_stock: latest ? latest.stock : null,
    last_scraped_at: latest ? latest.scraped_at : null,
  };
}

/**
 * Adds a new product to track. Prevents duplicate tracking.
 */
async function addTrackedProduct({ productName, productUrl, productId }) {
  if (!productName || !productUrl) {
    throw new Error('product_name and product_url are required');
  }

  if (isSupabaseConfigured()) {
    // Check for existing tracking
    let query = supabase.from('tracked_products').select('*');
    if (productId) {
      query = query.or(`product_id.eq.${productId},product_url.eq.${productUrl}`);
    } else {
      query = query.eq('product_url', productUrl);
    }

    const { data: existing, error: checkError } = await query;
    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      const found = existing[0];
      // If was previously deactivated, reactivate it
      if (!found.active) {
        const { data: updated, error: updateErr } = await supabase
          .from('tracked_products')
          .update({ active: true })
          .eq('id', found.id)
          .select()
          .single();
        if (updateErr) throw updateErr;
        return { product: updated, reactivated: true, alreadyTracked: true };
      }
      return { product: found, alreadyTracked: true };
    }

    // Insert new tracked product
    const { data: created, error: insertError } = await supabase
      .from('tracked_products')
      .insert([
        {
          product_name: productName,
          product_url: productUrl,
          product_id: productId ? String(productId) : null,
          active: true,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;
    return { product: created, alreadyTracked: false };
  }

  // Memory fallback
  for (const p of memoryStore.products.values()) {
    if (p.product_id === String(productId) || p.product_url === productUrl) {
      if (!p.active) {
        p.active = true;
        return { product: p, reactivated: true, alreadyTracked: true };
      }
      return { product: p, alreadyTracked: true };
    }
  }

  const id = crypto.randomUUID();
  const created = {
    id,
    product_name: productName,
    product_url: productUrl,
    product_id: productId ? String(productId) : null,
    active: true,
    created_at: new Date().toISOString(),
  };
  memoryStore.products.set(id, created);
  return { product: created, alreadyTracked: false };
}

/**
 * Updates a tracked product (e.g. active = false to stop tracking).
 */
async function updateTrackedProduct(id, updates = {}) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('tracked_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const prod = memoryStore.products.get(id);
  if (!prod) throw new Error('Product not found');
  Object.assign(prod, updates);
  return prod;
}

module.exports = {
  getAllTrackedProducts,
  getTrackedProductById,
  addTrackedProduct,
  updateTrackedProduct,
  memoryStore,
};
