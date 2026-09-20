import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{new Date(item.scraped_at).toLocaleString()}</span>
        </div>
        <div className="text-base font-bold text-white mb-1">
          ₹{item.price?.toLocaleString('en-IN')}
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-400">Stock:</span>
          <span className="font-medium text-emerald-400">{item.stock_status || 'In Stock'}</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function PriceChart({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-2xl border border-slate-800">
        <Clock className="h-8 w-8 text-slate-600 mb-2" />
        <p className="text-sm font-medium text-slate-300">No price history recorded yet</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Run a scrape to record the initial baseline price for this product.
        </p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = history.map((h) => {
    const d = new Date(h.scraped_at);
    return {
      ...h,
      formattedTime: d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  });

  const prices = chartData.map((d) => d.price).filter((p) => p !== null && p !== undefined);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const firstPrice = prices.length > 0 ? prices[0] : 0;
  const priceDiff = currentPrice - firstPrice;
  const pctChange = firstPrice > 0 ? ((priceDiff / firstPrice) * 100).toFixed(1) : 0;

  // Margin buffer for chart Y-axis
  const yDomainMin = Math.max(0, Math.floor(minPrice * 0.95));
  const yDomainMax = Math.ceil(maxPrice * 1.05);

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800/80">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Price Trend</span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold text-white">
              ₹{currentPrice.toLocaleString('en-IN')}
            </span>
            {prices.length > 1 ? (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  priceDiff < 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : priceDiff > 0
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {priceDiff < 0 ? (
                  <>
                    <TrendingDown className="h-3 w-3" />
                    <span>-₹{Math.abs(priceDiff).toLocaleString('en-IN')} ({pctChange}%)</span>
                  </>
                ) : priceDiff > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3" />
                    <span>+₹{priceDiff.toLocaleString('en-IN')} (+{pctChange}%)</span>
                  </>
                ) : (
                  <>
                    <Minus className="h-3 w-3" />
                    <span>Unchanged</span>
                  </>
                )}
              </span>
            ) : null}
          </div>
        </div>

        {/* Min / Max Pills */}
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Min: </span>
            <span className="font-semibold text-emerald-400">₹{minPrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Max: </span>
            <span className="font-semibold text-indigo-400">₹{maxPrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Records: </span>
            <span className="font-semibold text-white">{chartData.length}</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="formattedTime"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[yDomainMin, yDomainMax]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            {prices.length > 1 && (
              <ReferenceLine y={minPrice} stroke="#10b981" strokeDasharray="2 2" strokeOpacity={0.6} />
            )}
            <Area
              type="monotone"
              dataKey="price"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#priceGradient)"
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 1, stroke: '#ffffff' }}
              activeDot={{ r: 5, fill: '#818cf8', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
