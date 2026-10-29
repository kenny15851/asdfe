import React from 'react';
import { Play, Star, Bookmark, Check } from 'lucide-react';
import { Anime } from '../types.js';

interface AnimeCardProps {
  anime: Anime;
  onSelect: (anime: Anime) => void;
  onWatch: (slug: string, episode?: number, anilistId?: number, anime?: Anime) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (anime: Anime, e: React.MouseEvent) => void;
  rank?: number;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  onSelect,
  onWatch,
  isBookmarked = false,
  onToggleBookmark,
  rank,
}) => {
  const posterUrl =
    anime.poster ||
    anime.cover_image?.large ||
    anime.cover_image?.medium ||
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';

  const title = anime.name || anime.title || 'Untitled Anime';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60 transition-all duration-200 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-rose-950/20">
      {/* Poster Media Box */}
      <div
        className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-950 cursor-pointer"
        onClick={() => onSelect(anime)}
      >
        <img
          src={posterUrl}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-black/30 opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Rank badge if present */}
        {rank !== undefined && (
          <div className="absolute top-2.5 left-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950/80 font-black text-xs text-rose-400 border border-rose-500/30 backdrop-blur-sm">
            #{rank}
          </div>
        )}

        {/* Top-Right Bookmark Button */}
        {onToggleBookmark && (
          <button
            id={`card-bookmark-${anime.slug || anime.id}`}
            title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
            onClick={(e) => onToggleBookmark(anime, e)}
            className={`absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg backdrop-blur-md transition ${
              isBookmarked
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-zinc-950/70 text-zinc-300 hover:bg-zinc-900 hover:text-white border border-zinc-800'
            }`}
          >
            {isBookmarked ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        )}

        {/* Score pill */}
        {anime.score && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-zinc-950/80 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-zinc-800 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{anime.score}</span>
          </div>
        )}

        {/* Quick Play Hover Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <button
            id={`card-quickplay-${anime.slug || anime.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onWatch(anime.slug, 1, anime.anilist_id, anime);
            }}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-xl shadow-rose-600/40 transform scale-90 group-hover:scale-100 transition hover:bg-rose-500"
          >
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </button>
        </div>

        {/* Episode / Format tags */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[10px] font-bold">
          <span className="rounded bg-rose-500/80 px-1.5 py-0.5 text-white">
            EP {anime.latest_episode || anime.episodes_count || '1'}
          </span>
          <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-zinc-300">
            SUB
          </span>
        </div>
      </div>

      {/* Info bottom */}
      <div className="flex flex-1 flex-col p-3">
        <h3
          onClick={() => onSelect(anime)}
          className="text-xs sm:text-sm font-bold text-white line-clamp-1 hover:text-rose-400 cursor-pointer transition"
          title={title}
        >
          {title}
        </h3>

        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
          <span>{anime.status || anime.season || anime.format || 'Anime'}</span>
          {anime.year && <span>{anime.year}</span>}
        </div>
      </div>
    </div>
  );
};
