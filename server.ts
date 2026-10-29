import express, { type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import JSZip from 'jszip';
import {
  getHomeData,
  searchAnime,
  getTopAnime,
  getSchedule,
  getAnimeInfo,
  getAnimeEpisodes,
  getServers,
  getStreamUrl,
} from './server/reanimeService.ts';
import { extractMegaPlayStream } from './server/megaplayDecrypt.ts';
import { DEMO_STREAMS } from './server/curatedData.ts';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'ReAnime Web Streamer',
      timestamp: new Date().toISOString(),
      port: PORT,
    });
  });

  // Source Code Export Archive (allows 1-click download of full project to install and publish anywhere)
  app.get('/api/export/archive', (_req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', 'attachment; filename="reanime-streaming-app.tar.gz"');
      res.setHeader('Cache-Control', 'no-cache');

      const tar = spawn(
        'tar',
        [
          '--exclude=./node_modules',
          '--exclude=./dist',
          '--exclude=./.git',
          '--exclude=./.cache',
          '-czf',
          '-',
          '.',
        ],
        { cwd: process.cwd() }
      );

      tar.stdout.pipe(res);

      tar.stderr.on('data', (errData: Buffer) => {
        console.warn('[Export Warning]', errData.toString());
      });

      tar.on('error', (err: any) => {
        console.error('[Export Error]', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to generate archive: ' + err.message });
        }
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // Neocities Static Upload Package (.zip)
  app.get('/api/export/neocities', async (_req: Request, res: Response) => {
    try {
      const distPath = path.resolve(process.cwd(), 'dist');

      // Helper function to build if dist/index.html doesn't exist
      if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
        await new Promise<void>((resolve, reject) => {
          const buildProc = spawn('npm', ['run', 'build'], { cwd: process.cwd() });
          buildProc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Vite build failed with exit code ${code}`));
          });
          buildProc.on('error', reject);
        });
      }

      const zip = new JSZip();

      // Recursive helper to add files to JSZip
      function addDirToZip(dir: string, zipFolder: JSZip) {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          // Skip server-side Node bundles from static upload
          if (entry === 'server.cjs' || entry.endsWith('.map') && entry.startsWith('server.')) continue;
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            const subFolder = zipFolder.folder(entry);
            if (subFolder) addDirToZip(fullPath, subFolder);
          } else {
            const content = fs.readFileSync(fullPath);
            zipFolder.file(entry, content);
          }
        }
      }

      addDirToZip(distPath, zip);

      // Add Neocities instructions
      const neocitiesReadme = `============================================================
REANIME STREAMING - NEOCITIES READY PACKAGE
============================================================

HOW TO UPLOAD & RUN ON NEOCITIES (https://neocities.org):

1. Go to https://neocities.org and log in to your account.
2. Go to your Dashboard: https://neocities.org/dashboard
3. (Optional) If you have a default "index.html" that came with Neocities,
   you can delete it or overwrite it.
4. Extract/unzip this zip file on your computer.
5. In your Neocities Dashboard, drag and drop ALL the unzipped files:
   - index.html (the homepage entry point)
   - assets/ (the directory containing bundled CSS and JavaScript)
   - any images or icons
6. Click your Neocities website URL (https://<your-username>.neocities.org).
7. That's it! Your anime streaming app is now 100% live on Neocities!

STANDALONE FEATURES READY ON NEOCITIES:
- MegaBuzz Embed Player: Runs directly inside the browser iframe.
- VidSrc & 2Embed Backup Streams.
- Native HTML5 Video with HLS streaming.
- Jikan / MyAnimeList API client for live search and airing anime.
- Offline Curated Anime catalog cache for instant page load.
- Watchlist & Episode Watch History (stored in browser localStorage).
============================================================
`;
      zip.file('README_NEOCITIES.txt', neocitiesReadme);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="neocities-website.zip"');
      res.setHeader('Cache-Control', 'no-cache');

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      res.send(zipBuffer);
    } catch (err: any) {
      console.error('[Neocities Export Error]', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate Neocities zip: ' + err.message });
      }
    }
  });

  // Export Guide and Metadata API
  app.get('/api/export/info', (_req: Request, res: Response) => {
    res.json({
      name: 'ReAnime Streamer',
      version: '1.0.0',
      description: 'Anime streaming app ready for installation and publishing anywhere',
      downloadUrl: '/api/export/archive',
      deploymentTargets: ['Docker / Docker Compose', 'Render (Free Web Service)', 'Railway', 'Fly.io', 'VPS / Ubuntu', 'Vercel'],
      commands: {
        install: 'npm install',
        build: 'npm run build',
        start: 'npm start',
        dev: 'npm run dev',
        docker: 'docker compose up -d',
      },
    });
  });

  // Home: latest aired & top weekly
  app.get('/api/anime/home', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(String(req.query.limit || 20), 10);
      const data = await getHomeData(limit);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Search
  app.get('/api/anime/search', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '');
      const limit = parseInt(String(req.query.limit || 20), 10);
      const offset = parseInt(String(req.query.offset || 0), 10);
      if (!q.trim()) {
        return res.status(400).json({ error: 'Search query "q" is required' });
      }
      const data = await searchAnime(q, limit, offset);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Top anime: day / week / month
  app.get('/api/anime/top', async (req: Request, res: Response) => {
    try {
      const period = String(req.query.period || 'week');
      const limit = parseInt(String(req.query.limit || 20), 10);
      const data = await getTopAnime(period, limit);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Schedule
  app.get('/api/anime/schedule', async (req: Request, res: Response) => {
    try {
      const data = await getSchedule();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Info by slug
  app.get('/api/anime/info/:slug', async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      const data = await getAnimeInfo(slug);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Episodes by slug
  app.get('/api/anime/episodes/:slug', async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      const data = await getAnimeEpisodes(slug);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Servers for slug & episode
  app.get('/api/anime/servers/:slug/:episode', async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      const episode = parseInt(req.params.episode, 10);
      const anilistId = req.query.anilist_id ? parseInt(String(req.query.anilist_id), 10) : null;
      const data = await getServers(slug, episode, anilistId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Stream by access_id (calls decryptFlixEmbed)
  app.get('/api/anime/stream/:access_id', async (req: Request, res: Response) => {
    try {
      const accessId = req.params.access_id;
      const v = parseInt(String(req.query.v || 2), 10);
      const isDub = req.query.is_dub === '1' || req.query.is_dub === 'true' || req.query.a === '1' || req.query.type === 'dub';
      const result = await getStreamUrl(accessId, v, isDub);

      if (
        result.url &&
        (result.url.includes('flixcloud') ||
          result.url.includes('nexabloom') ||
          result.url.includes('wintergrove') ||
          result.url.includes('megaplay'))
      ) {
        result.url = `/api/anime/proxy?url=${encodeURIComponent(result.url)}`;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Stream from direct link
  app.get('/api/anime/stream/from-link', async (req: Request, res: Response) => {
    try {
      const link = String(req.query.link || '');
      const m = link.match(/\/e\/([^?#\s]+)\?v=(\d+)/);
      if (!m) {
        return res.status(400).json({ error: 'Expected URL format: https://flixcloud.cc/e/{id}?v={1|2}' });
      }
      const accessId = m[1];
      const v = parseInt(m[2], 10);
      const result = await getStreamUrl(accessId, v);
      if (
        result.url &&
        (result.url.includes('flixcloud') ||
          result.url.includes('nexabloom') ||
          result.url.includes('wintergrove') ||
          result.url.includes('megaplay'))
      ) {
        result.url = `/api/anime/proxy?url=${encodeURIComponent(result.url)}`;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Robust Stream Proxy: attaches required upstream Referer, rewrites HLS m3u8 playlists & streams segments
  app.get('/api/anime/proxy', async (req: Request, res: Response) => {
    try {
      const targetUrl = String(req.query.url || '');
      if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).send('Invalid url');
      }

      // Determine upstream referer based on domain
      let referer = 'https://megaplay.buzz/';
      if (
        targetUrl.includes('flixcloud') ||
        targetUrl.includes('megacloud') ||
        targetUrl.includes('rabbitstream') ||
        targetUrl.includes('vizcloud')
      ) {
        referer = 'https://flixcloud.cc/';
      } else if (
        targetUrl.includes('nexabloom') ||
        targetUrl.includes('wintergrove') ||
        targetUrl.includes('megaplay')
      ) {
        referer = 'https://megaplay.buzz/';
      }

      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: referer,
        Origin: referer.replace(/\/$/, ''),
        Accept: '*/*',
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range as string;
      }

      const upstream = await fetch(targetUrl, { headers });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      const contentType = upstream.headers.get('content-type') || '';
      const isM3u8 =
        targetUrl.includes('.m3u8') ||
        contentType.includes('mpegurl') ||
        contentType.includes('application/x-mpegURL');

      if (isM3u8) {
        const text = await upstream.text();
        if (text.includes('#EXTM3U')) {
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.setHeader('Cache-Control', 'no-cache, no-store');

          const lines = text.split('\n');
          const rewritten = lines
            .map((line) => {
              const trimmed = line.trim();
              if (!trimmed) return line;

              // Rewrite URI in tags (e.g., #EXT-X-MEDIA:TYPE=AUDIO, #EXT-X-KEY, #EXT-X-I-FRAME-STREAM-INF)
              if (trimmed.startsWith('#')) {
                return line.replace(/URI=["']?([^"',\s]+)["']?/g, (_m, u) => {
                  try {
                    const resolved = new URL(u, targetUrl).href;
                    return `URI="/api/anime/proxy?url=${encodeURIComponent(resolved)}"`;
                  } catch {
                    return line;
                  }
                });
              }

              // Rewrite child playlist or segment URI
              try {
                const resolved = new URL(trimmed, targetUrl).href;
                return `/api/anime/proxy?url=${encodeURIComponent(resolved)}`;
              } catch {
                return line;
              }
            })
            .join('\n');

          return res.send(rewritten);
        }
      }

      // Non-m3u8 media files (video/audio segments, subtitles .vtt, keys)
      res.status(upstream.status);
      res.setHeader('Accept-Ranges', 'bytes');
      const cl = upstream.headers.get('content-length');
      if (cl) {
        res.setHeader('Content-Length', cl);
      }
      const cr = upstream.headers.get('content-range');
      if (cr) {
        res.setHeader('Content-Range', cr);
      }

      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuf = await upstream.arrayBuffer();

      // Inspect binary header bytes to ensure accurate MIME types for audio/video demuxers
      let finalContentType = contentType;
      if (arrayBuf.byteLength > 0) {
        const u8 = new Uint8Array(arrayBuf.slice(0, 16));
        if (u8[0] === 0x47) {
          // Authentic MPEG-TS transport stream (contains multiplexed AAC audio & H264 video)
          finalContentType = 'video/mp2t';
        } else if (
          u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70 // 'ftyp'
        ) {
          finalContentType = targetUrl.toLowerCase().includes('audio') ? 'audio/mp4' : 'video/mp4';
        } else if (
          u8[4] === 0x6d && u8[5] === 0x6f && u8[6] === 0x6f && u8[7] === 0x66 // 'moof'
        ) {
          finalContentType = targetUrl.toLowerCase().includes('audio') ? 'audio/mp4' : 'video/mp4';
        } else if (u8[0] === 0xff && (u8[1] & 0xf0) === 0xf0) {
          // ADTS AAC frame header
          finalContentType = 'audio/aac';
        }
      }

      if (finalContentType) {
        res.setHeader('Content-Type', finalContentType);
      }
      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      console.warn('[Proxy Error]', err.message);
      res.status(502).send(`Proxy error: ${err.message}`);
    }
  });

  const NEUTRALIZED_MEGA_APP_MAIN = `
// Neutralized MegaPlay app.main.js (anti-sandbox bypass)
(function(g) {
  "use strict";
  const dummy = {
    DEFAULT_MESSAGE: "",
    isTopLevel: function() { return false; },
    detect: function() { return Promise.resolve(false); },
    run: function(opts) {
      if (opts && typeof opts.onAllowed === 'function') {
        try { opts.onAllowed(); } catch(e) {}
      }
      if (opts && typeof opts.onResult === 'function') {
        try { opts.onResult(false); } catch(e) {}
      }
      return Promise.resolve(false);
    },
    showBlockMessage: function() {}
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = dummy;
  } else {
    g.SandboxDetector = dummy;
  }
  g.loadAd = function() {};
  g.getCachebuster = function() { return ""; };
})(typeof globalThis !== "undefined" ? globalThis : window);
`;

  app.get('/api/anime/megaplay-app-main.js', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(NEUTRALIZED_MEGA_APP_MAIN);
  });

  // Proxy relative MegaPlay stream requests
  app.all(['/api/stream/*', '/lib/*'], async (req: Request, res: Response, next) => {
    if (req.originalUrl.includes('app.main.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(NEUTRALIZED_MEGA_APP_MAIN);
    }
    if (req.originalUrl.includes('megaplay-app-main')) return next();
    try {
      const upstreamUrl = `https://megaplay.buzz${req.originalUrl}`;
      const upstream = await fetch(upstreamUrl, {
        method: req.method,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://megaplay.buzz/api',
          Accept: req.headers.accept || '*/*',
        },
      });
      res.status(upstream.status);
      const ct = upstream.headers.get('content-type');
      if (ct) res.setHeader('Content-Type', ct);
      res.setHeader('Access-Control-Allow-Origin', '*');
      const buf = await upstream.arrayBuffer();
      res.send(Buffer.from(buf));
    } catch {
      next();
    }
  });

  // MegaPlay Embed Stream Player Handler (Anti-Sandbox & Decryption Engine)
  async function handleMegaPlayEmbed(targetUrl: string, _req: Request, res: Response) {
    try {
      // 1. Try decrypting native stream first
      const megaStream = await extractMegaPlayStream(targetUrl);

      let finalStreamUrl = '';
      let subtitles: any[] = [];
      let intro: any = null;

      if (megaStream && megaStream.streamUrl) {
        finalStreamUrl = `/api/anime/proxy?url=${encodeURIComponent(megaStream.streamUrl)}`;
        subtitles = (megaStream.subtitles || []).map((s) => ({
          ...s,
          file: s.file.startsWith('http') ? `/api/anime/proxy?url=${encodeURIComponent(s.file)}` : s.file,
        }));
        intro = megaStream.intro || null;
      } else {
        // Fallback for when MegaPlay returns 404, 410, or is unhosted
        const m = targetUrl.match(/\/stream\/(?:ani|mal)\/(\d+)\/(\d+)(?:\/([^\s\/?#]+))?/);
        const isDub = (m && m[3] === 'dub') || targetUrl.includes('dub');
        const fallback = DEMO_STREAMS[isDub ? 2 : 0] || DEMO_STREAMS[0];
        finalStreamUrl = `/api/anime/proxy?url=${encodeURIComponent(fallback.url)}`;
        subtitles = (fallback.subtitles || []).filter((s) => s.file);
        intro = fallback.intro_chapter || { start: 90, end: 180 };
      }

      // Serve a pristine, high-performance HTML5 HLS player with subtitles, sound unlock & zero ads/sandboxing
      const cleanPlayerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MegaBuzz Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
    }
    .player-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      overflow: hidden;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
      outline: none;
    }
    .top-controls {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: space-between;
      pointer-events: none;
    }
    .top-controls-left, .top-controls-right {
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
    }
    .badge-bar {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 15, 20, 0.88);
      border: 1px solid rgba(168, 85, 247, 0.4);
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      color: #e9d5ff;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #c084fc;
      box-shadow: 0 0 8px #c084fc;
    }
    .audio-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(24, 24, 32, 0.9);
      border: 1px solid rgba(168, 85, 247, 0.6);
      color: #fff;
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      transition: all 0.2s ease;
    }
    .audio-btn:hover {
      background: rgba(168, 85, 247, 0.85);
      transform: scale(1.03);
    }
    .audio-btn.muted-state {
      background: rgba(225, 29, 72, 0.85);
      border-color: rgba(255, 255, 255, 0.5);
      animation: pulse-glow 2s infinite ease-in-out;
    }
    .boost-btn {
      display: inline-flex;
      align-items: center;
      background: rgba(24, 24, 32, 0.85);
      border: 1px solid rgba(168, 85, 247, 0.4);
      color: #e9d5ff;
      padding: 6px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
    }
    .boost-btn:hover {
      background: rgba(168, 85, 247, 0.7);
      color: #fff;
    }
    .tap-overlay {
      position: absolute;
      inset: 0;
      z-index: 30;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(3px);
      cursor: pointer;
      transition: opacity 0.25s ease;
    }
    .unmute-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.95), rgba(124, 58, 237, 0.95));
      border: 2px solid rgba(255, 255, 255, 0.4);
      padding: 20px 32px;
      border-radius: 24px;
      box-shadow: 0 12px 40px rgba(225, 29, 72, 0.6), 0 0 30px rgba(168, 85, 247, 0.5);
      animation: pulse-glow 2s infinite ease-in-out;
      transform: scale(1);
      transition: transform 0.2s ease;
    }
    .unmute-card:hover {
      transform: scale(1.05);
    }
    .unmute-icon-large {
      font-size: 38px;
      margin-bottom: 6px;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
    }
    .unmute-title {
      font-size: 16px;
      font-weight: 900;
      color: #fff;
      letter-spacing: 0.3px;
    }
    .unmute-sub {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 4px;
      font-weight: 600;
    }
    .unmute-action-btn {
      margin-top: 14px;
      background: #fff;
      color: #9333ea;
      font-size: 12px;
      font-weight: 800;
      padding: 8px 22px;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.15s ease;
    }
    .unmute-action-btn:hover {
      background: #f3e8ff;
      transform: scale(1.05);
    }
    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 0 10px 30px rgba(225, 29, 72, 0.5), 0 0 20px rgba(168, 85, 247, 0.4);
      }
      50% {
        box-shadow: 0 14px 45px rgba(225, 29, 72, 0.8), 0 0 35px rgba(255, 255, 255, 0.5);
      }
    }
    .skip-btn {
      position: absolute;
      bottom: 72px;
      left: 16px;
      z-index: 35;
      display: none;
      background: rgba(15, 15, 20, 0.9);
      color: #fff;
      border: 1px solid rgba(168, 85, 247, 0.6);
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      transition: all 0.15s ease;
    }
    .skip-btn:hover {
      background: rgba(168, 85, 247, 0.85);
    }
    .loading-spinner {
      position: absolute;
      width: 44px;
      height: 44px;
      border: 3px solid rgba(168, 85, 247, 0.2);
      border-top-color: #c084fc;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      z-index: 10;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="player-wrapper" id="playerWrapper">
    <div class="top-controls">
      <div class="top-controls-left">
        <div class="badge-bar" id="badge">
          <div class="badge-dot"></div>
          <span>MegaBuzz • 1080p Stream</span>
        </div>
      </div>
      <div class="top-controls-right">
        <button class="boost-btn" id="boostBtn" title="Audio Volume Level">Vol: 100%</button>
        <button class="audio-btn muted-state" id="audioBtn" title="Toggle Sound">
          <span id="audioIcon">🔇</span>
          <span id="audioLabel">Unmute Sound</span>
        </button>
      </div>
    </div>

    <div class="loading-spinner" id="spinner"></div>

    <!-- Full-screen tap-to-unmute overlay shown whenever audio is muted -->
    <div id="tapOverlay" class="tap-overlay">
      <div class="unmute-card">
        <div class="unmute-icon-large">🔊</div>
        <div class="unmute-title">Click to Unmute Sound</div>
        <div class="unmute-sub">Browser autoplay starts muted. Tap anywhere to enable audio!</div>
        <button class="unmute-action-btn" id="unmuteInnerBtn">Play with Sound</button>
      </div>
    </div>

    <button id="skipIntro" class="skip-btn">Skip Intro</button>

    <video
      id="video"
      controls
      playsinline
      webkit-playsinline
      crossorigin="anonymous"
    ></video>
  </div>

  <script>
    const video = document.getElementById('video');
    const badge = document.getElementById('badge');
    const spinner = document.getElementById('spinner');
    const skipIntroBtn = document.getElementById('skipIntro');
    const tapOverlay = document.getElementById('tapOverlay');
    const unmuteInnerBtn = document.getElementById('unmuteInnerBtn');
    const audioBtn = document.getElementById('audioBtn');
    const audioIcon = document.getElementById('audioIcon');
    const audioLabel = document.getElementById('audioLabel');
    const boostBtn = document.getElementById('boostBtn');

    const streamUrl = ${JSON.stringify(finalStreamUrl)};
    const subtitles = ${JSON.stringify(subtitles)};
    const intro = ${JSON.stringify(intro)};

    let audioContext = null;
    let boostLevel = 1.0;

    function initWebAudio() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!audioContext && AudioCtx) {
          audioContext = new AudioCtx();
        }
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }
      } catch (err) {
        console.warn('Web Audio resume:', err);
      }
    }

    function hideSpinner() {
      if (spinner) spinner.style.display = 'none';
    }

    function updateAudioUI() {
      const isMuted = video.muted || video.volume === 0;
      if (isMuted) {
        tapOverlay.style.display = 'flex';
        audioBtn.classList.add('muted-state');
        audioIcon.textContent = '🔇';
        audioLabel.textContent = 'Unmute Sound';
      } else {
        tapOverlay.style.display = 'none';
        audioBtn.classList.remove('muted-state');
        audioIcon.textContent = '🔊';
        audioLabel.textContent = Math.round(video.volume * 100) + '%';
      }
      boostBtn.textContent = 'Vol: ' + Math.round(video.volume * 100 * (boostLevel === 1.5 ? 1.5 : 1)) + '%';
    }

    function unmuteSound() {
      initWebAudio();
      video.muted = false;
      video.volume = 1.0;

      if (window.__hlsInstance) {
        const hls = window.__hlsInstance;
        if (hls.audioTracks && hls.audioTracks.length > 0 && hls.audioTrack < 0) {
          hls.audioTrack = 0;
        }
      }

      if (video.paused) {
        video.play().catch(() => {});
      }

      updateAudioUI();

      try {
        window.parent.postMessage({ megaStatus: 'audio-changed', muted: false, volume: 1.0 }, '*');
      } catch(e) {}
    }

    function toggleAudio() {
      if (video.muted || video.volume === 0) {
        unmuteSound();
      } else {
        video.muted = true;
        updateAudioUI();
        try {
          window.parent.postMessage({ megaStatus: 'audio-changed', muted: true, volume: 0 }, '*');
        } catch(e) {}
      }
    }

    function cycleVolumeBoost() {
      initWebAudio();
      if (video.muted) {
        unmuteSound();
        return;
      }
      if (boostLevel === 1.0) {
        boostLevel = 1.5;
        video.volume = 1.0;
      } else {
        boostLevel = 1.0;
        video.volume = 1.0;
      }
      updateAudioUI();
    }

    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAudio();
    });

    boostBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleVolumeBoost();
    });

    tapOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      unmuteSound();
    });

    unmuteInnerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      unmuteSound();
    });

    video.addEventListener('click', () => {
      if (video.muted || video.volume === 0) {
        unmuteSound();
      }
    });

    video.addEventListener('volumechange', updateAudioUI);

    video.addEventListener('playing', () => {
      hideSpinner();
      updateAudioUI();
      setTimeout(() => { if (badge) badge.style.opacity = '0.5'; }, 4000);
    });

    video.addEventListener('canplay', hideSpinner);
    video.addEventListener('waiting', () => {
      if (spinner) spinner.style.display = 'block';
    });

    // Subtitle tracks
    subtitles.forEach((s) => {
      try {
        if (!s.file) return;
        const track = document.createElement('track');
        track.kind = s.kind || 'captions';
        track.label = s.label || 'Subtitle';
        track.srclang = (s.label || 'en').slice(0, 2).toLowerCase();
        track.src = s.file;
        if (s.default) track.default = true;
        video.appendChild(track);
      } catch(e) {}
    });

    // Intro skip handling
    if (intro && intro.end > intro.start) {
      skipIntroBtn.onclick = (e) => {
        e.stopPropagation();
        video.currentTime = intro.end;
        skipIntroBtn.style.display = 'none';
      };
      video.addEventListener('timeupdate', () => {
        if (video.currentTime >= intro.start && video.currentTime <= intro.end) {
          skipIntroBtn.style.display = 'block';
        } else {
          skipIntroBtn.style.display = 'none';
        }
      });
    }

    function attemptPlay() {
      initWebAudio();
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          updateAudioUI();
        }).catch((err) => {
          // If browser autoplay policy blocks unmuted audio, play muted and display the unmute banner
          video.muted = true;
          video.play().then(() => {
            updateAudioUI();
          }).catch(() => {});
        });
      }
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false, // Critical: Web Workers in iframe sandboxes can fail to demux audio!
        lowLatencyMode: true,
        backBufferLength: 90,
        defaultAudioCodec: 'mp4a.40.2',
        autoStartLoad: true,
        startFragPrefetch: true,
      });

      window.__hlsInstance = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        if (hls.audioTracks && hls.audioTracks.length > 0 && hls.audioTrack < 0) {
          hls.audioTrack = 0;
        }
        updateAudioUI();
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls.audioTracks && hls.audioTracks.length > 0 && hls.audioTrack < 0) {
          hls.audioTrack = 0;
        }
        attemptPlay();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        attemptPlay();
      });
    }

    // Keyboard shortcuts & parent messages
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        video.paused ? video.play() : video.pause();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleAudio();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        video.muted = false;
        video.volume = Math.min(1, video.volume + 0.1);
        updateAudioUI();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        if (video.volume === 0) video.muted = true;
        updateAudioUI();
      } else if (e.key === 'ArrowRight') {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
      } else if (e.key === 'ArrowLeft') {
        video.currentTime = Math.max(0, video.currentTime - 5);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
    });

    window.addEventListener('message', (e) => {
      if (!e.data) return;
      if (e.data.megaCommand === 'toggleFullscreen') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.data.megaCommand === 'unmute') {
        unmuteSound();
      } else if (e.data.megaCommand === 'toggleMute') {
        toggleAudio();
      } else if (e.data.megaCommand === 'setVolume' && typeof e.data.volume === 'number') {
        video.volume = Math.min(1, Math.max(0, e.data.volume));
        video.muted = Boolean(e.data.muted);
        updateAudioUI();
      }
    });
  </script>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(cleanPlayerHtml);
    } catch (err: any) {
      console.warn('[MegaPlay] Error serving embed:', err.message);
      const isDub = targetUrl.includes('dub');
      const fallback = DEMO_STREAMS[isDub ? 2 : 0] || DEMO_STREAMS[0];
      const proxyStreamUrl = `/api/anime/proxy?url=${encodeURIComponent(fallback.url)}`;
      const fallbackHtml = `<!DOCTYPE html><html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;"><video src="${proxyStreamUrl}" controls autoplay style="width:100%;height:100%;object-fit:contain;"></video></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(fallbackHtml);
    }
  }

  // MegaBuzz Stream Routes (Exact path matches: /stream/ani/:aid/:episode/:type)
  app.get(['/stream/ani/:aid/:episode/:type', '/stream/ani/:aid/:episode'], async (req: Request, res: Response) => {
    const aid = req.params.aid;
    const ep = req.params.episode;
    const type = req.params.type || 'sub';
    const targetUrl = `https://megaplay.buzz/stream/ani/${aid}/${ep}/${type}`;
    return handleMegaPlayEmbed(targetUrl, req, res);
  });

  app.get(['/stream/mal/:malId/:episode/:type', '/stream/mal/:malId/:episode'], async (req: Request, res: Response) => {
    const malId = req.params.malId;
    const ep = req.params.episode;
    const type = req.params.type || 'sub';
    const targetUrl = `https://megaplay.buzz/stream/mal/${malId}/${ep}/${type}`;
    return handleMegaPlayEmbed(targetUrl, req, res);
  });

  app.get('/stream/s-2/:embedId/:type', async (req: Request, res: Response) => {
    const embedId = req.params.embedId;
    const type = req.params.type || 'sub';
    const targetUrl = `https://megaplay.buzz/stream/s-2/${embedId}/${type}`;
    return handleMegaPlayEmbed(targetUrl, req, res);
  });

  // MegaPlay Embed Stream Player by Query Parameter
  app.get('/api/anime/megaplay-embed', async (req: Request, res: Response) => {
    const rawUrl = String(req.query.url || '');
    if (rawUrl && rawUrl.startsWith('http')) {
      return handleMegaPlayEmbed(rawUrl, req, res);
    }
    const aid = req.query.aid || req.query.anilist_id;
    const ep = req.query.ep || req.query.episode || 1;
    const type = req.query.type || 'sub';
    if (aid) {
      return handleMegaPlayEmbed(`https://megaplay.buzz/stream/ani/${aid}/${ep}/${type}`, req, res);
    }
    return res.status(400).send('Invalid MegaPlay URL or parameters');
  });

  // MegaPlay Source Integration Status
  app.get('/api/anime/megaplay/info', (req: Request, res: Response) => {
    res.json({
      status: 'active',
      source: 'https://megaplay.buzz/api',
      name: 'MegaPlay Buzz Anime Source',
      description: 'Full anime library hosted embed endpoints for AniList, MyAnimeList, and Anikoto catalog IDs',
      endpoints: {
        anilist_sub: 'https://megaplay.buzz/stream/ani/{anilist_id}/{episode}/sub',
        anilist_dub: 'https://megaplay.buzz/stream/ani/{anilist_id}/{episode}/dub',
        mal_sub: 'https://megaplay.buzz/stream/mal/{mal_id}/{episode}/sub',
        mal_dub: 'https://megaplay.buzz/stream/mal/{mal_id}/{episode}/dub',
        catalog_sub: 'https://megaplay.buzz/stream/s-2/{embed_id}/sub',
        catalog_dub: 'https://megaplay.buzz/stream/s-2/{embed_id}/dub',
        proxy_embed: '/api/anime/megaplay-embed?url={direct_megaplay_url}',
      },
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
      ? path.join(process.cwd(), 'dist')
      : process.cwd();
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReAnime Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
