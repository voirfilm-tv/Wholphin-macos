import type { JellyfinApi } from './client';
import type { JellyfinItem, QueryResult } from '../../types/jellyfin';

export type PlaylistEntry = JellyfinItem & { PlaylistItemId?: string };

export interface PlaylistCreationResult {
  Id?: string;
  Name?: string;
}

export interface PlaylistSummary {
  Id: string;
  Name: string;
  Type: 'Playlist';
  ChildCount?: number;
}

export async function listPlaylists(api: JellyfinApi, signal?: AbortSignal): Promise<PlaylistSummary[]> {
  const result = await api.request<QueryResult<JellyfinItem>>(`/Users/${api.userId}/Items`, {
    params: {
      IncludeItemTypes: 'Playlist',
      Recursive: true,
      SortBy: 'SortName',
      SortOrder: 'Ascending',
      Limit: 1_000,
      Fields: 'ChildCount',
    },
    signal,
  });
  return result.Items.map((item) => ({ Id: item.Id, Name: item.Name, Type: 'Playlist', ChildCount: item.ChildCount }));
}

export async function getPlaylistItems(api: JellyfinApi, playlistId: string, signal?: AbortSignal): Promise<QueryResult<PlaylistEntry>> {
  return api.request<QueryResult<PlaylistEntry>>(`/Playlists/${playlistId}/Items`, {
    params: {
      UserId: api.userId,
      Fields: 'Overview,RunTimeTicks,MediaSources,PrimaryImageAspectRatio,Genres,DateCreated',
      EnableImages: true,
      EnableUserData: true,
      ImageTypeLimit: 1,
      Limit: 10_000,
    },
    signal,
  });
}

export async function createPlaylist(api: JellyfinApi, name: string, itemIds: string[] = [], signal?: AbortSignal): Promise<PlaylistCreationResult> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Le nom de la playlist est obligatoire.');
  return api.request<PlaylistCreationResult>('/Playlists', {
    method: 'POST',
    body: { Name: cleanName, Ids: itemIds, UserId: api.userId },
    signal,
  });
}

export async function renamePlaylist(api: JellyfinApi, playlistId: string, name: string, signal?: AbortSignal): Promise<void> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Le nom de la playlist est obligatoire.');
  await api.request<void>(`/Playlists/${playlistId}`, {
    method: 'POST',
    body: { Name: cleanName },
    signal,
  });
}

export async function addItemsToPlaylist(api: JellyfinApi, playlistId: string, itemIds: string[], signal?: AbortSignal): Promise<void> {
  if (!itemIds.length) return;
  await api.request<void>(`/Playlists/${playlistId}/Items`, {
    method: 'POST',
    params: { Ids: itemIds.join(','), UserId: api.userId },
    signal,
  });
}

export async function removePlaylistEntries(api: JellyfinApi, playlistId: string, entryIds: string[], signal?: AbortSignal): Promise<void> {
  if (!entryIds.length) return;
  await api.request<void>(`/Playlists/${playlistId}/Items`, {
    method: 'DELETE',
    params: { EntryIds: entryIds.join(',') },
    signal,
  });
}

export async function movePlaylistEntry(api: JellyfinApi, playlistId: string, entryId: string, newIndex: number, signal?: AbortSignal): Promise<void> {
  await api.request<void>(`/Playlists/${playlistId}/Items/${entryId}/Move/${Math.max(0, Math.trunc(newIndex))}`, {
    method: 'POST',
    signal,
  });
}
