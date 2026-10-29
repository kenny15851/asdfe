import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star, Calendar, Tv, Check, Bookmark, ListFilter, Play, Sparkles, AlertCircle } from 'lucide-react';
import { Anime, Episode, ServerLink, ServersResponse, StreamData } from '../types.js';
import { fetchAnimeInfo, fetchServers, fetchStream } from '../services/animeApi.js';
import { VideoPlayer } from './VideoPlayer.js';

interface WatchViewProps {
  slug: string;
  initialEpisode?: number;
  initialAnilistId?: number;
  initialAnime?: Anime;
  onBack: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (anime: Anime) => void;
  onRecordHistory: (anime: Anime, episode: number, time: number, duration: number) => void;
}

export const WatchView: React.FC<WatchViewProps> = ({
  slug,
  initialEpisode = 1,
  initialAnilistId,
  initialAnime,
  onBack,
  isBookmarked,
  onToggleBookmark,
  onRecordHistory,
}) => {
  const [anime, setAnime] = useState<(Anime & { episodes: Episode[] }) | null>(() => {
    if (initialAnime) {
      return {
        ...initialAnime,
        episodes: Array.from({ length: initialAnime.episodes_count || 12 }, (_, i) => ({
          id: i + 1,
          number: i + 1,
          title: `Episode ${i + 1}`,
          duration: '24m',
          thumbnail: initialAnime.banner || initialAnime.poster,
        })),
      };
    }
    return null;
  });
  const [currentEpisode, setCurrentEpisode] = useState<number>(initialEpisode);
  const [servers, setServers] = useState<{ sub: ServerLink[]; dub: ServerLink[] }>({ sub: [], dub: [] });
  const [selectedServer, setSelectedServer] = useState<ServerLink | null>(null);
  const [streamData, setStreamData] = useState<StreamData | null>(null);

  const [loadingInfo, setLoadingInfo] = useState(!initialAnime);
  const [loadingStream, setLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [episodeSearch, setEpisodeSearch] = useState('');

  const effectiveAnilistId = initialAnilistId || anime?.anilist_id;

  // 1. Fetch Anime Metadata & Episode List
  useEffect(() => {
    let isMounted = true;
    if (!anime) setLoadingInfo(true);

    fetchAnimeInfo(slug)
      .then((data) => {
        if (!isMounted) return;
        setAnime(data);
        setLoadingInfo(false);
      })
      .catch((err) => {
        console.error('Failed to load anime info:', err);
        if (isMounted) setLoadingInfo(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // 2. Fetch Servers whenever episode changes
  useEffect(() => {
    let isMounted = true;
    if (!slug) return;

    fetchServers(slug, currentEpisode, effectiveAnilistId)
      .then((res: ServersResponse) => {
        if (!isMounted) return;
        setServers({ sub: res.sub || [], dub: res.dub || [] });

        // Auto-select MegaBuzz server if available or first sub server
        const preferred =
          res.sub.find((s) => s.source_type === 'megaplay' || s.serverName.toLowerCase().includes('mega')) ||
          res.sub[0] ||
          res.dub[0] ||
          null;
        setSelectedServer(preferred);
      })
      .catch((err) => {
        console.error('Failed to load servers:', err);
        if (isMounted) {
          // Fallback server
          const aid = effectiveAnilistId || 151807;
          const fallbackMega: ServerLink = {
            serverName: 'MegaBuzz (Sub)',
            dataType: 'sub',
            access_id: `megaplay-ani-${aid}-${currentEpisode}-sub`,
            source_type: 'megaplay',
            direct_url: `https://megaplay.buzz/stream/ani/${aid}/${currentEpisode}/sub`,
            embed_url: `https://megaplay.buzz/stream/ani/${aid}/${currentEpisode}/sub`,
            link: `https://megaplay.buzz/stream/ani/${aid}/${currentEpisode}/sub`,
          };
          setServers({ sub: [fallbackMega], dub: [] });
          setSelectedServer(fallbackMega);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug, currentEpisode, effectiveAnilistId]);


  // 3. Fetch Stream URL when selectedServer changes
  const loadStreamForServer = (server: ServerLink) => {
    const isMega = server.source_type === 'megaplay' || server.serverName.toLowerCase().includes('mega');
    const isDub = server.dataType === 'dub';

    // MegaBuzz server uses iframe directly: load immediately without decryption call
    if (isMega) {
      setLoadingStream(false);
      setStreamError(null);
      const aid = effectiveAnilistId || 151807;
      const megaUrl =
        server.direct_url ||
        `https://megaplay.buzz/stream/ani/${aid}/${currentEpisode}/${isDub ? 'dub' : 'sub'}`;
      setStreamData({
        url: '',
        embed_url: megaUrl,
        subtitles: [],
        thumbnails_vtt: null,
        video_title: `${anime?.name || 'Anime'} - Episode ${currentEpisode} (${isDub ? 'Dub' : 'Sub'})`,
        intro_chapter: null,
        outro_chapter: null,
        video_id: server.access_id || null,
      });
      return;
    }

    if (!server.access_id) {
      const fallbackEmbed = server.embed_url || server.link;
      if (fallbackEmbed) {
        setStreamData({
          url: '',
          embed_url: fallbackEmbed,
          subtitles: [],
          thumbnails_vtt: null,
          video_title: `${anime?.name || 'Anime'} - Episode ${currentEpisode} (${server.dataType === 'dub' ? 'Dub' : 'Sub'})`,
          intro_chapter: null,
          outro_chapter: null,
          video_id: null,
        });
      } else {
        setStreamError('Server link has no access token');
      }
      return;
    }

    setLoadingStream(true);
    setStreamError(null);

    fetchStream(server.access_id, server.v || 2, isDub)
      .then((data) => {
        setStreamData({
          ...data,
          embed_url: server.embed_url || server.link || data.embed_url,
        });
        setLoadingStream(false);
      })
      .catch((err) => {
        console.warn('Stream load error:', err);
        // If this server failed or 404'd, automatically switch to primary HD server
        const fallbackServer =
          servers.sub.find((s) => s.source_type !== 'megaplay' && s.is_available !== false) ||
          servers.dub.find((s) => s.source_type !== 'megaplay' && s.is_available !== false) ||
          servers.sub[0];
        if (fallbackServer && fallbackServer.$id !== server.$id) {
          setSelectedServer(fallbackServer);
        } else {
          const fallbackEmbed = server.embed_url || server.link;
          if (fallbackEmbed) {
            setStreamData({
              url: '',
              embed_url: fallbackEmbed,
              subtitles: [],
              thumbnails_vtt: null,
              video_title: `${anime?.name || 'Anime'} - Episode ${currentEpisode} (${isDub ? 'Dub' : 'Sub'})`,
              intro_chapter: null,
              outro_chapter: null,
              video_id: server.access_id || null,
            });
            setLoadingStream(false);
          } else {
            setStreamError(err.message || 'Stream failed to decrypt or load');
            setLoadingStream(false);
          }
        }
      });
  };

  useEffect(() => {
    if (selectedServer) {
      loadStreamForServer(selectedServer);
    }
  }, [selectedServer]);

  // Record history immediately when anime and episode are loaded
  useEffect(() => {
    if (anime) {
      onRecordHistory(anime, currentEpisode, 0, 1440);
    }
  }, [anime?.slug, currentEpisode]);

  const handleSelectEpisode = (epNum: number) => {
    setCurrentEpisode(epNum);
  };

  const handleTimeUpdate = (time: number, duration: number) => {
    if (anime) {
      onRecordHistory(anime, currentEpisode, time, duration);
    }
  };

  const episodes = anime?.episodes || [];
  const filteredEpisodes = episodes.filter((ep) =>
    epSearchFilter(ep, episodeSearch)
  );

  function epSearchFilter(ep: Episode, query: string) {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      ep.number.toString().includes(q) ||
      (ep.title && ep.title.toLowerCase().includes(q))
    );
  }

  const hasNext = currentEpisode < episodes.length;
  const hasPrev = currentEpisode > 1;

  if (loadingInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-28">
        <div className="h-10 w-10 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
        <p className="text-xs text-zinc-400 mt-4">Loading anime media & stream servers...</p>
      </div>
    );
  }

  const animeTitle = anime?.name || anime?.title || 'Anime Stream';

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Browse</span>
        </button>

        {anime && (
          <button
            onClick={() => onToggleBookmark(anime)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              isBookmarked
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {isBookmarked ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Bookmark className="h-3.5 w-3.5" />}
            <span>{isBookmarked ? 'In Watchlist' : 'Add to Watchlist'}</span>
          </button>
        )}
      </div>

      {/* Main Layout: Video Player + Episode Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Video Player & Info */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <VideoPlayer
            streamData={streamData}
            isLoading={loadingStream}
            error={streamError}
            onRetry={() => selectedServer && loadStreamForServer(selectedServer)}
            animeTitle={animeTitle}
            episodeNumber={currentEpisode}
            servers={servers}
            selectedServer={selectedServer}
            onSelectServer={(s) => setSelectedServer(s)}
            onNextEpisode={() => hasNext && setCurrentEpisode(currentEpisode + 1)}
            onPrevEpisode={() => hasPrev && setCurrentEpisode(currentEpisode - 1)}
            hasNextEpisode={hasNext}
            hasPrevEpisode={hasPrev}
            onTimeUpdate={handleTimeUpdate}
            anilistId={effectiveAnilistId}
          />

          {/* Quick Server Switcher Bar */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-300">Active Source & Server:</span>
                {selectedServer?.source_type === 'megaplay' || selectedServer?.serverName?.toLowerCase().includes('mega') ? (
                  <span className="flex items-center gap-1 rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/40">
                    <Sparkles className="h-3 w-3 text-purple-400" /> MEGABUZZ (megaplay.buzz iframe)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-500/30">
                    FLIXCLOUD (Native Player)
                  </span>
                )}
              </div>

              {selectedServer?.direct_url && (
                <a
                  href={selectedServer.direct_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-purple-400 hover:text-purple-300 underline underline-offset-2 flex items-center gap-1"
                >
                  Direct Stream Link &rarr;
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {servers.sub.map((s, i) => {
                const isSelected =
                  selectedServer?.$id
                    ? selectedServer.$id === s.$id
                    : selectedServer?.access_id === s.access_id && selectedServer?.dataType === 'sub';
                const isMega = s.source_type === 'megaplay' || s.serverName.toLowerCase().includes('mega');

                return (
                  <button
                    key={s.$id || `sub-${i}`}
                    onClick={() => setSelectedServer(s)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? isMega
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 ring-1 ring-purple-400'
                          : 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                        : isMega
                        ? 'bg-purple-950/40 text-purple-200 border border-purple-800/60 hover:bg-purple-900/50'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {isMega && <Sparkles className="h-3 w-3 text-purple-300" />}
                    <span>{s.serverName}</span>
                  </button>
                );
              })}
              {servers.dub.map((s, i) => {
                const isSelected =
                  selectedServer?.$id
                    ? selectedServer.$id === s.$id
                    : selectedServer?.access_id === s.access_id && selectedServer?.dataType === 'dub';
                const isMega = s.source_type === 'megaplay' || s.serverName.toLowerCase().includes('mega');

                return (
                  <button
                    key={s.$id || `dub-${i}`}
                    onClick={() => setSelectedServer(s)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? isMega
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 ring-1 ring-purple-400'
                          : 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                        : isMega
                        ? 'bg-purple-950/40 text-purple-200 border border-purple-800/60 hover:bg-purple-900/50'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {isMega && <Sparkles className="h-3 w-3 text-amber-300" />}
                    <span>{s.serverName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metadata Section */}
          {anime && (
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 mt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{animeTitle}</h1>
                {anime.score && (
                  <div className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{anime.score}</span>
                  </div>
                )}
              </div>

              {anime.jname && (
                <p className="text-xs font-medium text-rose-300/80">{anime.jname}</p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 text-xs">
                {anime.format && (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-300 font-medium">
                    {anime.format}
                  </span>
                )}
                {anime.status && (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-300 font-medium">
                    {anime.status}
                  </span>
                )}
                {anime.season && (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-300 font-medium">
                    {anime.season} {anime.year}
                  </span>
                )}
                {anime.anilist_id && (
                  <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-indigo-300 font-medium border border-indigo-500/30">
                    AniList #{anime.anilist_id}
                  </span>
                )}
              </div>

              {/* Synopsis */}
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mt-1">
                {anime.description || 'Follow this anime series with full high definition episodes and multi-language subtitles.'}
              </p>

              {/* Genres */}
              {anime.genres && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {anime.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-[11px] text-zinc-300 border border-zinc-700/50"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 col: Episode Guide & Selector */}
        <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 h-[580px]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tv className="h-4 w-4 text-rose-500" /> Episodes
              </h3>
              <span className="text-[11px] text-zinc-400">
                Total: {episodes.length} episodes
              </span>
            </div>

            {/* Quick search input */}
            <div className="w-28 sm:w-32">
              <input
                type="text"
                placeholder="Filter ep..."
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Episode List Scroll Container */}
          <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {filteredEpisodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <ListFilter className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs">No episodes matching "{episodeSearch}"</p>
              </div>
            ) : (
              filteredEpisodes.map((ep) => {
                const isActive = ep.number === currentEpisode;
                return (
                  <button
                    key={ep.id || ep.number}
                    onClick={() => handleSelectEpisode(ep.number)}
                    className={`group flex items-center justify-between rounded-xl p-2.5 text-left transition ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800/80 hover:text-white border border-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:text-white'
                        }`}
                      >
                        {isActive ? <Play className="h-3.5 w-3.5 fill-current" /> : ep.number}
                      </div>

                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold truncate">
                          {ep.title || `Episode ${ep.number}`}
                        </span>
                        {ep.duration && (
                          <span className={`text-[10px] ${isActive ? 'text-rose-200' : 'text-zinc-500'}`}>
                            {ep.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded bg-white/20 px-1.5 py-0.5 shrink-0">
                        Playing
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
