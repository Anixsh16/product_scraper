import React from 'react';
import { 
  TrendingDown, 
  Search, 
  Activity, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  onTriggerScrapeAll, 
  isScrapingAll, 
  scrapeStatus,
  systemHealth
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">INE Price Tracker</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Production
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="truncate max-w-[200px] sm:max-w-xs">demo.inelabteamdev.com</span>
                <a 
                  href="https://demo.inelabteamdev.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-slate-400 hover:text-indigo-400 inline-flex items-center"
                  title="Open INE Mock Store"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setCurrentTab('tracked')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'tracked'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Tracked Products</span>
            </button>

            <button
              onClick={() => setCurrentTab('search')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Search Store</span>
            </button>

            <button
              onClick={() => setCurrentTab('logs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Scrape Logs</span>
            </button>
          </nav>

          {/* Right Actions & Health */}
          <div className="flex items-center gap-3">
            {/* Database indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className={`h-2 w-2 rounded-full ${systemHealth?.database?.includes('Supabase') ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <Database className="h-3 w-3 text-slate-400" />
              <span className="text-slate-300 font-mono text-[11px]">
                {systemHealth?.database?.includes('Supabase') ? 'Supabase Postgres' : 'In-Memory Store'}
              </span>
            </div>

            {/* Global Scrape Trigger Button */}
            <button
              onClick={onTriggerScrapeAll}
              disabled={isScrapingAll || scrapeStatus?.isRunning}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                isScrapingAll || scrapeStatus?.isRunning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/20 active:scale-95'
              }`}
              title="Scrapes all active tracked products immediately using Playwright"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScrapingAll || scrapeStatus?.isRunning ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isScrapingAll || scrapeStatus?.isRunning ? 'Scraping All...' : 'Scrape All'}</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80">
          <button
            onClick={() => setCurrentTab('tracked')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
              currentTab === 'tracked' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Tracked</span>
          </button>
          <button
            onClick={() => setCurrentTab('search')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
              currentTab === 'search' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
          </button>
          <button
            onClick={() => setCurrentTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
              currentTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Logs</span>
          </button>
        </div>

      </div>
    </header>
  );
}
