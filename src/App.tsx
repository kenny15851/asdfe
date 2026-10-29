/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { AnimeCard } from './components/AnimeCard.js';
import { WatchView } from './components/WatchView.js';
import { ScheduleView } from './components/ScheduleView.js';
import { StreamTesterModal } from './components/StreamTesterModal.js';
import { WatchHistoryModal } from './components/WatchHistoryModal.js';
import { AnimeDetailModal } from './components/AnimeDetailModal.js';
import { ExportModal } from './components/ExportModal.js';
import { Anime, ScheduleItem, StreamData, WatchHistoryItem } from './types.js';
import { fetchHome, searchAnime, fetchTopAnime, fetchSchedule } from './services/animeApi.js';
import { Flame, Sparkles, TrendingUp, Search, RefreshCw, X, Radio, Clock, Play, Download } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'top' | 'schedule' | 'watchlist' | 'history' | 'tester'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Home state
  const [latestAired, setLatestAired] = useState<Anime[]>([]);
  const [topWeekly, setTopWeekly] = useState<Anime[]>([]);
  const [isHomeLoading, setIsHomeLoading] = useState(true);

  // Top Charts state
  const [topPeriod, setTopPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [topAnimeList, setTopAnimeList] = useState<Anime[]>([]);
  const [isTopLoading, setIsTopLoading] = useState(false);

  // Schedule state
  const [scheduleData, setScheduleData] = useState<Record<string, ScheduleItem[]> | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  // Active watch view
  const [activeWatch, setActiveWatch] = useState<{ slug: string; episode: number; anilistId?: number; anime?: Anime } | null>(null);

  // Selected for detail modal
  const [previewAnime, setPreviewAnime] = useState<Anime | null>(null);

  // Watchlist & History stored in localStorage
  const [watchlist, setWatchlist] = useState<Anime[]>(() => {
    try {
      const stored = localStorage.getItem('reanime_watchlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [history, setHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('reanime_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Selected Genre filter on Home
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const genres = ['All', 'Action', 'Fantasy', 'Adventure', 'Supernatural', 'Sci-Fi', 'Drama'];

  // Save watchlist & history
  useEffect(() => {
    try {
      localStorage.setItem('reanime_watchlist', JSON.stringify(watchlist));
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
  }, [watchlist]);

  useEffect(() => {
    try {
      localStorage.setItem('reanime_history', JSON.stringify(history));
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
  }, [history]);

  // Load Home Data
  const loadHome = () => {
    setIsHomeLoading(true);
    fetchHome()
      .then((data) => {
        setLatestAired(data.latest_aired || []);
        setTopWeekly(data.top_weekly || []);
        setIsHomeLoading(false);
      })
      .catch((err) => {
        console.error('Home load error:', err);
        setIsHomeLoading(false);
      });
  };

  useEffect(() => {
    loadHome();
  }, []);

  // Load Top Anime
  useEffect(() => {
    if (currentTab === 'top') {
      setIsTopLoading(true);
      fetchTopAnime(topPeriod)
        .then((res) => {
          setTopAnimeList(res.data || []);
          setIsTopLoading(false);
        })
        .catch((err) => {
          console.error('Top anime error:', err);
          setIsTopLoading(false);
        });
    }
  }, [currentTab, topPeriod]);

  // Load Schedule
  useEffect(() => {
    if (currentTab === 'schedule' && !scheduleData) {
      setIsScheduleLoading(true);
      fetchSchedule()
        .then((res) => {
          setScheduleData(res.data || null);
          setIsScheduleLoading(false);
        })
        .catch((err) => {
          console.error('Schedule error:', err);
          setIsScheduleLoading(false);
        });
    }
  }, [currentTab, scheduleData]);

  // Search Handler
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchAnime(query)
      .then((res) => {
        const list = res.data || res.results || [];
        setSearchResults(list);
        setIsSearching(false);
      })
      .catch((err) => {
        console.error('Search error:', err);
        setIsSearching(false);
      });
  };

  // Watch Handlers
  const handleWatchAnime = (slug: string, episode = 1, anilistId?: number, anime?: Anime) => {
    setActiveWatch({ slug, episode, anilistId, anime });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecordHistory = (anime: Anime, episode: number, time: number, duration: number) => {
    const slug = anime.slug || anime.id;
    if (!slug) return;
    setHistory((prev) => {
      const existing = prev.find((h) => h.slug === slug && h.episode === episode);
      const effectiveTime = time > 0 ? time : (existing ? existing.timestamp : 0);
      const effectiveDuration = duration > 0 ? duration : (existing?.duration || 1440);
      const filtered = prev.filter((h) => !(h.slug === slug && h.episode === episode));
      const newItem: WatchHistoryItem = {
        slug,
        title: anime.name || anime.title || 'Anime',
        poster: anime.poster || anime.cover_image?.large || anime.banner || '',
        episode,
        timestamp: effectiveTime,
        duration: effectiveDuration,
        lastWatchedAt: new Date().toISOString(),
        anilist_id: anime.anilist_id,
      };
      return [newItem, ...filtered].slice(0, 50);
    });
  };

  const handleRemoveHistoryItem = (slug: string, episode: number) => {
    setHistory((prev) => prev.filter((h) => !(h.slug === slug && h.episode === episode)));
  };

  // Bookmark Toggle
  const handleToggleBookmark = (anime: Anime) => {
    setWatchlist((prev) => {
      const exists = prev.some((a) => a.slug === anime.slug || a.id === anime.id);
      if (exists) {
        return prev.filter((a) => a.slug !== anime.slug && a.id !== anime.id);
      }
      return [anime, ...prev];
    });
  };

  const isBookmarked = (slug?: string) => {
    if (!slug) return false;
    return watchlist.some((a) => a.slug === slug || a.id === slug);
  };

  // Hero Anime
  const heroAnime = topWeekly[0] || latestAired[0];

  // Filtered lists by genre
  const filterByGenre = (list: Anime[]) => {
    if (selectedGenre === 'All') return list;
    return list.filter((a) =>
      a.genres?.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-rose-500 selection:text-white font-sans antialiased">
      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setActiveWatch(null);
          setCurrentTab(tab);
          setSearchQuery('');
        }}
        onSearch={handleSearch}
        isBackendLive={true}
        historyCount={history.length}
        watchlistCount={watchlist.length}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-20">
        {/* If Active Watch Screen is open */}
        {activeWatch ? (
          <WatchView
            slug={activeWatch.slug}
            initialEpisode={activeWatch.episode}
            initialAnilistId={activeWatch.anilistId}
            initialAnime={activeWatch.anime}
            onBack={() => setActiveWatch(null)}
            isBookmarked={isBookmarked(activeWatch.slug)}
            onToggleBookmark={handleToggleBookmark}
            onRecordHistory={handleRecordHistory}
          />
        ) : searchQuery ? (
          /* Search Results View */
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-rose-500" />
                  Search Results for "{searchQuery}"
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Found {searchResults.length} matching anime titles
                </p>
              </div>

              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Search</span>
              </button>
            </div>

            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="h-8 w-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                <p className="text-xs text-zinc-400 mt-3">Searching anime titles...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-20 text-center">
                <Search className="h-10 w-10 text-zinc-600 mb-2" />
                <p className="text-sm font-semibold text-zinc-300">No results found</p>
                <p className="text-xs text-zinc-500 mt-1">Try a different search term or check spelling.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.map((anime) => (
                  <AnimeCard
                    key={anime.slug || anime.id}
                    anime={anime}
                    onSelect={(a) => setPreviewAnime(a)}
                    onWatch={handleWatchAnime}
                    isBookmarked={isBookmarked(anime.slug)}
                    onToggleBookmark={(a, e) => {
                      e.stopPropagation();
                      handleToggleBookmark(a);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : currentTab === 'home' ? (
          /* Home View */
          <div className="flex flex-col gap-10">
            {/* Hero Spotlight */}
            {heroAnime && (
              <HeroBanner
                anime={heroAnime}
                onWatch={handleWatchAnime}
                onInfo={(a) => setPreviewAnime(a)}
                isBookmarked={isBookmarked(heroAnime.slug)}
                onToggleBookmark={handleToggleBookmark}
              />
            )}

            {/* Continue Watching from History */}
            {history.length > 0 && (
              <section className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-rose-500" />
                    <h3 className="text-sm sm:text-base font-black text-white">Continue Watching</h3>
                  </div>
                  <button
                    onClick={() => setCurrentTab('history')}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                  >
                    View All History ({history.length})
                  </button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  {history.slice(0, 6).map((item) => {
                    const progressPct =
                      item.duration > 0 ? Math.min(100, Math.round((item.timestamp / item.duration) * 100)) : 0;
                    return (
                      <div
                        key={`${item.slug}-${item.episode}`}
                        onClick={() => handleWatchAnime(item.slug, item.episode, item.anilist_id)}
                        className="group flex flex-col w-44 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 hover:border-zinc-700 cursor-pointer transition"
                      >
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950">
                          <img
                            src={item.poster}
                            alt={item.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent" />
                          <div className="absolute bottom-1.5 left-2 right-2">
                            <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                              <div className="h-full bg-rose-500" style={{ width: `${progressPct}%` }} />
                            </div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg">
                              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400">
                            {item.title}
                          </h4>
                          <span className="text-[11px] text-zinc-400">
                            Ep {item.episode} {progressPct > 0 ? `• ${progressPct}%` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Genre Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-rose-500" /> Filter:
              </span>
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    selectedGenre === genre
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950/30'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Top Trending of the Week */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-400 fill-amber-400/20" />
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    Trending This Week
                  </h2>
                </div>

                <button
                  onClick={() => setCurrentTab('top')}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                >
                  View All Charts &rarr;
                </button>
              </div>

              {isHomeLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] rounded-xl bg-zinc-900/60 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filterByGenre(topWeekly).slice(0, 10).map((anime, idx) => (
                    <AnimeCard
                      key={anime.slug || anime.id || idx}
                      anime={anime}
                      rank={idx + 1}
                      onSelect={(a) => setPreviewAnime(a)}
                      onWatch={handleWatchAnime}
                      isBookmarked={isBookmarked(anime.slug)}
                      onToggleBookmark={(a, e) => {
                        e.stopPropagation();
                        handleToggleBookmark(a);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Latest Aired Releases */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-rose-500 animate-pulse" />
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    Latest Aired Episodes
                  </h2>
                </div>

                <button
                  onClick={loadHome}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
                  title="Refresh Latest Episodes"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {isHomeLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] rounded-xl bg-zinc-900/60 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filterByGenre(latestAired).map((anime, idx) => (
                    <AnimeCard
                      key={anime.slug || anime.id || idx}
                      anime={anime}
                      onSelect={(a) => setPreviewAnime(a)}
                      onWatch={handleWatchAnime}
                      isBookmarked={isBookmarked(anime.slug)}
                      onToggleBookmark={(a, e) => {
                        e.stopPropagation();
                        handleToggleBookmark(a);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : currentTab === 'top' ? (
          /* Top Charts View */
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-400" />
                  Top Anime Leaderboard
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Highest rated and most watched anime ranked by community activity
                </p>
              </div>

              {/* Period Selector */}
              <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
                {(['day', 'week', 'month'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTopPeriod(period)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                      topPeriod === period
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {isTopLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="h-8 w-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                <p className="text-xs text-zinc-400 mt-3">Loading top chart entries...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {topAnimeList.map((anime, idx) => (
                  <AnimeCard
                    key={anime.slug || anime.id || idx}
                    anime={anime}
                    rank={idx + 1}
                    onSelect={(a) => setPreviewAnime(a)}
                    onWatch={handleWatchAnime}
                    isBookmarked={isBookmarked(anime.slug)}
                    onToggleBookmark={(a, e) => {
                      e.stopPropagation();
                      handleToggleBookmark(a);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : currentTab === 'schedule' ? (
          /* Schedule View */
          <ScheduleView
            scheduleData={scheduleData}
            isLoading={isScheduleLoading}
            onSelectAnime={(slug) => handleWatchAnime(slug, 1)}
          />
        ) : currentTab === 'watchlist' || currentTab === 'history' ? (
          /* Watchlist & History */
          <WatchHistoryModal
            watchlist={watchlist}
            history={history}
            initialTab={currentTab === 'history' ? 'history' : 'watchlist'}
            onSelectAnime={handleWatchAnime}
            onRemoveBookmark={(slug) =>
              setWatchlist((prev) => prev.filter((a) => a.slug !== slug))
            }
            onClearHistory={() => setHistory([])}
            onRemoveHistoryItem={handleRemoveHistoryItem}
          />
        ) : (
          /* Stream Tester & FlixCloud Decryptor */
          <StreamTesterModal
            onPlayStream={(stream, title) => {
              // Load custom stream into the player view
              setActiveWatch({ slug: 'solo-leveling-ore-dake-level-up-na-ken', episode: 1 });
            }}
          />
        )}
      </main>

      {/* Anime Detail Modal Preview */}
      {previewAnime && (
        <AnimeDetailModal
          anime={previewAnime}
          onClose={() => setPreviewAnime(null)}
          onWatch={(slug, ep, aid, a) => {
            setPreviewAnime(null);
            handleWatchAnime(slug, ep, aid, a);
          }}
          isBookmarked={isBookmarked(previewAnime.slug)}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* Export & Deployment Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 text-center text-xs text-zinc-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-white">RE<span className="text-rose-500">ANIME</span></span>
            <span>&bull;</span>
            <span>High-performance streaming engine</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-zinc-400">
            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1 font-bold text-purple-400 hover:text-purple-300 underline underline-offset-2"
            >
              <Download className="h-3 w-3" />
              Download & Deploy Elsewhere
            </button>
            <span>&bull;</span>
            <span>FlixCloud Embed Decryption</span>
            <span>&bull;</span>
            <span>HLS .m3u8 Playback</span>
            <span>&bull;</span>
            <span>Multi-audio & Subtitles</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
