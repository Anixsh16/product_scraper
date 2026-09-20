import React, { useState } from 'react';
import { 
  Radio, 
  ExternalLink, 
  RefreshCw, 
  ChevronRight, 
  Search, 
  Package, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingDown
} from 'lucide-react';
import StatsOverview from '../components/StatsOverview';

export default function TrackedPage({
  products = [],
  scrapeStatus = null,
  onSelectProduct,
  onToggleActive,
  onTriggerSingleScrape,
  scrapingSingleId,
  onNavigateToSearch,
  onRefresh,
}) {
  const [filter, setFilter] = useState('ALL'); // ALL, ACTIVE, PAUSED
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter((p) => {
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'ACTIVE' && p.active) ||
      (filter === 'PAUSED' && !p.active);
    const matchesSearch =
      !searchTerm ||
      p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_url?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStockBadge = (stockStatus) => {
    if (!stockStatus) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
          <Clock className="h-3 w-3" /> Not scraped yet
        </span>
      );
    }
    const lower = stockStatus.toLowerCase();
    if (lower.includes('out of stock')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
          <AlertCircle className="h-3 w-3" /> Out of stock
        </span>
      );
    }
    if (lower.includes('hurry') || lower.includes('left')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
          <Clock className="h-3 w-3" /> {stockStatus}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
        <CheckCircle2 className="h-3 w-3" /> {stockStatus}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Metric Stats */}
      <StatsOverview products={products} scrapeStatus={scrapeStatus} onRefresh={onRefresh} />

      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Monitored Products</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated Chromium scraper monitors these products every 2 hours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter tracked..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'ACTIVE', 'PAUSED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Add Product Button */}
          <button
            onClick={onNavigateToSearch}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const isScrapingThis = scrapingSingleId === product.id;
            const lastScrapedDate = product.last_scraped_at
              ? new Date(product.last_scraped_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Never';

            return (
              <div
                key={product.id}
                className={`glass-panel glass-panel-hover p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  product.active ? 'border-slate-800' : 'border-slate-800/50 opacity-75'
                }`}
              >
                <div>
                  {/* Top Row: Active Toggle & Stock Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {getStockBadge(product.stock_status)}

                    {/* Active toggle button */}
                    <button
                      onClick={() => onToggleActive(product.id, !product.active)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        product.active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                      }`}
                      title="Click to toggle monitoring"
                    >
                      <Radio className={`h-3 w-3 ${product.active ? 'animate-pulse' : ''}`} />
                      <span>{product.active ? 'Active' : 'Paused'}</span>
                    </button>
                  </div>

                  {/* Product Title */}
                  <h3
                    onClick={() => onSelectProduct(product.id)}
                    className="font-semibold text-base text-white hover:text-indigo-400 cursor-pointer transition-colors line-clamp-2 mb-3"
                  >
                    {product.product_name}
                  </h3>

                  {/* Price Row */}
                  <div className="mb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Current Price</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      {product.current_price !== null && product.current_price !== undefined ? (
                        <span className="text-2xl font-bold text-white tracking-tight">
                          ₹{product.current_price.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-lg font-medium text-slate-500">
                          Pending First Scrape
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta: Last Scraped Time */}
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-4 font-mono">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>Last Scraped: {lastScrapedDate}</span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                    title="View page on mock store"
                  >
                    <span>Store</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <div className="flex items-center gap-2">
                    {/* Trigger Single Scrape */}
                    <button
                      onClick={() => onTriggerSingleScrape(product.id)}
                      disabled={isScrapingThis}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
                      title="Scrape this product right now"
                    >
                      <RefreshCw className={`h-3 w-3 ${isScrapingThis ? 'animate-spin text-indigo-400' : ''}`} />
                      <span>{isScrapingThis ? 'Scraping...' : 'Scrape'}</span>
                    </button>

                    {/* View Details / History */}
                    <button
                      onClick={() => onSelectProduct(product.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all"
                    >
                      <span>Details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
          <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No tracked products found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-6">
            {products.length === 0
              ? 'Get started by searching the INE mock store and adding products to automated price tracking.'
              : 'No products match your search or filter selection.'}
          </p>
          {products.length === 0 && (
            <button
              onClick={onNavigateToSearch}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Search INE Catalog</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
