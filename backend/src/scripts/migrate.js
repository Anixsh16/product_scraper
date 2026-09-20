require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logger.error('DATABASE_URL is not set in environment variables.');
    process.exit(1);
  }

  logger.info('Connecting to PostgreSQL database...');

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    logger.info('Connected to PostgreSQL successfully!');

    // Read the SQL schema migration file
    const migrationPath = path.resolve(__dirname, '../../../migrations/001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    logger.info(`Applying migration from ${path.basename(migrationPath)}...`);
    await client.query(sql);
    logger.info('Migration applied successfully!');

    // Verify tables created
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    logger.info('Public tables in database:');
    res.rows.forEach((r) => console.log(`  - ${r.table_name}`));

    console.log('\nDatabase setup complete! Tables created successfully.\n');
    await client.end();
    process.exit(0);
  } catch (err) {
    logger.error('Failed to run migration:', err.message);
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

runMigration();
