import React from 'react';
import { Play, Star, Plus, Check, Info } from 'lucide-react';
import { Anime } from '../types.js';

interface HeroBannerProps {
  anime: Anime;
  onWatch: (slug: string, episode?: number, anilistId?: number, anime?: Anime) => void;
  onInfo: (anime: Anime) => void;
  isBookmarked: boolean;
  onToggleBookmark: (anime: Anime) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  anime,
  onWatch,
  onInfo,
  isBookmarked,
  onToggleBookmark,
}) => {
  const backdrop =
    anime.banner ||
    anime.poster ||
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1400&auto=format&fit=crop&q=80';

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-2xl">
      {/* Background with cinematic gradients */}
      <div className="absolute inset-0 z-0">
        <img
          src={backdrop}
          alt={anime.name || anime.title}
          className="h-full w-full object-cover object-top opacity-35 filter blur-[1px] transform scale-105 transition duration-1000"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end p-6 sm:p-10 md:p-12 min-h-[380px] sm:min-h-[440px] max-w-3xl">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded-md bg-rose-500/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-400 border border-rose-500/30">
            Spotlight Spotlight
          </span>
          {anime.score && (
            <div className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{anime.score}</span>
            </div>
          )}
          {anime.format && (
            <span className="rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">
              {anime.format}
            </span>
          )}
          {anime.episodes_count && (
            <span className="rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">
              {anime.episodes_count} Episodes
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white line-clamp-2">
          {anime.name || anime.title}
        </h1>

        {anime.jname && (
          <p className="text-xs sm:text-sm font-medium text-rose-300/80 mt-1 mb-2">
            {anime.jname}
          </p>
        )}

        {/* Description */}
        <p className="mt-2 text-xs sm:text-sm text-zinc-300 line-clamp-3 max-w-2xl leading-relaxed">
          {anime.description || 'Embark on an epic journey with legendary battles, supernatural mysteries, and heartfelt bonds.'}
        </p>

        {/* Genre Tags */}
        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {anime.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="rounded-full bg-zinc-800/60 px-2.5 py-0.5 text-[11px] text-zinc-300 border border-zinc-700/50"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button
            id={`hero-watch-btn-${anime.slug}`}
            onClick={() => onWatch(anime.slug, 1, anime.anilist_id, anime)}
            className="group flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 active:scale-95 transition"
          >
            <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
            <span>Watch Episode 1</span>
          </button>

          <button
            id={`hero-bookmark-btn-${anime.slug}`}
            onClick={() => onToggleBookmark(anime)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition active:scale-95 ${
              isBookmarked
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {isBookmarked ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>In Watchlist</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Add to List</span>
              </>
            )}
          </button>

          <button
            id={`hero-details-btn-${anime.slug}`}
            onClick={() => onInfo(anime)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition"
          >
            <Info className="h-4 w-4 text-zinc-400" />
            <span>Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};
