const formatTimestamp = () => new Date().toISOString();

const logger = {
  info: (msg, meta = '') => {
    console.log(`[${formatTimestamp()}] [INFO]  ${msg}`, meta ? meta : '');
  },
  warn: (msg, meta = '') => {
    console.warn(`[${formatTimestamp()}] [WARN]  ${msg}`, meta ? meta : '');
  },
  error: (msg, meta = '') => {
    console.error(`[${formatTimestamp()}] [ERROR] ${msg}`, meta ? meta : '');
  },
  debug: (msg, meta = '') => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${formatTimestamp()}] [DEBUG] ${msg}`, meta ? meta : '');
    }
  }
};

module.exports = logger;
