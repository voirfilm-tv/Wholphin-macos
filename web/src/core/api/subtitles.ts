import type { JellyfinApi } from './client';

export interface RemoteSubtitleInfo {
  Id?: string | null;
  Name?: string | null;
  ProviderName?: string | null;
  ThreeLetterISOLanguageName?: string | null;
  Format?: string | null;
  Author?: string | null;
  Comment?: string | null;
  DateCreated?: string | null;
  CommunityRating?: number | null;
  DownloadCount?: number | null;
  IsHashMatch?: boolean | null;
  Forced?: boolean | null;
  HearingImpaired?: boolean | null;
  AiTranslated?: boolean | null;
  MachineTranslated?: boolean | null;
  FrameRate?: number | null;
}

export async function searchRemoteSubtitles(api: JellyfinApi, itemId: string, language: string, signal?: AbortSignal): Promise<RemoteSubtitleInfo[]> {
  const cleanLanguage = language.trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(cleanLanguage)) throw new Error('La langue doit être un code ISO 639-2 à trois lettres.');
  return api.request<RemoteSubtitleInfo[]>(`/Items/${encodeURIComponent(itemId)}/RemoteSearch/Subtitles/${cleanLanguage}`, {
    params: { isPerfectMatch: false },
    signal,
  });
}

export async function downloadRemoteSubtitle(api: JellyfinApi, itemId: string, subtitleId: string, signal?: AbortSignal): Promise<void> {
  if (!subtitleId) throw new Error('Identifiant de sous-titre manquant.');
  await api.request<void>(`/Items/${encodeURIComponent(itemId)}/RemoteSearch/Subtitles/${encodeURIComponent(subtitleId)}`, {
    method: 'POST',
    signal,
  });
}

export async function deleteSubtitle(api: JellyfinApi, itemId: string, index: number, signal?: AbortSignal): Promise<void> {
  await api.request<void>(`/Videos/${encodeURIComponent(itemId)}/Subtitles/${Math.max(0, Math.trunc(index))}`, {
    method: 'DELETE',
    signal,
  });
}
