require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MOCK_STORE_URL: process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com',
  CRON_SECRET: process.env.CRON_SECRET || 'dev_cron_secret_key_123',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  
  // Scraper configuration
  SCRAPER: {
    DEFAULT_TIMEOUT_MS: 20000,
    PAGE_LOAD_TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
    BASE_BACKOFF_MS: 1500,
    MIN_HOVER_MOVES: 10,
    MIN_DWELL_MS: 800,
  }
};
