import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ScrapeLogsTable({ logs = [], showProductColumn = true }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    const prodName = log.tracked_products?.product_name || '';
    const errorMsg = log.error_message || '';
    const matchesSearch =
      !searchTerm ||
      prodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      errorMsg.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>SUCCESS</span>
          </span>
        );
      case 'RETRIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>RETRIED</span>
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="h-3.5 w-3.5" />
            <span>FAILED</span>
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
      {/* Table Controls */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product or error..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/70 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          {['ALL', 'SUCCESS', 'RETRIED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === st
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/40 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Status</th>
              {showProductColumn && <th className="py-3 px-4">Product</th>}
              <th className="py-3 px-4">Attempt</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={showProductColumn ? 6 : 5} className="py-12 text-center text-slate-500">
                  <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  No scrape logs matching the criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const formattedDate = new Date(log.attempted_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>

                      {showProductColumn && (
                        <td className="py-3 px-4 max-w-xs truncate">
                          {log.tracked_products?.product_name ? (
                            <span className="font-medium text-slate-200 hover:text-indigo-400">
                              {log.tracked_products.product_name}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs">
                              ID: {log.tracked_product_id?.slice(0, 8)}...
                            </span>
                          )}
                        </td>
                      )}

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          #{log.attempt_number}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-400">
                        {log.duration_ms ? `${log.duration_ms} ms` : '—'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                        {formattedDate}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.error_message ? (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium"
                          >
                            <span>Error details</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Normal</span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Error Row */}
                    {isExpanded && log.error_message && (
                      <tr className="bg-rose-950/20 border-b border-rose-900/30">
                        <td colSpan={showProductColumn ? 6 : 5} className="py-3 px-6 text-xs font-mono text-rose-300">
                          <div className="bg-slate-950/80 p-3 rounded-lg border border-rose-900/40 whitespace-pre-wrap break-all">
                            {log.error_message}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
