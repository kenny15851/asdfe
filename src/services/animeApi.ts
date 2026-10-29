import { Anime, Episode, ServersResponse, StreamData, ScheduleItem, ServerLink } from '../types.js';
import { FALLBACK_ANIME, DEMO_STREAMS_CLIENT } from './curatedClientData.js';

// Detect whether we are running on a purely static host (e.g. neocities.org, file://, github.io)
export function isStaticHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host.includes('neocities.org') ||
    host.includes('github.io') ||
    host.includes('gitlab.io') ||
    window.location.protocol === 'file:' ||
    localStorage.getItem('reanime_force_static') === 'true'
  );
}

// Get the effective API base URL (supports user-configured custom backend on Render/Railway)
export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('reanime_custom_backend');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/$/, '');
  }
  return '';
}

// Map Jikan anime object to our Anime model
function mapJikanAnime(item: any): Anime {
  if (!item) return FALLBACK_ANIME[0];
  const name = item.title_english || item.title || 'Anime';
  const poster = item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '';
  const banner = item.images?.jpg?.large_image_url || poster;
  const slug = (item.title || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return {
    id: String(item.mal_id || slug),
    slug: slug || String(item.mal_id),
    name,
    title: name,
    jname: item.title_japanese || '',
    description: item.synopsis ? String(item.synopsis).replace(/\[Written by MAL Rewrite\]/g, '').trim() : '',
    poster,
    banner,
    format: item.type || 'TV',
    episodes_count: item.episodes || 12,
    latest_episode: item.episodes || 12,
    rating: item.rating || 'PG-13',
    score: item.score || 8.0,
    season: item.season || '',
    year: item.year || new Date().getFullYear(),
    status: item.status || 'Finished Airing',
    genres: (item.genres || []).map((g: any) => g.name || g),
    anilist_id: item.mal_id,
  };
}

// Safe client-side Jikan fetch with timeout
async function fetchJikan(endpoint: string): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.jikan.moe/v4${endpoint}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`Jikan HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// --- API METHODS ---

export async function fetchHome(): Promise<{
  source: string;
  notice?: string;
  latest_aired: Anime[];
  top_weekly: Anime[];
}> {
  const base = getApiBase();
  // Try backend first if not explicitly running on Neocities without backend
  if (!isStaticHost() || base) {
    try {
      const res = await fetch(`${base}/api/anime/home`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend not reached, fall through to client-side mode
    }
  }

  // Client-Side / Neocities Mode: Query Jikan API directly or use curated fallback
  try {
    const [airingRes, popularRes] = await Promise.allSettled([
      fetchJikan('/top/anime?filter=airing&limit=14'),
      fetchJikan('/top/anime?filter=bypopularity&limit=14'),
    ]);

    const latestAired: Anime[] =
      airingRes.status === 'fulfilled' && airingRes.value?.data
        ? airingRes.value.data.map(mapJikanAnime)
        : FALLBACK_ANIME.slice(0, 4);

    const topWeekly: Anime[] =
      popularRes.status === 'fulfilled' && popularRes.value?.data
        ? popularRes.value.data.map(mapJikanAnime)
        : FALLBACK_ANIME;

    return {
      source: 'neocities-client-jikan',
      notice: 'Running in Standalone Client Mode (Neocities Compatible)',
      latest_aired: latestAired.length ? latestAired : FALLBACK_ANIME,
      top_weekly: topWeekly.length ? topWeekly : FALLBACK_ANIME,
    };
  } catch (err) {
    console.warn('[Neocities Static Mode] Using built-in curated anime catalog');
    return {
      source: 'neocities-offline-cache',
      notice: 'Offline / Static Cache Active',
      latest_aired: FALLBACK_ANIME.slice(0, 4),
      top_weekly: FALLBACK_ANIME,
    };
  }
}

export async function searchAnime(query: string, limit = 20): Promise<{
  source: string;
  data?: Anime[];
  results?: Anime[];
  total?: number;
}> {
  const base = getApiBase();
  if (!isStaticHost() || base) {
    try {
      const res = await fetch(`${base}/api/anime/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through to client-side
    }
  }

  // Client-Side Search via Jikan
  try {
    const res = await fetchJikan(`/anime?q=${encodeURIComponent(query)}&limit=${limit}&sfw=true`);
    const results = (res.data || []).map(mapJikanAnime);
    return {
      source: 'neocities-client-search',
      data: results,
      results,
      total: results.length,
    };
  } catch {
    // Local filter fallback
    const qLower = query.toLowerCase();
    const filtered = FALLBACK_ANIME.filter(
      (a) =>
        a.name.toLowerCase().includes(qLower) ||
        (a.genres && a.genres.some((g) => g.toLowerCase().includes(qLower)))
    );
    return {
      source: 'local-filter',
      data: filtered,
      results: filtered,
      total: filtered.length,
    };
  }
}

