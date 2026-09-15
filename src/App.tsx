/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Calendar,
  DollarSign,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  FileQuestion,
  Activity,
} from 'lucide-react';

interface ResaleRecord {
  id: number;
  month: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: number;
  resale_price: number;
}

interface ResaleData {
  town: string;
  flat_type: string;
  month: string | null;
  typical_price: number | null;
  sample_size: number;
  min_price?: number;
  max_price?: number;
  records: ResaleRecord[];
}

interface HealthData {
  status: string;
  keyConfigured: string;
  upstreamAnswered: boolean;
  upstreamStatus: number | null;
  reason?: string;
}

type ViewState = 'loading' | 'success' | 'empty' | 'refused' | 'unreachable';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [data, setData] = useState<ResaleData | null>(null);
  const [errorDetail, setErrorDetail] = useState<{ upstreamStatus?: number; reason?: string } | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchResaleData = useCallback(async () => {
    setViewState('loading');
    setErrorDetail(null);

    try {
      const response = await fetch('/api/resale');

      // Check if response is JSON
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setViewState('unreachable');
        setErrorDetail({ reason: 'Non-JSON response received from server' });
        return;
      }

      const json = await response.json();

      if (!response.ok) {
        if (response.status === 502 || response.status === 503) {
          if (json.error === 'Upstream is unreachable') {
            setViewState('unreachable');
            setErrorDetail({ reason: json.reason || 'Server could not connect to data.gov.sg' });
            return;
          }
        }
        // Upstream refused with specific error/status
        setViewState('refused');
        setErrorDetail({
          upstreamStatus: json.upstreamStatus || response.status,
          reason: json.reason || json.error || 'Request refused by upstream provider',
        });
        return;
      }

      if (!json.records || json.records.length === 0 || json.typical_price === null) {
        setData(json);
        setViewState('empty');
        return;
      }

      setData(json);
      setViewState('success');
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      // Network failure reaching /api/resale or connection dropped
      setViewState('unreachable');
      setErrorDetail({
        reason: err instanceof Error ? err.message : 'Network failure reaching API endpoint',
      });
    }
  }, []);

  const checkHealth = useCallback(async () => {
    setIsHealthChecking(true);
    try {
      const response = await fetch('/api/health');
      const json = await response.json();
      setHealth(json);
    } catch (err) {
      setHealth({
        status: 'unhealthy',
        keyConfigured: 'not required',
        upstreamAnswered: false,
        upstreamStatus: null,
        reason: err instanceof Error ? err.message : 'Unable to contact health probe',
      });
    } finally {
      setIsHealthChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchResaleData();
    checkHealth();
  }, [fetchResaleData, checkHealth]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatMonth = (monthStr?: string | null) => {
    if (!monthStr) return 'N/A';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div id="hdb-app-root" className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased flex flex-col">
      {/* Navigation / Header */}
      <header id="main-header" className="border-b border-stone-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-700 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">
                Singapore HDB Resale Benchmark
              </h1>
              <p className="text-xs text-stone-500 font-medium">
                Official Datastore Integration • data.gov.sg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="refresh-btn"
              onClick={fetchResaleData}
              disabled={viewState === 'loading'}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${viewState === 'loading' ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Town and Flat Specification Bar */}
        <section id="spec-bar" className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Target Town</div>
              <div className="text-base font-bold text-stone-800">ANG MO KIO</div>
            </div>
            <div className="h-8 w-px bg-stone-200 hidden sm:block"></div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Flat Type</div>
              <div className="text-base font-bold text-stone-800">4 ROOM</div>
            </div>
            <div className="h-8 w-px bg-stone-200 hidden sm:block"></div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Reference Month</div>
              <div className="text-base font-bold text-stone-800">
                {viewState === 'success' && data?.month ? formatMonth(data.month) : 'Pending response'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 px-3 py-1.5 rounded-md border border-stone-200">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>Updated: {lastUpdated || 'Initial load'}</span>
          </div>
        </section>

        {/* Primary Benchmark Display with Explicit 4-State Messaging */}
        <section id="benchmark-card" className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Typical 4-Room Resale Price
          </div>

          {/* 1. LOADING STATE */}
          {viewState === 'loading' && (
            <div id="state-loading" className="py-12 px-6 rounded-lg bg-stone-50 border border-dashed border-stone-300 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-base sm:text-lg font-medium text-stone-700 max-w-md mx-auto">
                Fetching the latest 4-room resale transaction records from the HDB datastore...
              </p>
            </div>
          )}

          {/* 2. EMPTY STATE */}
          {viewState === 'empty' && (
            <div id="state-empty" className="py-12 px-6 rounded-lg bg-amber-50/50 border border-amber-200 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <FileQuestion className="w-6 h-6" />
              </div>
              <p className="text-base sm:text-lg font-medium text-amber-900 max-w-md mx-auto">
                No resale transactions were found matching 4-room flats in Ang Mo Kio.
              </p>
            </div>
          )}

          {/* 3. UPSTREAM REFUSED STATE */}
          {viewState === 'refused' && (
            <div id="state-refused" className="py-12 px-6 rounded-lg bg-rose-50 border border-rose-200 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-base sm:text-lg font-semibold text-rose-900 max-w-lg mx-auto">
                The data.gov.sg datastore service rejected the request (Status {errorDetail?.upstreamStatus || 'Non-2xx'}: {errorDetail?.reason || 'Access denied'}).
              </p>
              <div className="mt-4">
                <button
                  onClick={fetchResaleData}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-rose-700 text-white hover:bg-rose-800 transition-colors cursor-pointer"
                >
                  Retry Request
                </button>
              </div>
            </div>
          )}

          {/* 4. UPSTREAM UNREACHABLE STATE */}
          {viewState === 'unreachable' && (
            <div id="state-unreachable" className="py-12 px-6 rounded-lg bg-red-50 border border-red-200 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <p className="text-base sm:text-lg font-semibold text-red-900 max-w-md mx-auto">
                Unable to establish a connection to the data.gov.sg API endpoint.
              </p>
              <p className="mt-2 text-xs text-red-600 font-mono">
                {errorDetail?.reason || 'Network timeout or unreachable host'}
              </p>
              <div className="mt-4">
                <button
                  onClick={fetchResaleData}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors cursor-pointer"
                >
                  Reconnect
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {viewState === 'success' && data && (
            <div id="state-success" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-stone-100 pb-6">
                <div>
                  <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-900 flex items-baseline gap-2">
                    <span>{data.typical_price ? formatPrice(data.typical_price) : 'N/A'}</span>
                    <span className="text-base sm:text-lg font-normal text-stone-500">median</span>
                  </div>
                  <p className="text-sm text-stone-600 mt-2">
                    Derived from <span className="font-semibold text-stone-800">{data.sample_size} registered transactions</span> in{' '}
                    <span className="font-semibold text-stone-800">{formatMonth(data.month)}</span>.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 text-sm">
                  <div className="bg-stone-100 px-3 py-1.5 rounded-md text-stone-700 font-medium">
                    Min: <span className="font-semibold text-stone-900">{data.min_price ? formatPrice(data.min_price) : '—'}</span>
                  </div>
                  <div className="bg-stone-100 px-3 py-1.5 rounded-md text-stone-700 font-medium">
                    Max: <span className="font-semibold text-stone-900">{data.max_price ? formatPrice(data.max_price) : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-stone-500" />
                    Recent Recorded Transactions ({formatMonth(data.month)})
                  </h3>
                  <span className="text-xs text-stone-500">
                    Showing latest transactions returned by serverless datastore query
                  </span>
                </div>

                <div className="overflow-x-auto border border-stone-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 text-stone-600 uppercase text-xs font-semibold tracking-wider border-b border-stone-200">
                      <tr>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3">Location / Street</th>
                        <th className="px-4 py-3">Storey Range</th>
                        <th className="px-4 py-3 text-right">Floor Area</th>
                        <th className="px-4 py-3 text-right">Resale Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {data.records.map((item) => (
                        <tr key={item.id} className="hover:bg-stone-50/75 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-stone-600 whitespace-nowrap">
                            {item.month}
                          </td>
                          <td className="px-4 py-3 font-medium text-stone-900">
                            Block {item.block}, {item.street_name}
                          </td>
                          <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                            {item.storey_range}
                          </td>
                          <td className="px-4 py-3 text-stone-600 text-right whitespace-nowrap">
                            {item.floor_area_sqm} m²
                          </td>
                          <td className="px-4 py-3 font-bold text-stone-900 text-right whitespace-nowrap">
                            {formatPrice(item.resale_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Serverless Diagnostics & Health Monitor */}
        <section id="health-monitor-card" className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-stone-600" />
              <h2 className="text-base font-bold text-stone-900">
                Serverless API Health & Credentials Monitor
              </h2>
            </div>
            <button
              id="recheck-health-btn"
              onClick={checkHealth}
              disabled={isHealthChecking}
              className="text-xs font-medium text-stone-600 hover:text-stone-900 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isHealthChecking ? 'animate-spin' : ''}`} />
              Probe /api/health
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Credential Status
              </div>
              <div className="text-base font-bold text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{health?.keyConfigured ?? 'Checking...'}</span>
              </div>
              <p className="text-xs text-stone-500 mt-1.5">
                Open dataset does not require an API key
              </p>
            </div>

            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Upstream Handshake
              </div>
              <div className="text-base font-bold text-stone-900 flex items-center gap-2">
                {health?.upstreamAnswered ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-emerald-700">Answered</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                    <span className="text-red-700">Unanswered</span>
                  </>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1.5">
                Target: data.gov.sg datastore
              </p>
            </div>

            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                HTTP Response Status
              </div>
              <div className="text-base font-bold font-mono text-stone-900">
                {health?.upstreamStatus !== null && health?.upstreamStatus !== undefined
                  ? `${health.upstreamStatus} OK`
                  : 'Pending'}
              </div>
              <p className="text-xs text-stone-500 mt-1.5">
                Endpoints: <code className="font-mono bg-stone-200/60 px-1 py-0.5 rounded text-[11px]">/api/resale</code>,{' '}
                <code className="font-mono bg-stone-200/60 px-1 py-0.5 rounded text-[11px]">/api/health</code>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Mandatory License Attribution Footer */}
      <footer id="app-footer" className="border-t border-stone-200 bg-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-stone-600 leading-relaxed max-w-3xl">
            Contains information from{' '}
            <span className="font-semibold text-stone-800">HDB Resale Flat Prices</span> accessed on{' '}
            <span className="font-semibold text-stone-800">15 September 2026</span> from{' '}
            <span className="font-semibold text-stone-800">data.gov.sg</span> which is made available under the terms of the{' '}
            <a
              href="https://data.gov.sg/open-data-licence"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-700 hover:text-red-800 underline inline-flex items-center gap-0.5 font-medium"
            >
              Singapore Open Data Licence version 1.0
              <ExternalLink className="w-3 h-3 inline" />
            </a>
            .
          </div>
          <div className="text-xs text-stone-400 font-mono">
            Cache-Control: s-maxage=86400
          </div>
        </div>
      </footer>
    </div>
  );
}
