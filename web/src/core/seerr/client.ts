import type { SeerrDetails, SeerrMediaType, SeerrPage, SeerrRequest, SeerrResult, SeerrStatus } from '../../types/seerr';
import { normalizeSeerrUrl, type SeerrConfig } from './config';

interface RequestOptions {
  method?: 'GET' | 'POST';
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class SeerrClient {
  readonly baseUrl: string;
  private readonly apiBase: string;

  constructor(private readonly config: SeerrConfig) {
    this.baseUrl = normalizeSeerrUrl(config.baseUrl);
    this.apiBase = `${this.baseUrl}/api/v1`;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.apiBase}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(options.params ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
    const timeout = AbortSignal.timeout(options.timeoutMs ?? 15_000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Api-Key': this.config.apiKey },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignored */ }
      throw new Error(`Seerr ${response.status}: ${detail || response.statusText}`);
    }
    if (response.status === 204) return null as T;
    return response.json() as Promise<T>;
  }

  status(signal?: AbortSignal): Promise<SeerrStatus> { return this.request('/status', { signal, timeoutMs: 8_000 }); }
  discover(type: SeerrMediaType, page = 1, language = 'fr', signal?: AbortSignal): Promise<SeerrPage<SeerrResult>> {
    return this.request(type === 'movie' ? '/discover/movies' : '/discover/tv', { params: { page, language }, signal });
  }
  search(query: string, page = 1, language = 'fr', signal?: AbortSignal): Promise<SeerrPage<SeerrResult>> {
    return this.request('/search', { params: { query, page, language }, signal });
  }
  details(type: SeerrMediaType, id: number, language = 'fr', signal?: AbortSignal): Promise<SeerrDetails> {
    return this.request(`/${type}/${id}`, { params: { language }, signal });
  }
  requestMedia(type: SeerrMediaType, id: number, seasons: number[] | 'all' | undefined, signal?: AbortSignal): Promise<SeerrRequest> {
    return this.request('/request', { method: 'POST', body: { mediaType: type, mediaId: id, ...(type === 'tv' ? { seasons: seasons ?? 'all' } : {}), is4k: false }, signal });
  }
}

export function tmdbImage(path: string | null | undefined, size: 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : '';
}

export function seerrTitle(item: SeerrResult): string { return item.title ?? item.name ?? item.originalTitle ?? item.originalName ?? 'Sans titre'; }
export function seerrYear(item: SeerrResult): string { return (item.releaseDate ?? item.firstAirDate ?? '').slice(0, 4); }