export async function fetchTopAnime(period: 'day' | 'week' | 'month' = 'week'): Promise<{
  source: string;
  data: Anime[];
}> {
  const base = getApiBase();
  if (!isStaticHost() || base) {
    try {
      const res = await fetch(`${base}/api/anime/top?period=${period}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through
    }
  }

  try {
    const res = await fetchJikan(`/top/anime?limit=25`);
    const data = (res.data || []).map(mapJikanAnime);
    return {
      source: 'neocities-client-top',
      data: data.length ? data : FALLBACK_ANIME,
    };
  } catch {
    return {
      source: 'offline-cache',
      data: FALLBACK_ANIME,
    };
  }
}

export async function fetchSchedule(): Promise<{
  source: string;
  data: Record<string, ScheduleItem[]>;
}> {
  const base = getApiBase();
  if (!isStaticHost() || base) {
    try {
      const res = await fetch(`${base}/api/anime/schedule`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through
    }
  }

  try {
    const res = await fetchJikan('/schedules?limit=25');
    const grouped: Record<string, ScheduleItem[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    (res.data || []).forEach((item: any) => {
      const day = item.broadcast?.day || 'Monday';
      const time = item.broadcast?.time || '18:00';
      const slug = (item.title || 'anime').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (grouped[day]) {
        grouped[day].push({
          title: item.title_english || item.title,
          slug,
          time,
          episode: (item.episodes || 12),
          poster: item.images?.jpg?.image_url,
        });
      }
    });

    return {
      source: 'neocities-client-schedule',
      data: grouped,
    };
  } catch {
    // Simple fallback schedule
    const fallbackSchedule: Record<string, ScheduleItem[]> = {
      Monday: [
        { title: 'Solo Leveling', slug: 'solo-leveling-ore-dake-level-up-na-ken', time: '17:30 JST', episode: 12 },
      ],
      Tuesday: [
        { title: 'Frieren: Beyond Journey\'s End', slug: 'sousou-no-frieren', time: '23:00 JST', episode: 28 },
      ],
      Wednesday: [
        { title: 'Chainsaw Man', slug: 'chainsaw-man', time: '20:00 JST', episode: 12 },
      ],
      Thursday: [
        { title: 'Kaiju No. 8', slug: 'kaijuu-8-gou', time: '21:00 JST', episode: 12 },
      ],
      Friday: [
        { title: 'Jujutsu Kaisen Season 2', slug: 'jujutsu-kaisen-2nd-season', time: '23:56 JST', episode: 23 },
      ],
      Saturday: [
        { title: 'Demon Slayer: Hashira Training', slug: 'kimetsu-no-yaiba-hashira-geiko-hen', time: '23:15 JST', episode: 8 },
      ],
      Sunday: [
        { title: 'Attack on Titan Final Season', slug: 'shingeki-no-kyojin-the-final-season', time: '24:05 JST', episode: 28 },
      ],
    };
    return {
      source: 'offline-cache',
      data: fallbackSchedule,
    };
  }
}

export async function fetchAnimeInfo(slug: string): Promise<Anime & { episodes: Episode[] }> {
  const base = getApiBase();
  if (!isStaticHost() || base) {
    try {
      const res = await fetch(`${base}/api/anime/info/${encodeURIComponent(slug)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through
    }
  }

  // 1. Check if slug matches any in local FALLBACK_ANIME
  const local = FALLBACK_ANIME.find(
    (a) => a.slug === slug || a.id === slug || a.name.toLowerCase().includes(slug.replace(/-/g, ' '))
  );

  const baseAnime = local || {
    id: slug,
    slug: slug,
    name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1400&auto=format&fit=crop&q=80',
    description: 'Anime stream available via MegaBuzz embed player and native streaming options.',
    format: 'TV',
    episodes_count: 12,
    latest_episode: 12,
    rating: 'PG-13',
    score: 8.5,
    genres: ['Action', 'Fantasy'],
    anilist_id: 151807,
  };

  const count = baseAnime.episodes_count || 12;
  const episodes: Episode[] = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    title: `Episode ${i + 1}`,
    duration: '24m',
    thumbnail: baseAnime.banner || baseAnime.poster,
  }));

  return {
    ...baseAnime,
    episodes,
  };
}

export async function fetchEpisodes(slug: string): Promise<Episode[]> {
  const info = await fetchAnimeInfo(slug);
  return info.episodes;
}

