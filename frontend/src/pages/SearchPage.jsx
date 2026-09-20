import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Package, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function SearchPage({ trackedProducts = [], onProductTracked, onNavigateToTracked }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackingMap, setTrackingMap] = useState({}); // { [productId]: boolean }

  // Quick search presets
  const sampleQueries = ['Nordkraft', 'Apex', 'Watch', 'Audio', 'Pro', 'Backpack'];

  // Map tracked products by ID and URL for fast already-tracked lookup
  const trackedUrlSet = new Set(trackedProducts.map((p) => p.product_url));
  const trackedIdSet = new Set(
    trackedProducts.map((p) => {
      // If product_url has ID e.g. /product/57
      const match = p.product_url?.match(/\/product\/(\d+)/);
      return match ? Number(match[1]) : null;
    }).filter(Boolean)
  );

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.searchCatalog(query);
        setResults(data.items || data.products || []);
      } catch (err) {
        setError(err.message || 'Failed to search catalog');
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleTrack = async (product) => {
    setTrackingMap((prev) => ({ ...prev, [product.id]: true }));
    try {
      const res = await api.trackProduct({
        productName: product.name,
        productUrl: product.url,
        productId: product.id,
      });

      if (onProductTracked) {
        onProductTracked(res.data);
      }
    } catch (err) {
      alert(`Tracking failed: ${err.message}`);
    } finally {
      setTrackingMap((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Search INE Store Catalog
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          Search genuine products hosted on the INE Mock Store (<span className="text-slate-300 font-mono">demo.inelabteamdev.com</span>) by name, brand, or category, and add them to automated periodic tracking.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-slate-800 mb-6 shadow-xl">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products (e.g. Nordkraft Backpack, Apex Watch, headphones)..."
            className="w-full pl-12 pr-10 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-base text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            autoFocus
          />
          {loading && (
            <div className="absolute right-4 top-3.5">
              <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
          <span className="text-slate-500 flex items-center gap-1 font-medium">
            <Sparkles className="h-3 w-3 text-indigo-400" /> Quick suggestions:
          </span>
          {sampleQueries.map((term) => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700/50 transition-all"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Found {results.length} matching products
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((product) => {
              const isAlreadyTracked = trackedIdSet.has(product.id) || trackedUrlSet.has(product.url);
              const isTracking = trackingMap[product.id];

              return (
                <div
                  key={product.id}
                  className="glass-panel glass-panel-hover p-5 rounded-2xl border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Brand & Category */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                        {product.brand || 'INE Store'}
                      </span>
                      {product.category && (
                        <span className="text-xs text-slate-400 font-medium">
                          {product.category}
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <h3 className="font-semibold text-base text-white leading-snug line-clamp-2 mb-2">
                      {product.name}
                    </h3>

                    {/* Description */}
                    {product.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                        {product.description}
                      </p>
                    )}

                    {/* SKU & ID metadata */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mb-4">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      <span>ID: #{product.id}</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
                      title="Open on mock store"
                    >
                      <span>Store Page</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    {isAlreadyTracked ? (
                      <button
                        onClick={onNavigateToTracked}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Tracked</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleTrack(product)}
                        disabled={isTracking}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isTracking ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Tracking...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>Track Price</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty States */}
      {!loading && query.trim() !== '' && results.length === 0 && !error && (
        <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/80">
          <Package className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-300">No products found for "{query}"</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try searching for broader terms like "Backpack", "Apex", "Watch", or "Audio".
          </p>
        </div>
      )}

      {!query.trim() && (
        <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-slate-800/60">
          <Search className="h-10 w-10 text-indigo-500/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Start typing to search INE catalog</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Type any product keyword or click a quick suggestion above to browse the genuine mock store catalog.
          </p>
        </div>
      )}
    </div>
  );
}
