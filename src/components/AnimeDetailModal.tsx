import React, { useEffect, useState } from 'react';
import { X, Play, Star, Plus, Check, Calendar, Tv, ExternalLink } from 'lucide-react';
import { Anime, Episode } from '../types.js';
import { fetchAnimeInfo } from '../services/animeApi.js';

interface AnimeDetailModalProps {
  anime: Anime | null;
  onClose: () => void;
  onWatch: (slug: string, episode?: number, anilistId?: number, anime?: Anime) => void;
  isBookmarked: boolean;
  onToggleBookmark: (anime: Anime) => void;
}

export const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({
  anime,
  onClose,
  onWatch,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [fullInfo, setFullInfo] = useState<(Anime & { episodes: Episode[] }) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!anime?.slug) return;
    setLoading(true);
    fetchAnimeInfo(anime.slug)
      .then((data) => {
        setFullInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Modal info fetch fallback:', err);
        setLoading(false);
      });
  }, [anime?.slug]);

  if (!anime) return null;

  const current = fullInfo || anime;
  const poster = current.poster || current.cover_image?.large || '';
  const banner = current.banner || poster;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner header */}
        <div className="relative h-48 w-full overflow-hidden bg-zinc-900">
          <img
            src={banner}
            alt={current.name}
            className="h-full w-full object-cover opacity-40 filter blur-[1px]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white border border-zinc-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="relative -mt-16 flex flex-col sm:flex-row gap-5 p-6 pt-0">
          {/* Poster */}
          <img
            src={poster}
            alt={current.name}
            className="h-48 w-32 shrink-0 rounded-xl object-cover shadow-2xl border-2 border-zinc-800 bg-zinc-900 self-center sm:self-start"
            referrerPolicy="no-referrer"
          />

          <div className="flex flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {current.score && (
                <div className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{current.score}</span>
                </div>
              )}
              {current.format && (
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                  {current.format}
                </span>
              )}
              {current.status && (
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                  {current.status}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">{current.name || current.title}</h2>
            {current.jname && (
              <p className="text-xs text-rose-400 font-medium mt-0.5">{current.jname}</p>
            )}

            <p className="text-xs text-zinc-300 line-clamp-4 leading-relaxed mt-2.5">
              {current.description || 'No description available for this title.'}
            </p>

            {/* Genres */}
            {current.genres && (
              <div className="flex flex-wrap gap-1 mt-3">
                {current.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-700/40"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => {
                  onClose();
                  onWatch(current.slug, 1, current.anilist_id, current);
                }}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-900/30 hover:bg-rose-500 transition"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Watch Episode 1</span>
              </button>

              <button
                onClick={() => onToggleBookmark(current)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
                  isBookmarked
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {isBookmarked ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{isBookmarked ? 'Saved' : 'Watchlist'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
