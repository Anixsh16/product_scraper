/**
 * Normalizes and parses price and stock strings scraped from INE Mock Store.
 * Handles obfuscations like zero-width spaces, full-width unicode numbers,
 * split character spans, trailing tax notes, and Indian Rupee formatting.
 */

// Convert full-width digits ０-９ (U+FF10 to U+FF19) to standard ASCII 0-9
function normalizeUnicodeDigits(str) {
  return str.replace(/[\uFF10-\uFF19]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
}

// Remove invisible zero-width spaces, soft hyphens, and non-breaking spaces
function cleanInvisibleChars(str) {
  return str
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '') // zero-width spaces, joiners, BOM
    .replace(/[\u00A0\u202F\u2009]/g, ' ')      // non-breaking & thin spaces
    .trim();
}

/**
 * Extracts a clean numeric price from raw scraped text.
 * Returns { price: number, raw: string, isValid: boolean }
 */
function parsePrice(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { price: null, raw: rawText, isValid: false, error: 'Price text is empty or invalid' };
  }

  // 1. Clean invisible characters & full-width digits
  let cleaned = cleanInvisibleChars(rawText);
  cleaned = normalizeUnicodeDigits(cleaned);

  // 2. Strip currency symbols and tax trailing annotations
  // e.g. "₹ 3,499/- (incl. of all taxes)" -> "3,499"
  cleaned = cleaned.replace(/\/\-.*$/i, '');
  cleaned = cleaned.replace(/Rs\.?|INR|₹|\$/gi, '').trim();

  // 3. Handle euro-style decimals vs comma separators
  // e.g. "3.499,00" -> "3499.00"
  if (/\d+\.\d{3},\d{2}/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Normal Indian / International comma formatting: "3,499" or "3 499" -> "3499"
    cleaned = cleaned.replace(/[,\s]/g, '');
  }

  // 4. Match numeric value with optional decimal
  const match = cleaned.match(/\d+(\.\d+)?/);
  if (!match) {
    return { price: null, raw: rawText, isValid: false, error: 'No numeric price found' };
  }

  const numericPrice = parseFloat(match[0]);

  // 5. Validation: Price must be positive and reasonable
  if (isNaN(numericPrice) || numericPrice <= 0 || numericPrice > 10000000) {
    return {
      price: null,
      raw: rawText,
      isValid: false,
      error: `Parsed price ${numericPrice} is out of reasonable range (1 - 10,000,000)`
    };
  }

  return {
    price: numericPrice,
    raw: rawText,
    isValid: true
  };
}

/**
 * Extracts and normalizes stock information.
 * Returns { stock: string, quantity: number|null, inStock: boolean, isValid: boolean }
 */
function parseStock(rawStockText) {
  if (!rawStockText || typeof rawStockText !== 'string') {
    return { stock: 'Unknown', quantity: null, inStock: false, isValid: false, error: 'Stock text is empty' };
  }

  const cleaned = cleanInvisibleChars(rawStockText);
  const lower = cleaned.toLowerCase();

  if (lower.includes('out of stock') || lower.includes('sold out')) {
    return {
      stock: 'Out of stock',
      quantity: 0,
      inStock: false,
      isValid: true
    };
  }

  // Try extracting quantity e.g. "In stock · 14 left", "Only 3 left", "5 in stock"
  const qtyMatch = cleaned.match(/(\d+)\s*(?:left|in stock|units)/i) || cleaned.match(/(?:left|stock|only)\s*(\d+)/i);
  const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : null;

  return {
    stock: cleaned,
    quantity: quantity,
    inStock: true,
    isValid: true
  };
}

module.exports = {
  parsePrice,
  parseStock,
  cleanInvisibleChars,
  normalizeUnicodeDigits
};
