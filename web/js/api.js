const CLIENT_NAME = 'Wholphin Web';
const CLIENT_VERSION = '0.1.0';
const DEVICE_ID_KEY = 'wholphin-web-device-id';

export function normalizeServerUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Adresse du serveur requise.');
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function getDeviceId() {
  if (typeof localStorage === 'undefined') return 'test-device';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function authorizationHeader({ token, deviceId = getDeviceId() } = {}) {
  const parts = [
    `Client="${CLIENT_NAME}"`,
    `Device="Browser"`,
    `DeviceId="${deviceId}"`,
    `Version="${CLIENT_VERSION}"`
  ];
  if (token) parts.push(`Token="${token}"`);
  return `MediaBrowser ${parts.join(', ')}`;
}

export function ticksToSeconds(ticks) {
  return Number(ticks || 0) / 10_000_000;
}

export function secondsToTicks(seconds) {
  return Math.max(0, Math.round(Number(seconds || 0) * 10_000_000));
}

export function formatRuntime(ticks) {
  const totalMinutes = Math.round(ticksToSeconds(ticks) / 60);
  if (!totalMinutes) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} h ${String(minutes).padStart(2, '0')}` : `${minutes} min`;
}

export class JellyfinApi {
  constructor(session) {
    this.baseUrl = normalizeServerUrl(session.serverUrl);
    this.token = session.token || null;
    this.userId = session.userId || null;
    this.deviceId = session.deviceId || getDeviceId();
    this.lastError = null;
  }

  url(path, params = {}) {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  imageUrl(itemId, { type = 'Primary', maxWidth = 640, quality = 88, tag } = {}) {
    if (!itemId) return '';
    return this.url(`/Items/${itemId}/Images/${type}`, {
      maxWidth,
      quality,
      tag,
      api_key: this.token || undefined
    });
  }

  streamUrl(itemId, mediaSourceId, audioStreamIndex, subtitleStreamIndex) {
    return this.url(`/Videos/${itemId}/stream`, {
      static: true,
      mediaSourceId,
      audioStreamIndex,
      subtitleStreamIndex,
      api_key: this.token
    });
  }

  async request(path, { method = 'GET', params, body, signal, anonymous = false } = {}) {
    const response = await fetch(this.url(path, params), {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Emby-Authorization': authorizationHeader({ token: anonymous ? null : this.token, deviceId: this.deviceId })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignored */ }
      const error = new Error(`Jellyfin ${response.status}: ${detail || response.statusText}`);
      error.status = response.status;
      this.lastError = { path, status: response.status, message: error.message, at: new Date().toISOString() };
      throw error;
    }

    if (response.status === 204) return null;
    const type = response.headers.get('content-type') || '';
    return type.includes('application/json') ? response.json() : response.text();
  }

  publicInfo() {
    return this.request('/System/Info/Public', { anonymous: true });
  }

  async authenticate(username, password) {
    const data = await this.request('/Users/AuthenticateByName', {
      method: 'POST', anonymous: true, body: { Username: username, Pw: password }
    });
    this.token = data.AccessToken;
    this.userId = data.User?.Id;
    return data;
  }

  views() {
    return this.request(`/Users/${this.userId}/Views`);
  }

  resume(limit = 20) {
    return this.request(`/Users/${this.userId}/Items/Resume`, {
      params: { Limit: limit, Fields: 'PrimaryImageAspectRatio,MediaSourceCount,Overview,RunTimeTicks' }
    });
  }

  nextUp(limit = 20) {
    return this.request('/Shows/NextUp', {
      params: { UserId: this.userId, Limit: limit, Fields: 'PrimaryImageAspectRatio,Overview,RunTimeTicks' }
    });
  }

  latest(parentId, includeItemTypes, limit = 20) {
    return this.request(`/Users/${this.userId}/Items/Latest`, {
      params: {
        ParentId: parentId,
        IncludeItemTypes: includeItemTypes,
        Limit: limit,
        Fields: 'PrimaryImageAspectRatio,Overview,RunTimeTicks,Genres,CommunityRating'
      }
    });
  }

  items({ parentId, includeItemTypes, searchTerm, limit = 100, startIndex = 0, sortBy = 'SortName', sortOrder = 'Ascending', filters } = {}) {
    return this.request(`/Users/${this.userId}/Items`, {
      params: {
        ParentId: parentId,
        IncludeItemTypes: includeItemTypes,
        SearchTerm: searchTerm,
        Limit: limit,
        StartIndex: startIndex,
        Recursive: true,
        SortBy: sortBy,
        SortOrder: sortOrder,
        Filters: filters,
        EnableImages: true,
        ImageTypeLimit: 1,
        Fields: 'PrimaryImageAspectRatio,Overview,RunTimeTicks,Genres,CommunityRating,MediaSources,Studios,People,ChildCount'
      }
    });
  }

  item(id) {
    return this.request(`/Users/${this.userId}/Items/${id}`);
  }

  seasons(seriesId) {
    return this.request(`/Shows/${seriesId}/Seasons`, { params: { UserId: this.userId, Fields: 'Overview,RunTimeTicks' } });
  }

  episodes(seriesId, seasonId) {
    return this.request(`/Shows/${seriesId}/Episodes`, {
      params: { UserId: this.userId, SeasonId: seasonId, Fields: 'Overview,RunTimeTicks,MediaSources' }
    });
  }

  search(term, limit = 80) {
    return this.items({ searchTerm: term, limit, sortBy: 'SearchScore,SortName' });
  }

  markFavorite(id, favorite) {
    return this.request(`/Users/${this.userId}/FavoriteItems/${id}`, { method: favorite ? 'POST' : 'DELETE' });
  }

  markPlayed(id, played) {
    return this.request(`/Users/${this.userId}/PlayedItems/${id}`, { method: played ? 'POST' : 'DELETE' });
  }

  playbackInfo(id) {
    return this.request(`/Items/${id}/PlaybackInfo`, {
      method: 'POST',
      params: { UserId: this.userId },
      body: {
        UserId: this.userId,
        DeviceProfile: {
          Name: 'Wholphin Web Browser',
          MaxStaticBitrate: 120000000,
          MaxStreamingBitrate: 120000000,
          DirectPlayProfiles: [
            { Container: 'mp4,m4v,mov,webm', Type: 'Video', VideoCodec: 'h264,hevc,vp8,vp9,av1', AudioCodec: 'aac,mp3,opus,vorbis,ac3,eac3' },
            { Container: 'mp3,aac,m4a,flac,ogg,opus,wav', Type: 'Audio' }
          ],
          TranscodingProfiles: [
            { Container: 'ts', Type: 'Video', Protocol: 'hls', VideoCodec: 'h264', AudioCodec: 'aac', Context: 'Streaming' }
          ],
          SubtitleProfiles: [
            { Format: 'vtt', Method: 'External' },
            { Format: 'srt', Method: 'External' }
          ]
        }
      }
    });
  }

  hlsUrl(id, mediaSourceId, playSessionId, maxStreamingBitrate = 20_000_000) {
    return this.url(`/Videos/${id}/master.m3u8`, {
      UserId: this.userId,
      MediaSourceId: mediaSourceId,
      PlaySessionId: playSessionId,
      MaxStreamingBitrate: maxStreamingBitrate,
      VideoCodec: 'h264',
      AudioCodec: 'aac',
      TranscodingContainer: 'ts',
      api_key: this.token
    });
  }

  reportPlaying(itemId, info = {}) {
    return this.request('/Sessions/Playing', {
      method: 'POST',
      body: { ItemId: itemId, CanSeek: true, IsPaused: false, PositionTicks: 0, ...info }
    });
  }

  reportProgress(itemId, info = {}) {
    return this.request('/Sessions/Playing/Progress', {
      method: 'POST',
      body: { ItemId: itemId, CanSeek: true, ...info }
    });
  }

  reportStopped(itemId, info = {}) {
    return this.request('/Sessions/Playing/Stopped', {
      method: 'POST',
      body: { ItemId: itemId, ...info }
    });
  }
}
