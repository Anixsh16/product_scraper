import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import TrackedPage from './pages/TrackedPage';
import SearchPage from './pages/SearchPage';
import LogsPage from './pages/LogsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import { api } from './services/api';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('tracked'); // 'tracked', 'search', 'logs', 'detail'
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [scrapeStatus, setScrapeStatus] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isScrapingAll, setIsScrapingAll] = useState(false);
  const [scrapingSingleId, setScrapingSingleId] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'info', message: string }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const fetchTracked = useCallback(async () => {
    try {
      const res = await api.getTrackedProducts();
      setTrackedProducts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch tracked products:', err);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, healthRes] = await Promise.all([
        api.getScrapeStatus().catch(() => null),
        api.getHealth().catch(() => null),
      ]);
      if (statusRes) setScrapeStatus(statusRes);
      if (healthRes) setSystemHealth(healthRes);
    } catch (err) {
      console.error('Failed to fetch status/health:', err);
    }
  }, []);

  useEffect(() => {
    fetchTracked();
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchTracked, fetchStatus]);

  const handleTriggerScrapeAll = async () => {
    if (isScrapingAll) return;
    setIsScrapingAll(true);
    showToast('Starting Chromium scraper for all active products...', 'info');

    try {
      const res = await api.triggerScrapeAll();
      showToast(
        `Scrape completed: ${res.successful} succeeded, ${res.retried} retried, ${res.failed} failed in ${res.durationMs}ms`,
        res.failed > 0 ? 'info' : 'success'
      );
      await fetchTracked();
      await fetchStatus();
    } catch (err) {
      showToast(err.message || 'Scrape execution failed', 'error');
    } finally {
      setIsScrapingAll(false);
    }
  };

  const handleTriggerSingleScrape = async (id) => {
    setScrapingSingleId(id);
    try {
      const res = await api.triggerScrapeSingle(id);
      if (res.success) {
        showToast(`Scraped ₹${res.data?.price?.toLocaleString('en-IN')}: ${res.data?.stockStatus || 'In Stock'}`);
      } else {
        showToast(`Scrape failed: ${res.data?.error || 'Unknown error'}`, 'error');
      }
      await fetchTracked();
      await fetchStatus();
    } catch (err) {
      showToast(`Scrape failed: ${err.message}`, 'error');
    } finally {
      setScrapingSingleId(null);
    }
  };

  const handleToggleActive = async (id, active) => {
    try {
      await api.toggleProductActive(id, active);
      setTrackedProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active } : p))
      );
      showToast(active ? 'Monitoring activated' : 'Monitoring paused');
    } catch (err) {
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleProductTracked = (product) => {
    showToast(`Added "${product.product_name}" to tracked products`);
    fetchTracked();
  };

  const handleSelectProduct = (id) => {
    setSelectedProductId(id);
    setCurrentTab('detail');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in max-w-md">
          <div
            className={`p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center justify-between gap-3 ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-800 text-rose-200'
                : toast.type === 'info'
                ? 'bg-indigo-950/90 border-indigo-800 text-indigo-200'
                : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="h-5 w-5 text-indigo-400 shrink-0" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              )}
              <span className="text-xs font-medium leading-relaxed">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'detail') setSelectedProductId(null);
        }}
        onTriggerScrapeAll={handleTriggerScrapeAll}
        isScrapingAll={isScrapingAll}
        scrapeStatus={scrapeStatus}
        systemHealth={systemHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'tracked' && (
          <TrackedPage
            products={trackedProducts}
            scrapeStatus={scrapeStatus}
            onSelectProduct={handleSelectProduct}
            onToggleActive={handleToggleActive}
            onTriggerSingleScrape={handleTriggerSingleScrape}
            scrapingSingleId={scrapingSingleId}
            onNavigateToSearch={() => setCurrentTab('search')}
            onRefresh={fetchTracked}
          />
        )}

        {currentTab === 'search' && (
          <SearchPage
            trackedProducts={trackedProducts}
            onProductTracked={handleProductTracked}
            onNavigateToTracked={() => setCurrentTab('tracked')}
          />
        )}

        {currentTab === 'logs' && <LogsPage />}

        {currentTab === 'detail' && selectedProductId && (
          <ProductDetailPage
            productId={selectedProductId}
            onBack={() => {
              setCurrentTab('tracked');
              setSelectedProductId(null);
            }}
            onToggleActive={handleToggleActive}
            onTriggerSingleScrape={handleTriggerSingleScrape}
            scrapingSingleId={scrapingSingleId}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="mt-auto border-t border-slate-900/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            INE Product Price Tracker &bull; Built with React 18, Tailwind CSS, Playwright & Node.js
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Target: <code className="text-slate-400">demo.inelabteamdev.com</code></span>
            <span>Interval: <code className="text-indigo-400">2h external trigger</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
