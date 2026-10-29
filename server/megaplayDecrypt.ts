import crypto from 'crypto';

export interface DecryptedMegaStream {
  streamUrl: string;
  subtitles: Array<{
    file: string;
    label: string;
    kind: string;
    default?: boolean;
  }>;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  image?: string;
  dataId?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': USER_AGENT,
  Referer: 'https://megaplay.buzz/api',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// In-memory cache for decrypted MegaPlay streams
const megaCache = new Map<string, { data: DecryptedMegaStream | null; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function b64UrlDecode(str: string): Buffer {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function padBytes(str: string, len: number): Buffer {
  const buf = Buffer.alloc(len, 0);
  Buffer.from(str).copy(buf, 0, 0, len);
  return buf;
}

export function decryptMegaPayload(enc: string): { file: string } {
  const key = padBytes('i?LMTAx0Q6,:}50U', 32);
  const iv = padBytes("W0;27ToaUpl_P%'c", 16);
  const cipherText = b64UrlDecode(enc);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

export async function extractMegaPlayStream(targetUrl: string): Promise<DecryptedMegaStream | null> {
  const cached = megaCache.get(targetUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const pageRes = await fetch(targetUrl, {
      headers: HEADERS,
    });

    if (!pageRes.ok) {
      megaCache.set(targetUrl, { data: null, timestamp: Date.now() });
      return null;
    }

    const html = await pageRes.text();

    // Check for 404 or missing episode body
    if (
      html.includes('Error - MegaPlay') ||
      html.includes('Error Code: 404') ||
      html.includes('Error Code: <span>404</span>') ||
      html.includes("The page you're looking for doesn't exist") ||
      html.includes('Oops! Something went wrong')
    ) {
      megaCache.set(targetUrl, { data: null, timestamp: Date.now() });
      return null;
    }

    const idMatch = html.match(/data-id=["'](\d+)["']/);
    if (!idMatch) {
      megaCache.set(targetUrl, { data: null, timestamp: Date.now() });
      return null;
    }

    const dataId = idMatch[1];
    const sourcesUrl = `https://megaplay.buzz/stream/getSourcesNew?id=${dataId}`;

    const sourcesRes = await fetch(sourcesUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: targetUrl,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!sourcesRes.ok) {
      megaCache.set(targetUrl, { data: null, timestamp: Date.now() });
      return null;
    }

    const json = await sourcesRes.json();
    if (!json || !json.enc) {
      megaCache.set(targetUrl, { data: null, timestamp: Date.now() });
      return null;
    }

    const decrypted = decryptMegaPayload(json.enc);
    if (!decrypted?.file) {
      megaCache.set(targetUrl, { data: null, timestamp: Date.now() });
      return null;
    }

    const subtitles = (json.tracks || [])
      .filter((t: any) => t && t.file && t.kind !== 'thumbnails')
      .map((t: any) => ({
        file: t.file,
        label: t.label || 'Subtitle Track',
        kind: t.kind || 'captions',
        default: !!t.default,
      }));

    const result: DecryptedMegaStream = {
      streamUrl: decrypted.file,
      subtitles,
      intro: json.intro && json.intro.end > json.intro.start ? json.intro : undefined,
      outro: json.outro && json.outro.end > json.outro.start ? json.outro : undefined,
      image: json.image || undefined,
      dataId,
    };

    megaCache.set(targetUrl, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: any) {
    console.warn(`[MegaPlayDecrypt] Error extracting stream from ${targetUrl}:`, err.message);
    megaCache.set(targetUrl, { data: null, timestamp: Date.now() });
    return null;
  }
}

export async function isMegaPlayAvailable(
  aid: number,
  episode: number,
  type: 'sub' | 'dub' = 'sub'
): Promise<boolean> {
  const url = `https://megaplay.buzz/stream/ani/${aid}/${episode}/${type}`;
  const stream = await extractMegaPlayStream(url);
  return stream !== null;
}
