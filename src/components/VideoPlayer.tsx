import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  FastForward,
  Settings,
  Subtitles,
  Server,
  AlertCircle,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { ServerLink, StreamData } from '../types.js';

interface VideoPlayerProps {
  streamData: StreamData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  animeTitle: string;
  episodeNumber: number;
  servers: { sub: ServerLink[]; dub: ServerLink[] };
  selectedServer: ServerLink | null;
  onSelectServer: (server: ServerLink) => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  anilistId?: number | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamData,
  isLoading,
  error,
  onRetry,
  animeTitle,
  episodeNumber,
  servers,
  selectedServer,
  onSelectServer,
  onNextEpisode,
  onPrevEpisode,
  hasNextEpisode,
  hasPrevEpisode,
  onTimeUpdate,
  anilistId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('off');
  const [autoNext, setAutoNext] = useState(true);
  const [megaMuted, setMegaMuted] = useState(false);
  const [showMegaUnmuteNotice, setShowMegaUnmuteNotice] = useState(true);

  // Embed player (MegaBuzz, VidSrc, 2Embed, or any embed server)
  const isEmbedPlayer = Boolean(
    selectedServer?.source_type === 'megaplay' ||
    selectedServer?.serverName?.toLowerCase().includes('mega') ||
    selectedServer?.embed_url ||
    selectedServer?.direct_url?.includes('embed')
  );
  const isMegaBuzz = isEmbedPlayer;

  const effectiveAid = anilistId || 151807;
  const lang = selectedServer?.dataType === 'dub' ? 'dub' : 'sub';

