import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  ExternalLink, 
  Radio, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';
import PriceChart from '../components/PriceChart';
import ScrapeLogsTable from '../components/ScrapeLogsTable';

export default function ProductDetailPage({ 
  productId, 
  onBack, 
  onToggleActive, 
  onTriggerSingleScrape,
  scrapingSingleId
}) {
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart', 'history-table', 'logs'

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodRes, histRes, logsRes] = await Promise.all([
        api.getTrackedProductById(productId),
        api.getPriceHistory(productId),
        api.getProductLogs(productId, 50),
      ]);
      setProduct(prodRes.data);
      setHistory(histRes.data || []);
      setLogs(logsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productId]);

  // When a scrape finishes, refresh data
  const handleScrape = async () => {
    if (!product) return;
    await onTriggerSingleScrape(product.id);
    await fetchData();
  };

  const handleToggle = async () => {
    if (!product) return;
    const newStatus = !product.active;
    await onToggleActive(product.id, newStatus);
    setProduct((prev) => ({ ...prev, active: newStatus }));
  };

  if (loading && !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-fade-in">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading product analytics & history...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-fade-in">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Error Loading Product</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'Product not found'}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Monitored Products</span>
        </button>
      </div>
    );
  }

  const prices = history.map((h) => h.price).filter((p) => p !== null && p !== undefined);
  const minPrice = prices.length > 0 ? Math.min(...prices) : product.current_price || 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : product.current_price || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Products</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Active status button */}
          <button
            onClick={handleToggle}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              product.active
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${product.active ? 'animate-pulse' : ''}`} />
            <span>{product.active ? 'Monitoring Active' : 'Monitoring Paused'}</span>
          </button>

          {/* Trigger Scrape button */}
          <button
            onClick={handleScrape}
            disabled={scrapingSingleId === product.id}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scrapingSingleId === product.id ? 'animate-spin' : ''}`} />
            <span>{scrapingSingleId === product.id ? 'Scraping Chromium...' : 'Scrape Now'}</span>
          </button>
        </div>
      </div>

      {/* Product Hero Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              Tracked Item #{product.id}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
              {product.product_name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              <span className="truncate max-w-md">{product.product_url}</span>
              <a
                href={product.product_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                <span>Store Link</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Current Price Big Display */}
          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Latest Price</span>
            <div className="text-3xl font-bold text-white tracking-tight mt-0.5">
              {product.current_price !== null && product.current_price !== undefined
                ? `₹${product.current_price.toLocaleString('en-IN')}`
                : 'Pending'}
            </div>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                {product.stock_status || 'In Stock'}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Lowest Price</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              ₹{minPrice.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Highest Price</span>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">
              ₹{maxPrice.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Total Scrapes</span>
            <div className="text-lg font-bold text-white mt-0.5 font-mono">
              {history.length} data points
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Last Scraped</span>
            <div className="text-xs font-medium text-slate-300 mt-1 font-mono">
              {product.last_scraped_at
                ? new Date(product.last_scraped_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'chart'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <TrendingDown className="h-4 w-4" />
          <span>Price Trend Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('history-table')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'history-table'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>History Records ({history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Scrape Execution Logs ({logs.length})</span>
        </button>
      </div>

      {/* Tab Content 1: Price Chart */}
      {activeTab === 'chart' && (
        <div className="animate-fade-in">
          <PriceChart history={history} />
        </div>
      )}

      {/* Tab Content 2: Price History Records Table */}
      {activeTab === 'history-table' && (
        <div className="animate-fade-in glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/40 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      No price history entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  [...history].reverse().map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">
                        {history.length - index}
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-mono">
                        ₹{record.price?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-emerald-400">
                        {record.stock_status || 'In Stock'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                        {new Date(record.scraped_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Scrape Execution Logs */}
      {activeTab === 'logs' && (
        <div className="animate-fade-in">
          <ScrapeLogsTable logs={logs} showProductColumn={false} />
        </div>
      )}
    </div>
  );
}
