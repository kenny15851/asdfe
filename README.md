# ReAnime Streaming Platform

A production-ready anime streaming web application featuring real-time stream decryption, server switching, episode tracking, and an embedded high-performance HLS video player.

## Features
- **MegaBuzz / MegaPlay Source Integration**: Direct embed and decrypted HLS streams.
- **Audio & Subtitles**: Multi-track AAC audio demuxing, Web Audio unmuting, and WebVTT multi-language subtitles.
- **Top Charts & Broadcast Schedules**: Live seasonal schedules and top charts (day, week, month).
- **Watch History & Watchlist**: In-browser local storage persistence.
- **Anti-Sandbox & Anti-Bypass Proxy**: Built-in upstream referer rewriting and segment streaming.
- **Export & Self-Host Ready**: Dockerfile, docker-compose, Render blueprint, Railway config, and 1-click source package downloader.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run development server (Vite + Express on http://localhost:3000)
npm run dev

# 3. Build & Run for Production
npm run build
npm start
```

## Docker Quickstart

```bash
docker compose up -d --build
```

Access the app on `http://localhost:3000`.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment instructions (Render, Railway, Fly.io, VPS).
