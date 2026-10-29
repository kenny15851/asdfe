export interface Anime {
  id: string;
  slug: string;
  name: string;
  title?: string;
  jname?: string;
  description?: string;
  poster?: string;
  banner?: string;
  cover_image?: {
    extra_large?: string;
    large?: string;
    medium?: string;
  };
  format?: string;
  episodes_count?: number;
  rating?: string;
  score?: number;
  rank?: number;
  season?: string;
  year?: number;
  status?: string;
  genres?: string[];
  anilist_id?: number;
  anilist?: number;
  themoviedb_id?: number;
  latest_episode?: number;
}

export interface Episode {
  id: string | number;
  number: number;
  title: string;
  duration?: string;
  thumbnail?: string;
  is_filler?: boolean;
}

export interface ServerLink {
  $id?: string;
  serverName: string;
  dataType: 'sub' | 'dub' | 's-sub' | 's-dub';
  access_id?: string;
  link?: string;
  embed_url?: string;
  direct_url?: string;
  v?: number;
  is_curated?: boolean;
  source_type?: 'megaplay' | 'flixcloud' | 'custom';
  provider?: string;
  is_available?: boolean;
}

export interface ServersResponse {
  source?: string;
  sub: ServerLink[];
  dub: ServerLink[];
  anime?: any;
  current?: number;
  duration?: number;
  intro_start?: number;
  intro_end?: number;
  outro_start?: number;
  outro_end?: number;
  anilist_id?: number | null;
  megaplay_enabled?: boolean;
}

export interface StreamData {
  url: string;
  embed_url?: string;
  subtitles: Array<{
    file?: string;
    url?: string;
    label?: string;
    language?: string;
    kind?: string;
    default?: boolean;
  }>;
  thumbnails_vtt: string | null;
  video_title: string | null;
  intro_chapter: { start: number; end: number; title?: string } | null;
  outro_chapter: { start: number; end: number; title?: string } | null;
  video_id: string | null;
}

export interface WatchHistoryItem {
  slug: string;
  title: string;
  poster: string;
  episode: number;
  timestamp: number;
  duration: number;
  lastWatchedAt: string;
  anilist_id?: number;
}

export interface ScheduleItem {
  title: string;
  slug: string;
  time: string;
  episode: number;
  poster?: string;
}
