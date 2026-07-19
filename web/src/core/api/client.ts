import type {
  AuthenticationResult,
  JellyfinItem,
  PlaybackInfoResult,
  PublicSystemInfo,
  QueryResult,
} from '../../types/jellyfin';
import type { SessionRecord } from '../storage/store';

const CLIENT_NAME = 'Wholphin Web';
const CLIENT_VERSION = '0.2.0';
const DEVICE_ID_KEY = 'wholphin-web-device-id';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
  anonymous?: boolean;
  timeoutMs?: number;
  dedupe?: boolean;
}

export interface ApiErrorInfo {
  path: string;
  status?: number;
  message: string;
  at: string;
}

export class JellyfinApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly path?: string,
  ) {
    super(message);
    this.name = 'JellyfinApiError';
  }
}

export function normalizeServerUrl(input: unknown): string {
  const raw = String(input ?? '').trim();
  if (!raw) throw new Error('Adresse du serveur requise.');
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Protocole serveur non pris en charge.');
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function authorizationHeader(token?: string | null, deviceId = getDeviceId()): string {
  const parts = [
    `Client="${CLIENT_NAME}"`,
    'Device="Browser"',
    `DeviceId="${deviceId}"`,
    `Version="${CLIENT_VERSION}"`,
  ];
  if (token) parts.push(`Token="${token}"`);
  return `MediaBrowser ${parts.join(', ')}`;
}

function mergeSignals(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export class JellyfinApi {
  readonly baseUrl: string;
  readonly deviceId: string;
  token: string | null;
  userId: string | null;
  lastError: ApiErrorInfo | null = null;
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(session: Partial<SessionRecord> & { serverUrl: string }) {
    this.baseUrl = normalizeServerUrl(session.serverUrl);
    this.token = session.token ?? null;
    this.userId = session.userId ?? null;
    this.deviceId = session.deviceId ?? getDeviceId();
  }

  url(path: string, params: RequestOptions['params'] = {}): string {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  imageUrl(itemId: string, options: { type?: string; maxWidth?: number; quality?: number; tag?: string } = {}): string {
    const { type = 'Primary', maxWidth = 640, quality = 88, tag } = options;
    return this.url(`/Items/${itemId}/Images/${type}`, {
      maxWidth,
      quality,
      tag,
      api_key: this.token,
    });
  }

  userImageUrl(userId: string, tag?: string): string {
    return this.url(`/Users/${userId}/Images/Primary`, { tag, maxWidth: 256, quality: 90, api_key: this.token });
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET', params, body, signal, anonymous = false, timeoutMs = 15_000,
      dedupe = method === 'GET',
    } = options;
    const requestUrl = this.url(path, params);
    const key = `${method}:${requestUrl}:${body ? JSON.stringify(body) : ''}`;
    const existing = dedupe ? this.pending.get(key) : undefined;
    if (existing) return existing as Promise<T>;

    const task = (async (): Promise<T> => {
      try {
        const response = await fetch(requestUrl, {
          method,
          signal: mergeSignals(signal, timeoutMs),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Emby-Authorization': authorizationHeader(anonymous ? null : this.token, this.deviceId),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          referrerPolicy: 'no-referrer',
          cache: 'no-store',
        });
        if (!response.ok) {
          let detail = '';
          try { detail = await response.text(); } catch { /* ignored */ }
          throw new JellyfinApiError(
            `Jellyfin ${response.status}: ${detail || response.statusText}`,
            response.status,
            path,
          );
        }
        if (response.status === 204) return null as T;
        const type = response.headers.get('content-type') ?? '';
        return (type.includes('application/json') ? await response.json() : await response.text()) as T;
      } catch (error) {
        const message = error instanceof DOMException && error.name === 'TimeoutError'
          ? 'Le serveur Jellyfin ne répond pas dans le délai prévu.'
          : error instanceof Error ? error.message : 'Erreur Jellyfin inconnue.';
        const status = error instanceof JellyfinApiError ? error.status : undefined;
        this.lastError = { path, status, message, at: new Date().toISOString() };
        throw error instanceof Error ? error : new JellyfinApiError(message, status, path);
      } finally {
        this.pending.delete(key);
      }
    })();

    if (dedupe) this.pending.set(key, task);
    return task;
  }

  publicInfo(signal?: AbortSignal): Promise<PublicSystemInfo> {
    return this.request('/System/Info/Public', { anonymous: true, signal, timeoutMs: 8_000 });
  }

  async authenticate(username: string, password: string, signal?: AbortSignal): Promise<AuthenticationResult> {
    const result = await this.request<AuthenticationResult>('/Users/AuthenticateByName', {
      method: 'POST', anonymous: true, body: { Username: username, Pw: password }, signal, dedupe: false,
    });
    this.token = result.AccessToken;
    this.userId = result.User.Id;
    return result;
  }

  views(signal?: AbortSignal): Promise<QueryResult<JellyfinItem>> {
    return this.request(`/Users/${this.requireUser()}/Views`, { signal });
  }

  resume(limit = 20, signal?: AbortSignal): Promise<QueryResult<JellyfinItem>> {
    return this.request(`/Users/${this.requireUser()}/Items/Resume`, {
      params: { Limit: limit, Fields: 'PrimaryImageAspectRatio,MediaSourceCount,Overview,RunTimeTicks' }, signal,
    });
  }

  nextUp(limit = 20, signal?: AbortSignal): Promise<QueryResult<JellyfinItem>> {
    return this.request('/Shows/NextUp', {
      params: { UserId: this.requireUser(), Limit: limit, Fields: 'PrimaryImageAspectRatio,Overview,RunTimeTicks' }, signal,
    });
  }

  latest(parentId: string, includeItemTypes: string, limit = 20, signal?: AbortSignal): Promise<JellyfinItem[]> {
    return this.request(`/Users/${this.requireUser()}/Items/Latest`, {
      params: {
        ParentId: parentId, IncludeItemTypes: includeItemTypes, Limit: limit,
        Fields: 'PrimaryImageAspectRatio,Overview,RunTimeTicks,Genres,CommunityRating',
      }, signal,
    });
  }

  items(options: {
    parentId?: string;
    includeItemTypes?: string;
    searchTerm?: string;
    limit?: number;
    startIndex?: number;
    sortBy?: string;
    sortOrder?: string;
    filters?: string;
    genres?: string;
    studios?: string;
    years?: string;
    signal?: AbortSignal;
  } = {}): Promise<QueryResult<JellyfinItem>> {
    return this.request(`/Users/${this.requireUser()}/Items`, {
      params: {
        ParentId: options.parentId,
        IncludeItemTypes: options.includeItemTypes,
        SearchTerm: options.searchTerm,
        Limit: options.limit ?? 100,
        StartIndex: options.startIndex ?? 0,
        Recursive: true,
        SortBy: options.sortBy ?? 'SortName',
        SortOrder: options.sortOrder ?? 'Ascending',
        Filters: options.filters,
        Genres: options.genres,
        Studios: options.studios,
        Years: options.years,
        EnableImages: true,
        ImageTypeLimit: 1,
        Fields: 'PrimaryImageAspectRatio,Overview,RunTimeTicks,Genres,CommunityRating,MediaSources,Studios,People,ChildCount',
      },
      signal: options.signal,
    });
  }

  item(id: string, signal?: AbortSignal): Promise<JellyfinItem> {
    return this.request(`/Users/${this.requireUser()}/Items/${id}`, { signal });
  }

  seasons(seriesId: string, signal?: AbortSignal): Promise<QueryResult<JellyfinItem>> {
    return this.request(`/Shows/${seriesId}/Seasons`, {
      params: { UserId: this.requireUser(), Fields: 'Overview,RunTimeTicks' }, signal,
    });
  }

  episodes(seriesId: string, seasonId: string, signal?: AbortSignal): Promise<QueryResult<JellyfinItem>> {
    return this.request(`/Shows/${seriesId}/Episodes`, {
      params: { UserId: this.requireUser(), SeasonId: seasonId, Fields: 'Overview,RunTimeTicks,MediaSources' }, signal,
    });
  }

  search(term: string, signal?: AbortSignal): Promise<QueryResult<JellyfinItem>> {
    return this.items({ searchTerm: term, limit: 80, sortBy: 'SearchScore,SortName', signal });
  }

  markFavorite(id: string, favorite: boolean): Promise<void> {
    return this.request(`/Users/${this.requireUser()}/FavoriteItems/${id}`, {
      method: favorite ? 'POST' : 'DELETE', dedupe: false,
    });
  }

  markPlayed(id: string, played: boolean): Promise<void> {
    return this.request(`/Users/${this.requireUser()}/PlayedItems/${id}`, {
      method: played ? 'POST' : 'DELETE', dedupe: false,
    });
  }

  playbackInfo(id: string, signal?: AbortSignal): Promise<PlaybackInfoResult> {
    return this.request(`/Items/${id}/PlaybackInfo`, {
      method: 'POST', params: { UserId: this.requireUser() }, signal, dedupe: false,
      body: {
        UserId: this.requireUser(),
        DeviceProfile: {
          Name: 'Wholphin Web Browser',
          MaxStaticBitrate: 120_000_000,
          MaxStreamingBitrate: 120_000_000,
          DirectPlayProfiles: [
            { Container: 'mp4,m4v,mov,webm', Type: 'Video', VideoCodec: 'h264,hevc,vp8,vp9,av1', AudioCodec: 'aac,mp3,opus,vorbis,ac3,eac3' },
            { Container: 'mp3,aac,m4a,flac,ogg,opus,wav', Type: 'Audio' },
          ],
          TranscodingProfiles: [
            { Container: 'ts', Type: 'Video', Protocol: 'hls', VideoCodec: 'h264', AudioCodec: 'aac', Context: 'Streaming' },
          ],
          SubtitleProfiles: [
            { Format: 'vtt', Method: 'External' },
            { Format: 'srt', Method: 'External' },
          ],
        },
      },
    });
  }

  directStreamUrl(itemId: string, mediaSourceId?: string): string {
    return this.url(`/Videos/${itemId}/stream`, {
      static: true, mediaSourceId, api_key: this.token,
    });
  }

  hlsUrl(itemId: string, mediaSourceId?: string, playSessionId?: string, maxStreamingBitrate = 20_000_000): string {
    return this.url(`/Videos/${itemId}/master.m3u8`, {
      UserId: this.requireUser(), MediaSourceId: mediaSourceId, PlaySessionId: playSessionId,
      MaxStreamingBitrate: maxStreamingBitrate, VideoCodec: 'h264', AudioCodec: 'aac',
      TranscodingContainer: 'ts', api_key: this.token,
    });
  }

  reportPlaying(itemId: string, info: Record<string, unknown>): Promise<void> {
    return this.request('/Sessions/Playing', { method: 'POST', body: { ItemId: itemId, CanSeek: true, ...info }, dedupe: false });
  }

  reportProgress(itemId: string, info: Record<string, unknown>): Promise<void> {
    return this.request('/Sessions/Playing/Progress', { method: 'POST', body: { ItemId: itemId, CanSeek: true, ...info }, dedupe: false });
  }

  reportStopped(itemId: string, info: Record<string, unknown>): Promise<void> {
    return this.request('/Sessions/Playing/Stopped', { method: 'POST', body: { ItemId: itemId, ...info }, dedupe: false });
  }

  diagnostics(): Record<string, unknown> {
    return {
      baseUrl: this.baseUrl,
      userId: this.userId,
      deviceId: this.deviceId,
      token: this.token ? '[redacted]' : null,
      lastError: this.lastError,
    };
  }

  private requireUser(): string {
    if (!this.userId) throw new Error('Aucun utilisateur Jellyfin actif.');
    return this.userId;
  }
}
