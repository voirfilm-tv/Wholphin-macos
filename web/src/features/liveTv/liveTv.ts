import type { ScreenContext, ScreenResult } from '../../core/context';
import type { Route } from '../../core/router';
import { attribute, escapeHtml } from '../../core/html';
import { demoGradient } from '../../demo/catalog';
import type { JellyfinItem, QueryResult } from '../../types/jellyfin';
import { imageUrl, mediaCard } from '../../ui/media';

type LiveTvItem = JellyfinItem & {
  StartDate?: string;
  EndDate?: string;
  ChannelId?: string;
  ChannelName?: string;
  ChannelNumber?: string;
  IsLive?: boolean;
};

interface LiveTvData {
  channels: LiveTvItem[];
  programs: LiveTvItem[];
  recordings: LiveTvItem[];
}

const HOUR = 60 * 60 * 1000;

function demoData(): LiveTvData {
  const now = Date.now();
  const channels: LiveTvItem[] = Array.from({ length: 12 }, (_, index) => ({
    Id: `demo-channel-${index + 1}`,
    Name: `Chaîne ${index + 1}`,
    Type: 'TvChannel',
    ChannelNumber: String(index + 1),
    ImageTags: { Primary: `${['#5b21b6', '#0f766e', '#9f1239'][index % 3]}|#111827` },
  }));
  const programs: LiveTvItem[] = channels.flatMap((channel, channelIndex) => Array.from({ length: 7 }, (_, slot) => {
    const start = now - HOUR + slot * HOUR;
    return {
      Id: `${channel.Id}-program-${slot}`,
      Name: slot === 1 ? `En direct sur ${channel.Name}` : `Programme ${slot + 1}`,
      Type: 'Program',
      ChannelId: channel.Id,
      ChannelName: channel.Name,
      StartDate: new Date(start).toISOString(),
      EndDate: new Date(start + HOUR).toISOString(),
      Overview: 'Programme fictif utilisé uniquement pour valider l’interface Live TV.',
      IsLive: slot === 1 && channelIndex % 3 === 0,
      ImageTags: { Primary: channel.ImageTags?.Primary ?? '' },
    } satisfies LiveTvItem;
  }));
  const recordings: LiveTvItem[] = Array.from({ length: 8 }, (_, index) => ({
    Id: `demo-recording-${index + 1}`,
    Name: `Enregistrement ${index + 1}`,
    Type: 'Recording',
    Overview: 'Enregistrement fictif. La lecture nécessite un serveur Jellyfin réel.',
    RunTimeTicks: (2_700 + index * 300) * 10_000_000,
    ProductionYear: new Date().getFullYear(),
    ImageTags: { Primary: `${['#334155', '#7c2d12', '#0369a1'][index % 3]}|#111827` },
  }));
  return { channels, programs, recordings };
}

function currentProgram(programs: LiveTvItem[], channelId: string, now = Date.now()): LiveTvItem | undefined {
  return programs.find((program) => program.ChannelId === channelId
    && program.StartDate && new Date(program.StartDate).getTime() <= now
    && program.EndDate && new Date(program.EndDate).getTime() > now);
}

function progress(program?: LiveTvItem, now = Date.now()): number {
  if (!program?.StartDate || !program.EndDate) return 0;
  const start = new Date(program.StartDate).getTime();
  const end = new Date(program.EndDate).getTime();
  return Math.max(0, Math.min(100, ((now - start) / Math.max(1, end - start)) * 100));
}

