import React from 'react';
import { Bookmark, Clock, Trash2, Play, CheckCircle } from 'lucide-react';
import { Anime, WatchHistoryItem } from '../types.js';

interface WatchHistoryModalProps {
  watchlist: Anime[];
  history: WatchHistoryItem[];
  initialTab?: 'watchlist' | 'history';
  onSelectAnime: (slug: string, episode?: number, anilistId?: number) => void;
  onRemoveBookmark: (slug: string) => void;
  onClearHistory: () => void;
  onRemoveHistoryItem?: (slug: string, episode: number) => void;
}

export const WatchHistoryModal: React.FC<WatchHistoryModalProps> = ({
  watchlist,
  history,
  initialTab = 'watchlist',
  onSelectAnime,
  onRemoveBookmark,
  onClearHistory,
  onRemoveHistoryItem,
}) => {
  const [tab, setTab] = React.useState<'watchlist' | 'history'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            My Anime Library
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Track your saved favorites and continue watching past episodes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('watchlist')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === 'watchlist'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Watchlist ({watchlist.length})</span>
          </button>

          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === 'history'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Watch History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === 'watchlist' ? (
        watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
            <Bookmark className="h-10 w-10 text-zinc-600 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">Your watchlist is empty</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Bookmark anime shows by clicking the bookmark icon on any anime card or hero banner.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {watchlist.map((anime) => (
              <div
                key={anime.slug || anime.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 transition hover:border-zinc-700"
              >
                <div
                  onClick={() => onSelectAnime(anime.slug, 1, anime.anilist_id)}
                  className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-zinc-950 cursor-pointer"
                >
                  <img
                    src={anime.poster}
                    alt={anime.name || anime.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent opacity-60 group-hover:opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg">
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex flex-col justify-between flex-1">
                  <h4
                    onClick={() => onSelectAnime(anime.slug, 1, anime.anilist_id)}
                    className="text-xs font-bold text-white line-clamp-1 hover:text-rose-400 cursor-pointer"
                  >
                    {anime.name || anime.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">
                      {anime.episodes_count ? `${anime.episodes_count} eps` : 'TV'}
                    </span>
                    <button
                      onClick={() => onRemoveBookmark(anime.slug)}
                      className="text-[11px] text-zinc-500 hover:text-rose-400 transition"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
            <Clock className="h-10 w-10 text-zinc-600 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">No watch history recorded yet</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Episodes you stream will be remembered here so you can pick up exactly where you left off.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All History</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {history.map((item, idx) => {
                const progressPct =
                  item.duration > 0 ? Math.min(100, Math.round((item.timestamp / item.duration) * 100)) : 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 hover:border-zinc-700 transition"
                  >
                    <div
                      onClick={() => onSelectAnime(item.slug, item.episode, item.anilist_id)}
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="h-14 w-10 rounded-lg object-cover bg-zinc-950 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col">
                        <h4 className="text-xs sm:text-sm font-bold text-white hover:text-rose-400 transition">
                          {item.title}
                        </h4>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          Episode {item.episode} &bull; {progressPct}% watched
                        </span>
                        {/* Mini progress bar */}
                        <div className="mt-1 h-1 w-32 sm:w-48 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onSelectAnime(item.slug, item.episode, item.anilist_id)}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Resume</span>
                      </button>
                      {onRemoveHistoryItem && (
                        <button
                          onClick={() => onRemoveHistoryItem(item.slug, item.episode)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                          title="Remove from history"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
};
