const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = require('./constants');
const logger = require('../utils/logger');

let supabase = null;

if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws,
      },
    });
    logger.info(`Supabase client initialized successfully with URL: ${SUPABASE_URL}`);
  } catch (err) {
    logger.error('Failed to initialize Supabase client:', err.message);
  }
} else {
  logger.warn('SUPABASE_URL or SUPABASE_SECRET_KEY not set in environment.');
  logger.warn('Please configure backend/.env with your Supabase credentials.');
}

const isSupabaseConfigured = () => {
  return supabase !== null;
};

module.exports = {
  supabase,
  isSupabaseConfigured,
};