function timeLabel(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function channelLogo(channel: LiveTvItem, context: ScreenContext): string {
  const source = context.demo ? demoGradient(channel) : imageUrl(channel, context.api, false, 'Primary', 240);
  return source
    ? `<img src="${attribute(source)}" alt="" loading="lazy" decoding="async" width="144" height="81">`
    : `<span class="channel-logo-placeholder">${escapeHtml(channel.ChannelNumber ?? channel.Name.slice(0, 2))}</span>`;
}

function renderChannels(data: LiveTvData, context: ScreenContext): string {
  const now = Date.now();
  return `<div class="live-channel-list">${data.channels.map((channel) => {
    const program = currentProgram(data.programs, channel.Id, now);
    const pct = progress(program, now);
    return `<button class="live-channel" data-focusable="true" data-focus-zone="live-channels" data-focus-row="live-channel-list" data-focus-key="channel:${attribute(channel.Id)}" data-play-item="${attribute(channel.Id)}" data-open-item-focus="${attribute(channel.Id)}">
      <span class="channel-logo">${channelLogo(channel, context)}</span>
      <span class="channel-number">${escapeHtml(channel.ChannelNumber ?? '')}</span>
      <span class="channel-copy"><strong>${escapeHtml(channel.Name)}</strong><span>${escapeHtml(program?.Name ?? 'Aucun programme en cours')}</span><small>${program ? `${timeLabel(program.StartDate)} – ${timeLabel(program.EndDate)}` : ''}</small></span>
      <span class="channel-live-action">▶ Regarder</span>
      ${program ? `<span class="channel-progress"><span style="width:${pct.toFixed(2)}%"></span></span>` : ''}
    </button>`;
  }).join('')}</div>`;
}

function renderGuide(data: LiveTvData, context: ScreenContext): string {
  const min = Date.now() - HOUR;
  const max = Date.now() + 6 * HOUR;
  const programsByChannel = new Map<string, LiveTvItem[]>();
  for (const program of data.programs) {
    if (!program.ChannelId) continue;
    programsByChannel.set(program.ChannelId, [...(programsByChannel.get(program.ChannelId) ?? []), program]);
  }
  return `<div class="guide-scroll"><div class="guide-grid">
    <div class="guide-corner">Chaîne</div>
    <div class="guide-times">${Array.from({ length: 8 }, (_, index) => `<span>${timeLabel(new Date(min + index * HOUR).toISOString())}</span>`).join('')}</div>
    ${data.channels.map((channel) => {
      const programs = (programsByChannel.get(channel.Id) ?? []).filter((program) => {
        const start = new Date(program.StartDate ?? 0).getTime();
        const end = new Date(program.EndDate ?? 0).getTime();
        return end > min && start < max;
      });
      return `<div class="guide-channel"><span class="channel-logo small">${channelLogo(channel, context)}</span><strong>${escapeHtml(channel.ChannelNumber ?? '')}</strong></div><div class="guide-track">${programs.map((program) => {
        const start = Math.max(min, new Date(program.StartDate ?? min).getTime());
        const end = Math.min(max, new Date(program.EndDate ?? max).getTime());
        const left = ((start - min) / (max - min)) * 100;
        const width = Math.max(2, ((end - start) / (max - min)) * 100);
        const live = start <= Date.now() && end > Date.now();
        return `<button class="guide-program ${live ? 'airing' : ''}" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%" data-focusable="true" data-focus-zone="live-guide" data-focus-row="guide:${attribute(channel.Id)}" data-focus-key="program:${attribute(program.Id)}" ${live ? `data-play-item="${attribute(channel.Id)}"` : ''} title="${attribute(program.Name)} — ${timeLabel(program.StartDate)} à ${timeLabel(program.EndDate)}"><strong>${escapeHtml(program.Name)}</strong><small>${timeLabel(program.StartDate)}–${timeLabel(program.EndDate)}</small></button>`;
      }).join('')}</div>`;
    }).join('')}
  </div></div>`;
}

function renderRecordings(data: LiveTvData, context: ScreenContext): string {
  if (!data.recordings.length) return '<div class="empty"><div><h2>Aucun enregistrement</h2><p>Les enregistrements créés par Jellyfin apparaîtront ici.</p></div></div>';
  return `<div class="media-grid">${data.recordings.map((item) => mediaCard(item, { api: context.api, demo: context.demo, showTitles: true, rowKey: 'live-recordings', landscape: true })).join('')}</div>`;
}

export async function renderLiveTv(context: ScreenContext, _route: Extract<Route, { name: 'library' }>): Promise<ScreenResult> {
  let data: LiveTvData;
  if (context.demo) {
    data = demoData();
  } else {
    if (!context.api) throw new Error('Client Jellyfin indisponible.');
    const userId = context.api.userId;
    if (!userId) throw new Error('Aucun utilisateur Jellyfin actif.');
    const channelResult = await context.api.request<QueryResult<LiveTvItem>>('/LiveTv/Channels', {
      params: { UserId: userId, Limit: 250, EnableImages: true, ImageTypeLimit: 1, Fields: 'Overview,CurrentProgram,ChannelInfo,PrimaryImageAspectRatio', SortBy: 'SortName', SortOrder: 'Ascending' },
      signal: context.signal,
    });
    const channels = channelResult.Items;
    const now = new Date();
    const [programResult, recordingResult] = await Promise.all([
      channels.length ? context.api.request<QueryResult<LiveTvItem>>('/LiveTv/Programs', {
        params: { UserId: userId, ChannelIds: channels.map((channel) => channel.Id).join(','), MinStartDate: new Date(now.getTime() - HOUR).toISOString(), MaxEndDate: new Date(now.getTime() + 7 * HOUR).toISOString(), Limit: Math.max(500, channels.length * 24), EnableImages: true, ImageTypeLimit: 1, Fields: 'Overview,ChannelInfo,PrimaryImageAspectRatio,Genres', SortBy: 'StartDate', SortOrder: 'Ascending' },
        signal: context.signal,
      }).catch(() => ({ Items: [] })) : Promise.resolve({ Items: [] as LiveTvItem[] }),
      context.api.request<QueryResult<LiveTvItem>>('/LiveTv/Recordings', {
        params: { UserId: userId, Limit: 200, EnableImages: true, ImageTypeLimit: 1, Fields: 'Overview,RunTimeTicks,ChannelInfo,PrimaryImageAspectRatio,MediaSources', SortBy: 'DateCreated', SortOrder: 'Descending' },
        signal: context.signal,
      }).catch(() => ({ Items: [] })),
    ]);
    data = { channels, programs: programResult.Items, recordings: recordingResult.Items };
  }

  for (const item of [...data.channels, ...data.programs, ...data.recordings]) context.items.set(item.Id, item);
  if (data.channels[0]) context.setBackdrop(data.channels[0]);
  if (!data.channels.length) {
    return {
      title: 'Télévision en direct',
      html: '<div class="empty"><div><h2>Aucune chaîne disponible</h2><p>Ce serveur Jellyfin ne renvoie aucune chaîne Live TV. Vérifie la configuration du tuner ou du fournisseur M3U dans l’administration du serveur.</p></div></div>',
    };
  }

  return {
    title: 'Télévision en direct',
    html: `<div class="live-tabs" role="tablist">
      <button class="chip active" role="tab" aria-selected="true" data-live-tab="channels" data-focusable="true" data-focus-zone="live-tabs" data-focus-row="live-tabs" data-focus-key="live:channels">En direct</button>
      <button class="chip" role="tab" aria-selected="false" data-live-tab="guide" data-focusable="true" data-focus-zone="live-tabs" data-focus-row="live-tabs" data-focus-key="live:guide">Guide</button>
      <button class="chip" role="tab" aria-selected="false" data-live-tab="recordings" data-focusable="true" data-focus-zone="live-tabs" data-focus-row="live-tabs" data-focus-key="live:recordings">Enregistrements</button>
    </div>
    <section data-live-panel="channels">${renderChannels(data, context)}</section>
    <section data-live-panel="guide" hidden>${renderGuide(data, context)}</section>
    <section data-live-panel="recordings" hidden>${renderRecordings(data, context)}</section>`,
    afterRender: () => {
      context.root.querySelectorAll<HTMLButtonElement>('[data-live-tab]').forEach((tab) => tab.addEventListener('click', () => {
        const key = tab.dataset.liveTab;
        context.root.querySelectorAll<HTMLButtonElement>('[data-live-tab]').forEach((candidate) => {
          const selected = candidate === tab;
          candidate.classList.toggle('active', selected);
          candidate.setAttribute('aria-selected', String(selected));
        });
        context.root.querySelectorAll<HTMLElement>('[data-live-panel]').forEach((panel) => { panel.hidden = panel.dataset.livePanel !== key; });
        context.focus.invalidate();
        requestAnimationFrame(() => context.root.querySelector<HTMLElement>(`[data-live-panel="${key}"] [data-focusable="true"]`)?.focus());
      }));
    },
  };
}
