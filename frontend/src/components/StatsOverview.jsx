import React from 'react';
import { Package, Radio, CheckCircle2, Clock, Zap, AlertTriangle } from 'lucide-react';

export default function StatsOverview({ products = [], scrapeStatus = null, onRefresh }) {
  const totalTracked = products.length;
  const activeCount = products.filter(p => p.active).length;
  const inStockCount = products.filter(p => {
    const s = (p.stock_status || '').toLowerCase();
    return s.includes('in stock') || s.includes('left') || s.includes('hurry');
  }).length;
  const outOfStockCount = products.filter(p => {
    const s = (p.stock_status || '').toLowerCase();
    return s.includes('out of stock');
  }).length;

  // Format last scraped time
  let lastScrapedText = 'None yet';
  const lastSummary = scrapeStatus?.lastSummary;
  if (lastSummary?.timestamp) {
    const date = new Date(lastSummary.timestamp);
    lastScrapedText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (products.length > 0) {
    const dates = products
      .map(p => p.last_scraped_at ? new Date(p.last_scraped_at) : null)
      .filter(Boolean)
      .sort((a, b) => b - a);
    if (dates.length > 0) {
      lastScrapedText = dates[0].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Metric 1: Total Tracked */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Tracked</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white tracking-tight">{totalTracked}</span>
            <span className="text-xs text-slate-500">products</span>
          </div>
        </div>
        <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Package className="h-5 w-5" />
        </div>
      </div>

      {/* Metric 2: Active Monitoring */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Monitoring</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{activeCount}</span>
            <span className="text-xs text-slate-500">/ {totalTracked} active</span>
          </div>
        </div>
        <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Radio className="h-5 w-5 animate-pulse" />
        </div>
      </div>

      {/* Metric 3: In Stock Status */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">In Stock</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-cyan-400 tracking-tight">{inStockCount}</span>
            <span className="text-xs text-slate-500">
              {outOfStockCount > 0 ? `${outOfStockCount} out of stock` : 'healthy'}
            </span>
          </div>
        </div>
        <div className="h-11 w-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      </div>

      {/* Metric 4: Scheduler & Batch Status */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scraper Schedule</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-base font-bold text-amber-300 tracking-tight">Every 2 Hours</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Last run: <span className="text-slate-300 font-medium">{lastScrapedText}</span>
          </p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Clock className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
