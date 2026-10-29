import React, { useState } from 'react';
import { Search, Play, Calendar, TrendingUp, Bookmark, Clock, Terminal, Sparkles, X, Download } from 'lucide-react';

interface NavbarProps {
  currentTab: 'home' | 'top' | 'schedule' | 'watchlist' | 'history' | 'tester';
  onSelectTab: (tab: 'home' | 'top' | 'schedule' | 'watchlist' | 'history' | 'tester') => void;
  onSearch: (query: string) => void;
  isBackendLive?: boolean;
  historyCount?: number;
  watchlistCount?: number;
  onOpenExport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onSearch,
  isBackendLive = true,
  historyCount = 0,
  watchlistCount = 0,
  onOpenExport,
}) => {
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <button
            id="brand-logo-btn"
            onClick={() => {
              setQuery('');
              onSelectTab('home');
            }}
            className="group flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-rose-500 to-amber-500 p-0.5 shadow-lg shadow-rose-950/40 transition group-hover:scale-105">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
                <Play className="h-4 w-4 fill-rose-500 text-rose-500 ml-0.5 transition-transform group-hover:scale-110" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-tight text-white text-lg">RE<span className="text-rose-500">ANIME</span></span>
                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
                  STREAM
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Next-gen anime stream player</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-home-btn"
              onClick={() => onSelectTab('home')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                currentTab === 'home'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-rose-400" />
              Home
            </button>

            <button
              id="nav-top-btn"
              onClick={() => onSelectTab('top')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                currentTab === 'top'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              Top Charts
            </button>

            <button
              id="nav-schedule-btn"
              onClick={() => onSelectTab('schedule')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                currentTab === 'schedule'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              Schedule
            </button>

            <button
              id="nav-watchlist-btn"
              onClick={() => onSelectTab('watchlist')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                currentTab === 'watchlist'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5 text-emerald-400" />
              <span>Watchlist</span>
              {watchlistCount > 0 && (
                <span className="ml-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  {watchlistCount}
                </span>
              )}
            </button>

            <button
              id="nav-history-btn"
              onClick={() => onSelectTab('history')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                currentTab === 'history'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-rose-400" />
              <span>History</span>
              {historyCount > 0 && (
                <span className="ml-0.5 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                  {historyCount}
                </span>
              )}
            </button>

            <button
              id="nav-tester-btn"
              onClick={() => onSelectTab('tester')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                currentTab === 'tester'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              Flix Decryptor
            </button>
          </nav>
        </div>

        {/* Search Bar & Status */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSubmit} className="relative">
            <div
              className={`flex items-center rounded-xl border bg-zinc-900/90 px-3 py-1.5 text-sm transition ${
                isSearchFocused
                  ? 'border-rose-500/60 ring-2 ring-rose-500/20 w-56 sm:w-72'
                  : 'border-zinc-800 w-44 sm:w-60'
              }`}
            >
              <Search className="h-4 w-4 text-zinc-400 shrink-0 mr-2" />
              <input
                id="search-input"
                type="text"
                placeholder="Search anime..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-0.5 text-zinc-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Export & Self-Host Action */}
          <button
            id="export-code-btn"
            onClick={onOpenExport}
            title="Download Code & Deploy Elsewhere"
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/50 bg-gradient-to-r from-purple-950/70 to-indigo-950/70 px-3 py-1.5 text-xs font-bold text-purple-200 hover:from-purple-900 hover:to-indigo-900 hover:text-white transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">Export & Deploy</span>
          </button>

          {/* Scraper Status Badge */}
          <div
            title={isBackendLive ? 'Live connection to ReAnime & FlixCloud Decryptor' : 'Fallback Curated Mode'}
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-400"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isBackendLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-mono text-[10px]">
              {isBackendLive ? 'Scraper Ready' : 'Curated Cache'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
