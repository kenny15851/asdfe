import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  AlertCircle,
  Code,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Layers,
  Radio,
} from 'lucide-react';
import { fetchStreamFromLink, fetchStream } from '../services/animeApi.js';
import { StreamData } from '../types.js';

interface StreamTesterModalProps {
  onPlayStream: (streamData: StreamData, title: string) => void;
}

export const StreamTesterModal: React.FC<StreamTesterModalProps> = ({ onPlayStream }) => {
  const [activeTab, setActiveTab] = useState<'megaplay' | 'flixcloud'>('megaplay');

  // MegaPlay State
  const [megaAnilistId, setMegaAnilistId] = useState('151807');
  const [megaEpisode, setMegaEpisode] = useState(1);
  const [megaLang, setMegaLang] = useState<'sub' | 'dub'>('sub');
  const [megaPreviewUrl, setMegaPreviewUrl] = useState(
    'https://megaplay.buzz/stream/ani/151807/1/sub'
  );
  const [megaCopied, setMegaCopied] = useState(false);

  // FlixCloud State
  const [inputUrl, setInputUrl] = useState('https://flixcloud.cc/e/sample-access-1?v=2');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StreamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Update MegaPlay Preview URL
  const handleUpdateMegaPlay = (id: string, ep: number, lang: 'sub' | 'dub') => {
    setMegaAnilistId(id);
    setMegaEpisode(ep);
    setMegaLang(lang);
    setMegaPreviewUrl(`https://megaplay.buzz/stream/ani/${id}/${ep}/${lang}`);
  };

  const handleLaunchMegaPlay = () => {
    const proxyUrl = `/api/anime/megaplay-embed?url=${encodeURIComponent(megaPreviewUrl)}`;
    onPlayStream(
      {
        url: '',
        embed_url: proxyUrl,
        subtitles: [],
        thumbnails_vtt: null,
        video_title: `MegaPlay • AniList #${megaAnilistId} - Episode ${megaEpisode} (${megaLang.toUpperCase()})`,
        intro_chapter: null,
        outro_chapter: null,
        video_id: `megaplay-${megaAnilistId}-${megaEpisode}-${megaLang}`,
      },
      `MegaPlay Stream (EP ${megaEpisode})`
    );
  };

  const handleDecrypt = async () => {
    if (!inputUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let data: StreamData;
      if (inputUrl.includes('flixcloud.cc') || inputUrl.includes('/e/')) {
        data = await fetchStreamFromLink(inputUrl.trim());
      } else {
        data = await fetchStream(inputUrl.trim(), 2);
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Decryption failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMega = (text: string) => {
    navigator.clipboard.writeText(text);
    setMegaCopied(true);
    setTimeout(() => setMegaCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Streaming Source & Stream Hub
            </h2>
            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/30">
              megaplay.buzz/api
            </span>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 rounded-xl bg-zinc-900 p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('megaplay')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'megaplay'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>MegaPlay Source (API)</span>
            </button>
            <button
              onClick={() => setActiveTab('flixcloud')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'flixcloud'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>FlixCloud Decryptor</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          {activeTab === 'megaplay'
            ? 'Test and inspect live streams from MegaPlay (https://megaplay.buzz/api), the universal anime stream source supporting AniList, MAL, and catalog embed IDs.'
            : 'Execute the FlixCloud embed decryption algorithm. Input any FlixCloud embed URL or access ID to extract decrypted HLS (.m3u8) streams.'}
        </p>
      </div>

      {/* MegaPlay Tab */}
      {activeTab === 'megaplay' && (
        <div className="flex flex-col gap-6">
          {/* Preset Buttons */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                MegaPlay Quick Anime Selectors
              </label>
              <a
                href="https://megaplay.buzz/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <span>Docs: megaplay.buzz/api</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { title: 'Solo Leveling', id: '151807' },
                { title: "Frieren: Beyond Journey's End", id: '154587' },
                { title: 'Jujutsu Kaisen S2', id: '145064' },
                { title: 'Demon Slayer Hashira', id: '166240' },
                { title: 'One Piece', id: '21' },
                { title: 'Kaiju No. 8', id: '153288' },
                { title: 'Attack on Titan Final', id: '110277' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleUpdateMegaPlay(item.id, megaEpisode, megaLang)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    megaAnilistId === item.id
                      ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {item.title} (ID #{item.id})
                </button>
              ))}
            </div>

            {/* Custom Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 pt-3 border-t border-zinc-800/80">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  AniList ID
                </label>
                <input
                  type="text"
                  value={megaAnilistId}
                  onChange={(e) =>
                    handleUpdateMegaPlay(e.target.value, megaEpisode, megaLang)
                  }
                  placeholder="e.g. 151807"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  Episode Number
                </label>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={megaEpisode}
                  onChange={(e) =>
                    handleUpdateMegaPlay(
                      megaAnilistId,
                      Math.max(1, parseInt(e.target.value, 10) || 1),
                      megaLang
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  Audio Track (Sub / Dub)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateMegaPlay(megaAnilistId, megaEpisode, 'sub')}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                      megaLang === 'sub'
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    SUB
                  </button>
                  <button
                    onClick={() => handleUpdateMegaPlay(megaAnilistId, megaEpisode, 'dub')}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                      megaLang === 'dub'
                        ? 'bg-amber-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    DUB
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Stream URL */}
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Generated MegaPlay Embed URL (https://megaplay.buzz/api)
              </span>
              <div className="flex items-center gap-2 rounded-xl bg-zinc-950 p-2.5 border border-zinc-800">
                <span className="flex-1 font-mono text-xs text-purple-300 break-all select-all">
                  {megaPreviewUrl}
                </span>
                <button
                  onClick={() => handleCopyMega(megaPreviewUrl)}
                  className="p-1.5 text-zinc-400 hover:text-white transition shrink-0"
                  title="Copy MegaPlay Embed URL"
                >
                  {megaCopied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={handleLaunchMegaPlay}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-950/40 hover:from-purple-500 hover:to-indigo-500 transition"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play in Anime Player</span>
              </button>
            </div>
          </div>

          {/* Embedded Live Preview */}
          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
              <Layers className="h-4 w-4 text-purple-400" />
              Live MegaPlay Player Preview
            </span>
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-zinc-800">
              <iframe
                key={megaPreviewUrl}
                src={`/api/anime/megaplay-embed?url=${encodeURIComponent(megaPreviewUrl)}`}
                className="h-full w-full border-0"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; pointer-lock"
                title="MegaPlay Live Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* FlixCloud Tab */}
      {activeTab === 'flixcloud' && (
        <div className="flex flex-col gap-6">
          {/* Input box */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              FlixCloud Embed URL or Access ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="stream-tester-input"
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://flixcloud.cc/e/{access_id}?v=2 or access_id"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-xs text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none font-mono"
              />
              <button
                id="stream-tester-decrypt-btn"
                onClick={handleDecrypt}
                disabled={loading || !inputUrl.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-950/40 hover:bg-cyan-500 transition disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>{loading ? 'Decrypting...' : 'Decrypt Stream'}</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[11px] text-zinc-400">Quick Test Embeds:</span>
              <button
                onClick={() => setInputUrl('https://flixcloud.cc/e/sample-access-1?v=2')}
                className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700 transition"
              >
                Demo Server HD-2 (v=2)
              </button>
              <button
                onClick={() => setInputUrl('https://flixcloud.cc/e/sample-access-2?v=2')}
                className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700 transition"
              >
                Demo Multi-bitrate (v=2)
              </button>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-800/80 bg-rose-950/30 p-4 text-rose-300 text-xs">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <p>{error}</p>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Check className="h-4 w-4" /> Decryption Successful
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1">
                    {result.video_title || 'Decrypted Video Stream'}
                  </h3>
                </div>

                <button
                  onClick={() =>
                    onPlayStream(result, result.video_title || 'Flix Decrypted Stream')
                  }
                  className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-900/30 hover:bg-rose-500 transition"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Launch in Player</span>
                </button>
              </div>

              {/* Stream URL */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Decrypted HLS Playlist (.m3u8)
                </span>
                <div className="flex items-center gap-2 rounded-xl bg-zinc-950 p-2.5 border border-zinc-800">
                  <span className="flex-1 font-mono text-xs text-cyan-300 break-all select-all">
                    {result.url}
                  </span>
                  <button
                    onClick={() => handleCopy(result.url)}
                    className="p-1.5 text-zinc-400 hover:text-white transition shrink-0"
                    title="Copy Stream URL"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Chapters & Subtitles info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800/80">
                  <span className="text-[11px] font-bold text-zinc-400 block mb-1">
                    Chapters
                  </span>
                  <p className="text-xs text-zinc-300 font-mono">
                    Intro:{' '}
                    {result.intro_chapter
                      ? `${result.intro_chapter.start}s - ${result.intro_chapter.end}s`
                      : 'None'}
                  </p>
                  <p className="text-xs text-zinc-300 font-mono mt-0.5">
                    Outro:{' '}
                    {result.outro_chapter
                      ? `${result.outro_chapter.start}s - ${result.outro_chapter.end}s`
                      : 'None'}
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800/80">
                  <span className="text-[11px] font-bold text-zinc-400 block mb-1">
                    Subtitles
                  </span>
                  <p className="text-xs text-zinc-300">
                    {result.subtitles && result.subtitles.length > 0
                      ? `${result.subtitles.length} track(s) available (${result.subtitles
                          .map((s) => s.label)
                          .join(', ')})`
                      : 'No embedded subtitle tracks found'}
                  </p>
                </div>
              </div>

              {/* JSON raw output */}
              <details className="mt-2">
                <summary className="text-xs font-mono text-zinc-500 hover:text-zinc-300 cursor-pointer flex items-center gap-1">
                  <Code className="h-3.5 w-3.5" /> View Raw Decrypted JSON Output
                </summary>
                <pre className="mt-2 rounded-xl bg-zinc-950 p-3 font-mono text-[11px] text-zinc-400 overflow-x-auto border border-zinc-800">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
