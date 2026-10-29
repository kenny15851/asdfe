# ReAnime Streaming - Self-Hosting & Deployment Guide

This application is completely self-contained. It includes:
- **React 19 + Vite** frontend
- **Express + TypeScript** backend
- Built-in stream proxy with CORS bypassing and Referer spoofing
- Real-time MegaPlay stream decrypter (`/server/megaplayDecrypt.ts`)
- Multi-track audio and subtitle support

---

## Option 1: Deploy to Neocities (https://neocities.org) - Static Drag & Drop

Neocities is a popular free static web hosting service. This app has been optimized to run directly on Neocities without requiring any Node.js server!

### How Neocities Hosting Works
- **Relative Path Routing**: The build is configured with `base: './'` in `vite.config.ts`, so scripts and CSS load correctly on `username.neocities.org`.
- **Client-Side Video Streaming**: Uses the MegaBuzz and multi-server embed players that run directly in the browser.
- **Client-Side Anime Catalog**: Automatically queries the Jikan (MyAnimeList) API for live airing anime, schedules, and search.
- **Offline Curated Library**: Instant loading even before external API responses arrive.
- **LocalStorage**: Your watchlist and watch history are stored directly in your browser.

### 5-Step Upload Guide for Neocities
1. **Download the Neocities ZIP**:
   - In the running app, click **"Export / Host"** in the top navigation and click **"Download Neocities ZIP"** (`neocities-website.zip`).
   - OR run `npm run build` locally and zip the contents of the `dist/` directory.
2. **Unzip the file on your computer**:
   - Extract `neocities-website.zip`.
   - You will see `index.html` and the `assets/` folder.
3. **Log into Neocities**:
   - Go to [https://neocities.org/dashboard](https://neocities.org/dashboard).
4. **Clean up default files (Optional)**:
   - If Neocities created a default placeholder `index.html` ("Welcome to your new site"), delete it or overwrite it.
5. **Drag and Drop ALL files into Neocities**:
   - Drag `index.html` and the `assets/` folder straight into your Neocities Dashboard browser window.
   - Neocities will upload all the files.
6. **Done!**
   - Click your site link: `https://<your-username>.neocities.org`.
   - Your anime streamer is now completely live on Neocities!

---

## Option 2: Quick Local / VPS Installation (Node.js)

### Prerequisites
- Node.js 18 or 20+
- npm or yarn

### Steps
1. **Clone or Extract the Source Code**:
   ```bash
   tar -xzf reanime-streaming-app.tar.gz
   cd reanime-streaming-app
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run in Development**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Run in Production**:
   ```bash
   npm run build
   npm start
   ```

---

## Option 2: Docker & Docker Compose (Recommended for Servers)

Run the entire app in an isolated container with health checks and restart policies:

```bash
docker compose up -d --build
```

- App runs on: `http://localhost:3000`
- To view logs:
  ```bash
  docker compose logs -f
  ```
- To stop:
  ```bash
  docker compose down
  ```

---

## Option 3: Deploy to Render.com (Free Web Service)

1. Push this repository to **GitHub**.
2. Go to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** &rarr; **Web Service**.
4. Select your GitHub repository.
5. Set:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. Click **Create Web Service**. Render provides free SSL/HTTPS out of the box.

---

## Option 4: Deploy to Railway.app

1. Install the Railway CLI or use the web dashboard:
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```
2. Railway automatically detects `railway.json` and spins up the web service.

---

## Option 5: Deploy to a Linux VPS (Ubuntu / Debian with PM2 & Nginx)

1. **Install PM2**:
   ```bash
   npm install -g pm2
   ```

2. **Build and Start**:
   ```bash
   npm install
   npm run build
   pm2 start "npm start" --name "reanime"
   pm2 startup
   pm2 save
   ```

3. **Nginx Reverse Proxy configuration (`/etc/nginx/sites-available/default`)**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the HTTP server |
| `NODE_ENV` | `production` | Set to `production` for compiled static files |

---

## Audio Troubleshooting Note
In modern browsers, if an iframe or video starts muted, tap anywhere inside the video player to grant user activation permission. The player includes an interactive unmute prompt that resumes Web Audio API and unlocks the audio output hardware.