  const isStaticHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('neocities.org') ||
      window.location.protocol === 'file:' ||
      window.location.hostname.includes('github.io') ||
      !window.location.port ||
      localStorage.getItem('reanime_force_static') === 'true');

  const customBackend =
    typeof window !== 'undefined' ? (localStorage.getItem('reanime_custom_backend') || '').trim() : '';

  let megaBuzzSrc = `/stream/ani/${effectiveAid}/${episodeNumber}/${lang}`;
  if (customBackend) {
    megaBuzzSrc = `${customBackend.replace(/\/$/, '')}/stream/ani/${effectiveAid}/${episodeNumber}/${lang}`;
  } else if (isStaticHost || selectedServer?.embed_url) {
    megaBuzzSrc =
      selectedServer?.embed_url ||
      selectedServer?.direct_url ||
      `https://megaplay.buzz/stream/ani/${effectiveAid}/${episodeNumber}/${lang}`;
  } else if (selectedServer?.direct_url && selectedServer.direct_url.includes('/stream/')) {
    megaBuzzSrc = selectedServer.direct_url.replace('https://megaplay.buzz', '');
  }

  const handleMegaBuzzUnmute = () => {
    iframeRef.current?.contentWindow?.postMessage({ megaCommand: 'unmute' }, '*');
    setMegaMuted(false);
    setShowMegaUnmuteNotice(false);
  };

  const handleMegaBuzzToggleMute = () => {
    iframeRef.current?.contentWindow?.postMessage({ megaCommand: 'toggleMute' }, '*');
    setMegaMuted(!megaMuted);
    setShowMegaUnmuteNotice(false);
  };

  // Sync audio status reported from the iframe player
  useEffect(() => {
    const handleWindowMsg = (e: MessageEvent) => {
      if (e.data && e.data.megaStatus === 'audio-changed') {
        setMegaMuted(Boolean(e.data.muted));
        setShowMegaUnmuteNotice(false);
      }
    };
    window.addEventListener('message', handleWindowMsg);
    return () => window.removeEventListener('message', handleWindowMsg);
  }, []);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Safe playback controllers that coordinate play() promises with pause() calls
  const safePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const promise = video.play();
      if (promise !== undefined && typeof promise.then === 'function') {
        playPromiseRef.current = promise;
        promise
          .then(() => {
            playPromiseRef.current = null;
            setIsPlaying(true);
          })
          .catch((err: any) => {
            playPromiseRef.current = null;
            if (err?.name === 'NotAllowedError') {
              // Browser autoplay policy requires user gesture for audio; play muted & prompt
              video.muted = true;
              setIsMuted(true);
              video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            } else {
              setIsPlaying(false);
              if (err?.name !== 'AbortError') {
                console.warn('Playback notice:', err);
              }
            }
          });
      } else {
        setIsPlaying(true);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        console.warn('Playback error caught:', err);
      }
      setIsPlaying(false);
    }
  };

  const safePause = () => {
    const video = videoRef.current;
    if (!video) return;

    const executePause = () => {
      try {
        if (!video.paused) {
          video.pause();
        }
        setIsPlaying(false);
      } catch {
        // Ignored
      }
    };

    if (playPromiseRef.current) {
      // If a play request is currently pending, wait for it to settle before pausing
      // This prevents "The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22"
      playPromiseRef.current
        .then(() => {
          executePause();
        })
        .catch(() => {
          executePause();
        });
    } else {
      executePause();
    }
  };

  // Setup HLS Stream (only for native player, not MegaBuzz iframe)
  useEffect(() => {
    if (isMegaBuzz) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video || !streamData?.url) return;

    let isDisposed = false;

    // Safely pause current playback before destroying or replacing stream
    safePause();

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = streamData.url;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
        defaultAudioCodec: 'mp4a.40.2',
        autoStartLoad: true,
        startFragPrefetch: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        if (hls.audioTracks && hls.audioTracks.length > 0 && hls.audioTrack < 0) {
          hls.audioTrack = 0;
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls.audioTracks && hls.audioTracks.length > 0 && hls.audioTrack < 0) {
          hls.audioTrack = 0;
        }
        if (!isDisposed) {
          safePlay();
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Network error encountered, attempting recovery');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media error encountered, recovering');
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      const onLoaded = () => {
        if (!isDisposed) {
          safePlay();
        }
      };
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
    }

    return () => {
      isDisposed = true;
      safePause();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamData?.url, isMegaBuzz]);

  // Video event handlers
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      safePlay();
    } else {
      safePause();
    }
  };

  // In MegaBuzz iframe mode, track session time for watch history
  useEffect(() => {
    if (!isMegaBuzz) return;
    let secondsWatched = 0;
    const interval = setInterval(() => {
      secondsWatched += 10;
      onTimeUpdate?.(secondsWatched, 1440);
    }, 10000);

    return () => clearInterval(interval);
  }, [isMegaBuzz, episodeNumber, animeTitle]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);
    onTimeUpdate?.(video.currentTime, video.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  const handleToggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoNext && hasNextEpisode && onNextEpisode) {
      onNextEpisode();
    }
  };

  const handleSkipIntro = () => {
    const video = videoRef.current;
    if (!video) return;
    if (streamData?.intro_chapter) {
      video.currentTime = streamData.intro_chapter.end;
    } else {
      video.currentTime += 85;
    }
  };

  const handleSkipOutro = () => {
    const video = videoRef.current;
    if (!video) return;
    if (streamData?.outro_chapter) {
      video.currentTime = streamData.outro_chapter.end;
    } else if (hasNextEpisode && onNextEpisode) {
      onNextEpisode();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Intro skip banner condition
  const inIntro =
    streamData?.intro_chapter &&
    currentTime >= streamData.intro_chapter.start &&
    currentTime <= streamData.intro_chapter.end;

  const inOutro =
    streamData?.outro_chapter &&
    currentTime >= streamData.outro_chapter.start &&
    currentTime <= streamData.outro_chapter.end;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="group relative w-full aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl border border-zinc-800 select-none"
    >
      {/* MegaBuzz Player: EXCLUSIVELY uses <iframe> with exact specified attributes */}
      {isMegaBuzz ? (
        <div className="relative w-full h-full bg-black">
          <iframe
            ref={iframeRef}
            key={`megabuzz-${effectiveAid}-${episodeNumber}-${lang}`}
            src={megaBuzzSrc}
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope; clipboard-write"
            title={`${animeTitle} - Episode ${episodeNumber}`}
            className="h-full w-full border-0 bg-black"
          />

          {/* Top Quick Bar Overlay for MegaBuzz (Hoverable) */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/90 via-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="text-xs font-bold text-white line-clamp-1">{animeTitle}</span>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-500/30">
                EP {episodeNumber}
              </span>
              <span className="rounded px-2 py-0.5 text-[10px] font-bold border bg-purple-500/30 text-purple-200 border-purple-500/50">
                MegaBuzz ({lang.toUpperCase()})
              </span>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {/* Sound Toggle */}
              <button
                onClick={handleMegaBuzzToggleMute}
                title={megaMuted ? 'Unmute Sound' : 'Mute Sound'}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900/90 px-2.5 py-1 text-xs font-semibold text-zinc-200 border border-purple-500/50 hover:bg-purple-950/60 transition shadow"
              >
                {megaMuted ? (
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                )}
                <span>{megaMuted ? 'Unmute' : 'Audio On'}</span>
              </button>

              {/* Server selector */}
              <div className="relative">
                <button
                  onClick={() => setShowServerMenu(!showServerMenu)}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900/90 px-2.5 py-1 text-xs font-medium text-zinc-200 border border-zinc-700/80 hover:bg-zinc-800 transition shadow"
                >
                  <Server className="h-3.5 w-3.5 text-purple-400" />
                  <span>Servers</span>
                </button>

                {showServerMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-zinc-900/95 p-2.5 shadow-2xl border border-zinc-800 backdrop-blur-md z-30">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-400 px-2 py-1 border-b border-zinc-800 mb-1.5">
                      <span>Streaming Servers</span>
                      <span className="text-purple-400 lowercase">megaplay.buzz</span>
                    </div>

                    {/* MegaBuzz Servers Group */}
                    <div className="mb-2">
                      <span className="text-[10px] font-bold text-purple-300 px-2 block mb-1">
                        MegaBuzz Stream (Iframe)
                      </span>
                      <div className="flex flex-col gap-1">
                        {[...servers.sub, ...servers.dub]
                          .filter((srv) => srv.source_type === 'megaplay' || srv.serverName.toLowerCase().includes('mega'))
                          .map((srv) => {
                            const isSelected = selectedServer?.$id === srv.$id;
                            return (
                              <button
                                key={srv.$id || srv.serverName}
                                onClick={() => {
                                  onSelectServer(srv);
                                  setShowServerMenu(false);
                                }}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                                  isSelected
                                    ? 'bg-purple-600 text-white font-bold shadow'
                                    : 'text-zinc-300 hover:bg-zinc-800/80'
                                }`}
                              >
                                <span className="truncate">{srv.serverName}</span>
                                <span className="text-[10px] uppercase font-semibold opacity-80">{srv.dataType}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Primary HD Servers Group (Native Video Player) */}
                    {[...servers.sub, ...servers.dub].some(
                      (srv) => srv.source_type !== 'megaplay' && !srv.serverName.toLowerCase().includes('mega')
                    ) && (
                      <div className="border-t border-zinc-800 pt-1.5">
                        <span className="text-[10px] font-bold text-rose-300 px-2 block mb-1">
                          Native HD Player Servers
                        </span>
                        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                          {[...servers.sub, ...servers.dub]
                            .filter((srv) => srv.source_type !== 'megaplay' && !srv.serverName.toLowerCase().includes('mega'))
                            .map((srv) => {
                              const isSelected = selectedServer?.$id === srv.$id;
                              return (
                                <button
                                  key={srv.$id || srv.serverName}
                                  onClick={() => {
                                    onSelectServer(srv);
                                    setShowServerMenu(false);
                                  }}
                                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                                    isSelected
                                      ? 'bg-rose-600 text-white font-bold shadow'
                                      : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
                                  }`}
                                >
                                  <span className="truncate">{srv.serverName}</span>
                                  <span className="text-[10px] uppercase font-semibold opacity-80">{srv.dataType}</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {hasPrevEpisode && (
                <button
                  onClick={onPrevEpisode}
                  title="Previous Episode"
                  className="rounded-lg bg-zinc-900/90 p-1.5 text-zinc-300 border border-zinc-700/80 hover:bg-zinc-800 hover:text-white transition shadow"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}

              {hasNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  title="Next Episode"
                  className="rounded-lg bg-zinc-900/90 p-1.5 text-zinc-300 border border-zinc-700/80 hover:bg-zinc-800 hover:text-white transition shadow"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                onClick={handleToggleFullscreen}
                title="Toggle Fullscreen"
                className="rounded-lg bg-zinc-900/90 p-1.5 text-zinc-300 border border-zinc-700/80 hover:bg-zinc-800 hover:text-white transition shadow"
              >
                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* HTML5 Video Element: ONLY for non-MegaBuzz servers */}
          <video
            ref={videoRef}
            onClick={handlePlayPause}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="h-full w-full object-contain cursor-pointer"
            playsInline
          />
        </>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
          <div className="h-12 w-12 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
          <p className="mt-4 font-medium text-sm text-zinc-200">
            Loading {animeTitle} - Episode {episodeNumber}...
          </p>
          <span className="text-xs text-zinc-400 mt-1">Connecting to streaming server</span>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-rose-500 mb-3" />
          <h3 className="text-lg font-bold text-white">Stream Playback Notice</h3>
          <p className="max-w-md text-xs sm:text-sm text-zinc-400 mt-1 mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition"
            >
              <RotateCcw className="h-4 w-4" />
              Try Alternate Server / Retry
            </button>
          </div>
        </div>
      )}

      {/* Unmute Floating Banner for Native Mode */}
      {!isMegaBuzz && isPlaying && (isMuted || volume === 0) && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 animate-fade-in pointer-events-auto">
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.volume = 1;
              }
              setVolume(1);
              setIsMuted(false);
            }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all border border-white/20 animate-pulse"
          >
            <Volume2 className="h-4 w-4" />
            <span>Click to Unmute Sound</span>
          </button>
        </div>
      )}

      {/* Skip Intro Floating Banner (Native Mode) */}
      {!isMegaBuzz && inIntro && (
        <div className="absolute bottom-20 left-6 z-20 animate-fade-in">
          <button
            onClick={handleSkipIntro}
            className="flex items-center gap-2 rounded-xl bg-zinc-900/90 px-4 py-2 text-xs font-bold text-white border border-rose-500/50 shadow-lg backdrop-blur-md hover:bg-rose-600 transition active:scale-95"
          >
            <FastForward className="h-4 w-4 text-rose-400 fill-current" />
            <span>Skip Opening Intro</span>
          </button>
        </div>
      )}

      {/* Skip Outro Floating Banner (Native Mode) */}
      {!isMegaBuzz && inOutro && (
        <div className="absolute bottom-20 right-6 z-20 animate-fade-in">
          <button
            onClick={handleSkipOutro}
            className="flex items-center gap-2 rounded-xl bg-zinc-900/90 px-4 py-2 text-xs font-bold text-white border border-rose-500/50 shadow-lg backdrop-blur-md hover:bg-rose-600 transition active:scale-95"
          >
            <SkipForward className="h-4 w-4 text-rose-400 fill-current" />
            <span>Skip Ending Outro</span>
          </button>
        </div>
      )}

      {/* Top Header Overlay (Native Mode) */}
      {!isMegaBuzz && (
        <div
          className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-white line-clamp-1">{animeTitle}</h2>
              <span className="text-[11px] text-zinc-400 font-medium">Episode {episodeNumber}</span>
            </div>
          </div>

          {/* Server Indicator Chip */}
          <div className="flex items-center gap-2">
            {selectedServer && (
              <span className="rounded-md bg-zinc-800/80 px-2.5 py-1 text-[11px] font-semibold text-rose-300 border border-zinc-700/60">
                Server: {selectedServer.serverName} ({selectedServer.dataType.toUpperCase()})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar (Native Mode Only) */}
      {!isMegaBuzz && (
        <div
          className={`absolute bottom-0 inset-x-0 z-20 flex flex-col justify-end p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
        {/* Progress Seek Bar */}
        <div className="relative flex items-center mb-2.5">
          <input
            id="video-seek-bar"
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:h-2 transition-all"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Play/Pause, Skip, Volume, Time */}
          <div className="flex items-center gap-3">
            <button
              id="player-play-btn"
              onClick={handlePlayPause}
              className="p-1.5 text-white hover:text-rose-400 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </button>

            {hasPrevEpisode && (
              <button
                id="player-prev-btn"
                onClick={onPrevEpisode}
                className="p-1 text-zinc-300 hover:text-white transition"
                title="Previous Episode"
              >
                <SkipForward className="h-4 w-4 rotate-180" />
              </button>
            )}

            {hasNextEpisode && (
              <button
                id="player-next-btn"
                onClick={onNextEpisode}
                className="p-1 text-zinc-300 hover:text-white transition"
                title="Next Episode"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            )}

            {/* Volume */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                id="player-mute-btn"
                onClick={handleToggleMute}
                className="p-1 text-zinc-300 hover:text-white transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-rose-400" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                id="player-volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[11px] font-mono text-zinc-400">
              <span className="text-white">{formatTime(currentTime)}</span> / {formatTime(duration)}
            </div>
          </div>

          {/* Right: Servers, Subtitles, Speed, Fullscreen */}
          <div className="flex items-center gap-2 relative">
            {/* Auto Next Toggle */}
            <button
              id="player-auto-next-btn"
              onClick={() => setAutoNext(!autoNext)}
              title="Auto-play next episode"
              className={`rounded px-2 py-1 text-[10px] font-semibold border transition ${
                autoNext
                  ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              AUTO NEXT
            </button>

            {/* Server Selector Button */}
            <button
              id="player-server-menu-btn"
              onClick={() => {
                setShowServerMenu(!showServerMenu);
                setShowSettings(false);
                setShowSubtitleMenu(false);
              }}
              className="flex items-center gap-1 rounded-md bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-300 hover:text-white border border-zinc-700 transition"
              title="Switch Streaming Server"
            >
              <Server className="h-3.5 w-3.5 text-rose-400" />
              <span>Servers</span>
            </button>

            {/* Subtitles Button */}
            {streamData?.subtitles && streamData.subtitles.length > 0 && (
              <button
                id="player-subs-btn"
                onClick={() => {
                  setShowSubtitleMenu(!showSubtitleMenu);
                  setShowSettings(false);
                  setShowServerMenu(false);
                }}
                className="p-1.5 text-zinc-300 hover:text-white transition"
                title="Subtitles"
              >
                <Subtitles className="h-4 w-4" />
              </button>
            )}

            {/* Settings Button */}
            <button
              id="player-settings-btn"
              onClick={() => {
                setShowSettings(!showSettings);
                setShowServerMenu(false);
                setShowSubtitleMenu(false);
              }}
              className="p-1.5 text-zinc-300 hover:text-white transition"
              title="Playback Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Fullscreen */}
            <button
              id="player-fullscreen-btn"
              onClick={handleToggleFullscreen}
              className="p-1.5 text-zinc-300 hover:text-white transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>

            {/* Popover: Server Menu */}
            {showServerMenu && (
              <div className="absolute bottom-10 right-10 z-40 w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl backdrop-blur-md animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-rose-400" /> Available Servers
                  </span>
                  <button
                    onClick={() => setShowServerMenu(false)}
                    className="text-[10px] text-zinc-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                {/* Sub Servers */}
                <div className="mb-2">
                  <span className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">
                    Subtitled (SUB)
                  </span>
                  <div className="flex flex-col gap-1">
                    {servers.sub.map((s, idx) => (
                      <button
                        key={s.$id || idx}
                        onClick={() => {
                          onSelectServer(s);
                          setShowServerMenu(false);
                        }}
                        className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left transition ${
                          selectedServer?.access_id === s.access_id
                            ? 'bg-rose-600 text-white font-bold'
                            : 'text-zinc-300 hover:bg-zinc-900'
                        }`}
                      >
                        <span>{s.serverName}</span>
                        <span className="text-[10px] opacity-70">HLS</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dub Servers */}
                {servers.dub.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">
                      English Dub (DUB)
                    </span>
                    <div className="flex flex-col gap-1">
                      {servers.dub.map((s, idx) => (
                        <button
                          key={s.$id || idx}
                          onClick={() => {
                            onSelectServer(s);
                            setShowServerMenu(false);
                          }}
                          className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left transition ${
                            selectedServer?.access_id === s.access_id
                              ? 'bg-rose-600 text-white font-bold'
                              : 'text-zinc-300 hover:bg-zinc-900'
                          }`}
                        >
                          <span>{s.serverName}</span>
                          <span className="text-[10px] opacity-70">DUB</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Popover: Subtitles */}
            {showSubtitleMenu && (
              <div className="absolute bottom-10 right-10 z-40 w-52 rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl backdrop-blur-md animate-fade-in">
                <span className="text-xs font-bold text-white block mb-2 border-b border-zinc-800 pb-1">
                  Subtitles
                </span>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setSelectedSubtitle('off');
                      setShowSubtitleMenu(false);
                    }}
                    className={`rounded px-2.5 py-1 text-xs text-left transition ${
                      selectedSubtitle === 'off' ? 'bg-rose-600 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    Off
                  </button>
                  {streamData?.subtitles.map((sub, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedSubtitle(sub.label);
                        setShowSubtitleMenu(false);
                      }}
                      className={`rounded px-2.5 py-1 text-xs text-left transition ${
                        selectedSubtitle === sub.label
                          ? 'bg-rose-600 text-white font-bold'
                          : 'text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      {sub.label || `Subtitle Track ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popover: Settings (Speed) */}
            {showSettings && (
              <div className="absolute bottom-10 right-4 z-40 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl backdrop-blur-md animate-fade-in">
                <span className="text-xs font-bold text-white block mb-2 border-b border-zinc-800 pb-1">
                  Playback Speed
                </span>
                <div className="flex flex-col gap-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`rounded px-2.5 py-1 text-xs text-left transition ${
                        playbackSpeed === s
                          ? 'bg-rose-600 text-white font-bold'
                          : 'text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      {s === 1 ? 'Normal (1.0x)' : `${s}x`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
