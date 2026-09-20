const { CRON_SECRET } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Middleware to protect the scheduled scrape endpoint with a secret token.
 * Checks header 'x-cron-secret', 'Authorization: Bearer <token>', or '?token='
 */
function verifyCronSecret(req, res, next) {
  // If CRON_SECRET is not configured or in development mode, allow with warning
  if (!CRON_SECRET || CRON_SECRET === 'dev_cron_secret_key_123') {
    // In dev, still allow but log warning if header missing
    logger.debug('Running scrape endpoint with default/dev cron secret');
  }

  const customHeader = req.headers['x-cron-secret'];
  const authHeader = req.headers['authorization'];
  const querySecret = req.query.secret || req.query.token;

  let providedSecret = null;
  if (customHeader) {
    providedSecret = customHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    providedSecret = authHeader.substring(7).trim();
  } else if (querySecret) {
    providedSecret = querySecret;
  }

  // If CRON_SECRET is set to something non-empty, require an exact match
  if (CRON_SECRET && CRON_SECRET !== providedSecret) {
    logger.warn(`Unauthorized scrape attempt from IP: ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing cron secret. Provide header "x-cron-secret" or Bearer token.',
    });
  }

  next();
}

module.exports = {
  verifyCronSecret,
};
