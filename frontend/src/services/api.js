/**
 * API service for communicating with the backend Express server.
 * Uses relative URLs which are proxied to http://localhost:5000 in dev via vite.config.js.
 */

const API_ORIGIN = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
const BASE_URL = `${API_ORIGIN}/api`;

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // Health & System Info
  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse(res);
  },

  // Catalog search from the mock store
  async searchCatalog(query) {
    if (!query || query.trim() === '') return { count: 0, products: [] };
    const res = await fetch(`${BASE_URL}/products/search?q=${encodeURIComponent(query.trim())}`);
    return handleResponse(res);
  },

  // Tracked products management
  async getTrackedProducts() {
    const res = await fetch(`${BASE_URL}/tracked-products`);
    return handleResponse(res);
  },

  async getTrackedProductById(id) {
    const res = await fetch(`${BASE_URL}/tracked-products/${id}`);
    return handleResponse(res);
  },

  async trackProduct({ productName, productUrl, productId }) {
    const res = await fetch(`${BASE_URL}/tracked-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName, productUrl, productId }),
    });
    return handleResponse(res);
  },

  async toggleProductActive(id, active) {
    const res = await fetch(`${BASE_URL}/tracked-products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    return handleResponse(res);
  },

  // Price history
  async getPriceHistory(id) {
    const res = await fetch(`${BASE_URL}/tracked-products/${id}/history`);
    return handleResponse(res);
  },

  // Product specific logs
  async getProductLogs(id, limit = 50) {
    const res = await fetch(`${BASE_URL}/tracked-products/${id}/logs?limit=${limit}`);
    return handleResponse(res);
  },

  // Global Scrape logs
  async getAllLogs(limit = 100) {
    const res = await fetch(`${BASE_URL}/scrape/logs?limit=${limit}`);
    return handleResponse(res);
  },

  // Trigger manual scrape
  async triggerScrapeAll() {
    const res = await fetch(`${BASE_URL}/scrape/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  async triggerScrapeSingle(id) {
    const res = await fetch(`${BASE_URL}/scrape/single/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  async getScrapeStatus() {
    const res = await fetch(`${BASE_URL}/scrape/status`);
    return handleResponse(res);
  },
};
