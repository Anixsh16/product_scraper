-- ==============================================================================
-- INE Product Price Tracker: Database Schema Migration
-- Compatible with Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tracked Products Table
CREATE TABLE IF NOT EXISTS tracked_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    product_id TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on product_id to prevent duplicate tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracked_products_product_id_unique 
    ON tracked_products(product_id) 
    WHERE product_id IS NOT NULL;

-- Index on active status for efficient querying of products scheduled for scraping
CREATE INDEX IF NOT EXISTS idx_tracked_products_active 
    ON tracked_products(active);

-- 2. Price History Table
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    price NUMERIC,
    stock TEXT,
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying price history per tracked product ordered by time
CREATE INDEX IF NOT EXISTS idx_price_history_tracked_product_id 
    ON price_history(tracked_product_id);

CREATE INDEX IF NOT EXISTS idx_price_history_scraped_at 
    ON price_history(scraped_at DESC);

-- 3. Scrape Logs Table
CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'RETRIED', 'FAILED')),
    attempt_number INTEGER DEFAULT 1,
    error_message TEXT,
    duration_ms INTEGER
);

-- Indexes for viewing logs per product
CREATE INDEX IF NOT EXISTS idx_scrape_logs_tracked_product_id 
    ON scrape_logs(tracked_product_id);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_attempted_at 
    ON scrape_logs(attempted_at DESC);
