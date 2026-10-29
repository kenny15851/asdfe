import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Server,
  Terminal,
  Globe,
  Layers,
  Sparkles,
  ExternalLink,
  X,
  FileCode,
  ShieldCheck,
  FolderArchive,
  ArrowRight,
  Info,
  Sliders,
  UploadCloud,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'neocities' | 'quick' | 'docker' | 'render' | 'railway' | 'vps'>('neocities');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isDownloadingSource, setIsDownloadingSource] = useState(false);
  const [isDownloadingNeocities, setIsDownloadingNeocities] = useState(false);

  // Settings for custom backend or forced static mode
  const [customBackend, setCustomBackend] = useState<string>(() => {
    try {
      return localStorage.getItem('reanime_custom_backend') || '';
    } catch {
      return '';
    }
  });
  const [isSavedBackend, setIsSavedBackend] = useState(false);

  const [forceStatic, setForceStatic] = useState<boolean>(() => {
    try {
      return localStorage.getItem('reanime_force_static') === 'true';
    } catch {
      return false;
    }
  });

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadSourceArchive = () => {
    setIsDownloadingSource(true);
    const link = document.createElement('a');
    link.href = '/api/export/archive';
    link.download = 'reanime-streaming-app.tar.gz';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloadingSource(false), 2500);
  };

  const handleDownloadNeocitiesZip = () => {
    setIsDownloadingNeocities(true);
    const link = document.createElement('a');
    link.href = '/api/export/neocities';
    link.download = 'neocities-website.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloadingNeocities(false), 3000);
  };

  const handleSaveCustomBackend = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (customBackend.trim()) {
        localStorage.setItem('reanime_custom_backend', customBackend.trim());
      } else {
        localStorage.removeItem('reanime_custom_backend');
      }
      setIsSavedBackend(true);
      setTimeout(() => setIsSavedBackend(false), 2500);
    } catch (err) {
      console.warn('Failed to save custom backend:', err);
    }
  };

  const handleToggleForceStatic = () => {
    const nextVal = !forceStatic;
    setForceStatic(nextVal);
    try {
      if (nextVal) {
        localStorage.setItem('reanime_force_static', 'true');
      } else {
        localStorage.removeItem('reanime_force_static');
      }
    } catch (err) {
      console.warn('Failed to toggle force static:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-rose-500 to-amber-500 p-0.5">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
                <UploadCloud className="h-5 w-5 text-rose-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Export & Host Anywhere
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  Neocities Ready
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Put all the files into Neocities or self-host with Docker and Node.js.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2 Quick Download Cards */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Neocities Static ZIP Card (Highlighted) */}
          <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-zinc-900/60 to-zinc-950 p-3.5 flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/20 p-2 border border-emerald-500/40 shrink-0">
                <Globe className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white">Neocities Package</h3>
                  <span className="rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-bold px-1.5 py-0.2">
                    .ZIP
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                  Ready-to-upload static build (<code className="text-emerald-300 font-mono">index.html</code> + <code className="text-emerald-300 font-mono">assets/</code>). Drag and drop into Neocities.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadNeocitiesZip}
              disabled={isDownloadingNeocities}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isDownloadingNeocities ? 'Packing Neocities ZIP...' : 'Download Neocities ZIP'}</span>
            </button>
          </div>

          {/* Full Source Code Package */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-purple-500/20 p-2 border border-purple-500/40 shrink-0">
                <FileCode className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white">Full-Stack Source Code</h3>
                  <span className="rounded bg-purple-500/30 text-purple-200 text-[9px] font-bold px-1.5 py-0.2">
                    .TAR.GZ
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                  Full codebase with Express server, MegaPlay proxy, Dockerfile, and package.json for VPS / Docker.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadSourceArchive}
              disabled={isDownloadingSource}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-bold text-zinc-200 transition active:scale-95 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isDownloadingSource ? 'Packing Source...' : 'Download Full Code (.tar.gz)'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto text-xs">
          {[
            { id: 'neocities', label: 'Neocities.org (Static Web)', icon: Globe, highlight: true },
            { id: 'quick', label: 'Local / Node.js', icon: Terminal },
            { id: 'docker', label: 'Docker Compose', icon: Layers },
            { id: 'render', label: 'Render.com (Free)', icon: Globe },
            { id: 'railway', label: 'Railway & Fly.io', icon: Server },
            { id: 'vps', label: 'Linux VPS / Nginx', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-zinc-800 text-white font-bold shadow'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                } ${tab.highlight && !isActive ? 'text-emerald-400 font-semibold' : ''}`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? (tab.highlight ? 'text-emerald-400' : 'text-rose-400') : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="mt-3 overflow-y-auto space-y-4 pr-1 text-xs">
          {activeTab === 'neocities' && (
            <div className="space-y-4">
              {/* How it works on Neocities */}
              <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    How Neocities Hosting Works
                  </h4>
                </div>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  Neocities is a static web hosting platform (it doesn't run Node.js or Docker). We have specifically engineered this app to run <strong className="text-white">100% autonomously in the browser</strong> when hosted on Neocities:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-start gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">
                      <strong className="text-white">Relative Path Bundling:</strong> Built with <code className="text-purple-300">./assets/</code> so files never suffer 404 broken script errors.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">
                      <strong className="text-white">MegaBuzz Iframe Streaming:</strong> Video playback plays directly in the browser without any backend decrypter required.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">
                      <strong className="text-white">Client-Side Catalog & Search:</strong> Queries Jikan / MyAnimeList open CORS API for live search and schedules.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">
                      <strong className="text-white">Instant Offline Library:</strong> Curated anime catalog guarantees instant zero-lag loading anytime.
                    </span>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                  Step-by-Step Guide to Uploading to Neocities
                </span>

                <div className="space-y-2.5">
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">1</span>
                      <span className="font-bold text-white text-xs">Download the Neocities ZIP</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] pl-7">
                      Click the green <strong className="text-emerald-300">Download Neocities ZIP</strong> button above to download <code className="text-purple-300">neocities-website.zip</code>.
                    </p>
                  </div>

                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">2</span>
                      <span className="font-bold text-white text-xs">Extract the ZIP on your computer</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] pl-7">
                      Right-click the zip and choose <span className="text-zinc-200 font-medium">Extract All</span> (or double-click on Mac). Inside you will see <code className="text-emerald-300">index.html</code> and the <code className="text-emerald-300">assets/</code> folder.
                    </p>
                  </div>

                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">3</span>
                      <span className="font-bold text-white text-xs">Open your Neocities Dashboard</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] pl-7">
                      Visit <a href="https://neocities.org/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 underline hover:text-emerald-300 inline-flex items-center gap-1 font-medium">
                        neocities.org/dashboard <ExternalLink className="h-3 w-3" />
                      </a> and log into your account.
                    </p>
                    <p className="text-zinc-400 text-[11px] pl-7">
                      <em className="text-amber-300">Tip:</em> If Neocities created a default <code className="text-zinc-200">index.html</code> ("Welcome to your new site"), you can select it and click <span className="text-rose-400 font-medium">Delete</span> or overwrite it.
                    </p>
                  </div>

                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">4</span>
                      <span className="font-bold text-white text-xs">Drag and Drop ALL the Files into Neocities</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] pl-7">
                      Drag the extracted <code className="text-emerald-300">index.html</code> file and the <code className="text-emerald-300">assets</code> folder straight from your file manager into the Neocities browser window. Neocities will upload all files!
                    </p>
                  </div>

                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">5</span>
                      <span className="font-bold text-white text-xs">View your Live Site</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] pl-7">
                      Click your site link (<code className="text-purple-300 font-mono">https://&lt;your-username&gt;.neocities.org</code>) — your anime streamer is running!
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional Custom Backend Setting */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Custom API Backend (Optional)</span>
                  </div>
                  <button
                    onClick={handleToggleForceStatic}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold border transition ${
                      forceStatic
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {forceStatic ? 'Static Mode Forcibly ON' : 'Auto Detect Host'}
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400">
                  By default, Neocities runs with client-side Jikan APIs + embed video streams. If you also deployed your Node backend to Render or Railway for free, you can enter its URL here to route through your private proxy:
                </p>

                <form onSubmit={handleSaveCustomBackend} className="flex gap-2 pt-1">
                  <input
                    type="url"
                    value={customBackend}
                    onChange={(e) => setCustomBackend(e.target.value)}
                    placeholder="e.g. https://my-reanime.onrender.com"
                    className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition"
                  >
                    {isSavedBackend ? 'Saved!' : 'Save URL'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'quick' && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                Run the app on any machine with <strong className="text-white">Node.js 18+ or 20+</strong> installed:
              </p>

              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
                  Step 1: Extract & Install Dependencies
                </span>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-200">
                  <pre>tar -xzf reanime-streaming-app.tar.gz{'\n'}npm install</pre>
                  <button
                    onClick={() => copyToClipboard('tar -xzf reanime-streaming-app.tar.gz\nnpm install', 'c1')}
                    className="absolute right-2.5 top-2.5 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {copiedIndex === 'c1' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
                  Step 2: Start Development Server (Full-Stack)
                </span>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-200">
                  <pre>npm run dev</pre>
                  <button
                    onClick={() => copyToClipboard('npm run dev', 'c2')}
                    className="absolute right-2.5 top-2.5 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {copiedIndex === 'c2' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-zinc-400">Open <span className="text-purple-300 font-mono">http://localhost:3000</span> in your browser.</p>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
                  Step 3: Build & Start for Production
                </span>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-200">
                  <pre>npm run build && npm start</pre>
                  <button
                    onClick={() => copyToClipboard('npm run build && npm start', 'c3')}
                    className="absolute right-2.5 top-2.5 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {copiedIndex === 'c3' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'docker' && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                A production <code className="text-purple-300">Dockerfile</code> and <code className="text-purple-300">docker-compose.yml</code> are included in the repository root.
              </p>

              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
                  Run with Docker Compose (1 command)
                </span>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-200">
                  <pre>docker compose up -d --build</pre>
                  <button
                    onClick={() => copyToClipboard('docker compose up -d --build', 'c4')}
                    className="absolute right-2.5 top-2.5 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {copiedIndex === 'c4' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-zinc-400">
                  Runs containerized with automatic restart policy on <span className="text-purple-300 font-mono">http://localhost:3000</span>.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
                  Check Container Logs & Status
                </span>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-200">
                  <pre>docker compose logs -f</pre>
                  <button
                    onClick={() => copyToClipboard('docker compose logs -f', 'c5')}
                    className="absolute right-2.5 top-2.5 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {copiedIndex === 'c5' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'render' && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                Deploy for <strong className="text-emerald-400">free on Render.com</strong> via their Web Service:
              </p>

              <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                <li>Create a GitHub repository and push this code.</li>
                <li>Go to <strong className="text-white">dashboard.render.com</strong> &rarr; Click <strong className="text-rose-400">New Web Service</strong>.</li>
                <li>Connect your GitHub repository.</li>
                <li>
                  Render automatically detects <code className="text-purple-300">render.yaml</code> or set these fields:
                  <div className="mt-2 rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-200">
                    <pre>Environment: Node{'\n'}Build Command: npm install && npm run build{'\n'}Start Command: npm start</pre>
                  </div>
                </li>
                <li>Click <strong>Deploy Web Service</strong>! Your anime streamer is live with free HTTPS.</li>
              </ol>
            </div>
          )}

          {activeTab === 'railway' && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                Deploy on <strong className="text-white">Railway</strong> or <strong className="text-white">Fly.io</strong> with zero config:
              </p>

              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
                  Railway 1-Click CLI Deployment
                </span>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-200">
                  <pre>railway login{'\n'}railway init{'\n'}railway up</pre>
                  <button
                    onClick={() => copyToClipboard('railway login\nrailway init\nrailway up', 'c6')}
                    className="absolute right-2.5 top-2.5 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {copiedIndex === 'c6' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-zinc-400">
                  Railway will automatically use <code className="text-purple-300">railway.json</code> and bind to the dynamic <code className="text-purple-300">$PORT</code>.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
                  Fly.io Launch
                </span>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-200">
                  <pre>fly launch --no-deploy && fly deploy</pre>
                  <button
                    onClick={() => copyToClipboard('fly launch --no-deploy && fly deploy', 'c7')}
                    className="absolute right-2.5 top-2.5 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {copiedIndex === 'c7' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vps' && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                Deploy on any standard Ubuntu/Debian server using <strong className="text-white">PM2</strong>:
              </p>

              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
                  PM2 Process Manager Daemon
                </span>
                <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-200">
                  <pre>npm install -g pm2{'\n'}npm install && npm run build{'\n'}pm2 start "npm start" --name "reanime-app"{'\n'}pm2 save && pm2 startup</pre>
                  <button
                    onClick={() => copyToClipboard('npm install -g pm2\nnpm install && npm run build\npm2 start "npm start" --name "reanime-app"\npm2 save && pm2 startup', 'c8')}
                    className="absolute right-2.5 top-2.5 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {copiedIndex === 'c8' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
            <span>Neocities & Deployment guide in <code className="text-purple-300">DEPLOYMENT.md</code></span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