export async function fetchServers(slug: string, episode: number, anilistId?: number | null): Promise<ServersResponse> {
  const base = getApiBase();
  if (!isStaticHost() || base) {
    try {
      let url = `${base}/api/anime/servers/${encodeURIComponent(slug)}/${episode}`;
      if (anilistId) url += `?anilist_id=${anilistId}`;
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through to client-side multi-server generation
    }
  }

  // Neocities / Static Host Multi-Server Configuration
  // MegaBuzz embed operates purely client-side inside an iframe without requiring a Node.js server!
  const aid = anilistId || 151807;
  const subServers: ServerLink[] = [
    {
      $id: `mega-sub-${aid}-${episode}`,
      serverName: 'MegaBuzz (Sub)',
      dataType: 'sub',
      access_id: `megaplay-ani-${aid}-${episode}-sub`,
      source_type: 'megaplay',
      direct_url: `https://megaplay.buzz/stream/ani/${aid}/${episode}/sub`,
      embed_url: `https://megaplay.buzz/stream/ani/${aid}/${episode}/sub`,
      link: `https://megaplay.buzz/stream/ani/${aid}/${episode}/sub`,
      is_available: true,
    },
    {
      $id: `vidsrc-${aid}-${episode}`,
      serverName: 'VidSrc Embed (Sub)',
      dataType: 'sub',
      access_id: `vidsrc-${aid}-${episode}`,
      source_type: 'megaplay',
      direct_url: `https://vidsrc.to/embed/anime/${aid}/${episode}`,
      embed_url: `https://vidsrc.to/embed/anime/${aid}/${episode}`,
      link: `https://vidsrc.to/embed/anime/${aid}/${episode}`,
      is_available: true,
    },
    {
      $id: `2embed-${aid}-${episode}`,
      serverName: '2Embed Stream (Sub)',
      dataType: 'sub',
      access_id: `2embed-${aid}-${episode}`,
      source_type: 'megaplay',
      direct_url: `https://www.2embed.cc/embed/anime/${aid}/${episode}`,
      embed_url: `https://www.2embed.cc/embed/anime/${aid}/${episode}`,
      link: `https://www.2embed.cc/embed/anime/${aid}/${episode}`,
      is_available: true,
    },
    {
      $id: `hls-demo-sub`,
      serverName: 'HD HLS Stream (Native)',
      dataType: 'sub',
      access_id: 'demo-hls-master',
      source_type: 'custom',
      direct_url: DEMO_STREAMS_CLIENT[0].url,
      is_available: true,
    },
  ];

  const dubServers: ServerLink[] = [
    {
      $id: `mega-dub-${aid}-${episode}`,
      serverName: 'MegaBuzz (Dub)',
      dataType: 'dub',
      access_id: `megaplay-ani-${aid}-${episode}-dub`,
      source_type: 'megaplay',
      direct_url: `https://megaplay.buzz/stream/ani/${aid}/${episode}/dub`,
      embed_url: `https://megaplay.buzz/stream/ani/${aid}/${episode}/dub`,
      link: `https://megaplay.buzz/stream/ani/${aid}/${episode}/dub`,
      is_available: true,
    },
    {
      $id: `hls-demo-dub`,
      serverName: 'HD Dub Stream (Native)',
      dataType: 'dub',
      access_id: 'demo-hls-dub',
      source_type: 'custom',
      direct_url: DEMO_STREAMS_CLIENT[0].url,
      is_available: true,
    },
  ];

  return {
    source: 'neocities-multi-server',
    sub: subServers,
    dub: dubServers,
    anilist_id: aid,
    megaplay_enabled: true,
  };
}

export async function fetchStream(accessId: string, v = 2, isDub = false): Promise<StreamData> {
  const base = getApiBase();
  if (!isStaticHost() || base) {
    try {
      const query = new URLSearchParams({
        v: String(v),
        ...(isDub ? { is_dub: '1', a: '1', type: 'dub' } : {}),
      });
      const res = await fetch(`${base}/api/anime/stream/${encodeURIComponent(accessId)}?${query.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through
    }
  }

  // Handle client-side stream generation
  if (accessId.startsWith('megaplay-')) {
    const parts = accessId.split('-');
    const aid = parts[2] || '151807';
    const ep = parts[3] || '1';
    const lang = isDub ? 'dub' : 'sub';
    const embedUrl = `https://megaplay.buzz/stream/ani/${aid}/${ep}/${lang}`;
    return {
      url: '',
      embed_url: embedUrl,
      subtitles: [],
      thumbnails_vtt: null,
      video_title: `Episode ${ep} (${lang.toUpperCase()})`,
      intro_chapter: null,
      outro_chapter: null,
      video_id: accessId,
    };
  }

  // Default HLS fallback stream
  const demo = DEMO_STREAMS_CLIENT[0];
  return {
    url: demo.url,
    embed_url: undefined,
    subtitles: demo.subtitles || [],
    thumbnails_vtt: null,
    video_title: demo.video_title,
    intro_chapter: demo.intro_chapter,
    outro_chapter: demo.outro_chapter,
    video_id: 'hls-native',
  };
}

export async function fetchStreamFromLink(link: string): Promise<StreamData> {
  const base = getApiBase();
  if (!isStaticHost() || base) {
    try {
      const res = await fetch(`${base}/api/anime/stream/from-link?link=${encodeURIComponent(link)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through
    }
  }

  return {
    url: link.includes('.m3u8') ? link : '',
    embed_url: link.includes('.m3u8') ? undefined : link,
    subtitles: [],
    thumbnails_vtt: null,
    video_title: 'Direct Stream',
    intro_chapter: null,
    outro_chapter: null,
    video_id: null,
  };
}

export async function fetchMegaPlayInfo() {
  return {
    status: 'ok',
    source: 'megaplay.buzz',
    name: 'MegaPlay / MegaBuzz',
    description: 'Embedded streaming provider directly supported on Neocities and static hosts.',
    endpoints: {
      stream: 'https://megaplay.buzz/stream/ani/:anilist_id/:episode/:type',
    },
  };
}
