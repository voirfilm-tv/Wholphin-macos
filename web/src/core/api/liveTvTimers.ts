import type { JellyfinApi } from './client';

export interface LiveTvTimerDefaults {
  Id?: string;
  ProgramId?: string;
  SeriesId?: string;
  ChannelId?: string;
  Name?: string;
  Overview?: string;
  StartDate?: string;
  EndDate?: string;
  PrePaddingSeconds?: number;
  PostPaddingSeconds?: number;
  IsPrePaddingRequired?: boolean;
  IsPostPaddingRequired?: boolean;
  KeepUntil?: string;
  RecordAnyTime?: boolean;
  RecordAnyChannel?: boolean;
  RecordNewOnly?: boolean;
  Days?: string[];
  [key: string]: unknown;
}

export async function getDefaultTimer(api: JellyfinApi, programId: string, signal?: AbortSignal): Promise<LiveTvTimerDefaults> {
  return api.request<LiveTvTimerDefaults>('/LiveTv/Timers/Defaults', {
    params: { programId },
    signal,
  });
}

export async function createTimer(api: JellyfinApi, programId: string, signal?: AbortSignal): Promise<void> {
  const timer = await getDefaultTimer(api, programId, signal);
  await api.request<void>('/LiveTv/Timers', {
    method: 'POST',
    body: { ...timer, ProgramId: timer.ProgramId ?? programId },
    signal,
  });
}

export async function cancelTimer(api: JellyfinApi, timerId: string, signal?: AbortSignal): Promise<void> {
  await api.request<void>(`/LiveTv/Timers/${encodeURIComponent(timerId)}`, {
    method: 'DELETE',
    signal,
  });
}

export async function createSeriesTimer(api: JellyfinApi, programId: string, signal?: AbortSignal): Promise<void> {
  const timer = await getDefaultTimer(api, programId, signal);
  await api.request<void>('/LiveTv/SeriesTimers', {
    method: 'POST',
    body: {
      ...timer,
      ProgramId: timer.ProgramId ?? programId,
      RecordAnyTime: timer.RecordAnyTime ?? true,
      RecordAnyChannel: timer.RecordAnyChannel ?? false,
      RecordNewOnly: timer.RecordNewOnly ?? false,
    },
    signal,
  });
}

export async function cancelSeriesTimer(api: JellyfinApi, seriesTimerId: string, signal?: AbortSignal): Promise<void> {
  await api.request<void>(`/LiveTv/SeriesTimers/${encodeURIComponent(seriesTimerId)}`, {
    method: 'DELETE',
    signal,
  });
}
