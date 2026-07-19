import type { JellyfinApi } from '../core/api/client';
import { escapeHtml, attribute } from '../core/html';
import { formatRuntime } from '../core/time';
import { demoGradient } from '../demo/catalog';
import type { JellyfinItem } from '../types/jellyfin';

export interface MediaRenderOptions {
  api: JellyfinApi | null;
  demo: boolean;
  showTitles: boolean;
  landscape?: boolean;
  rowKey?: string;
  imageWidth?: number;
}

export function imageUrl(item: JellyfinItem, api: JellyfinApi | null, demo: boolean, type: 'Primary' | 'Backdrop' = 'Primary', width = 640): string {
  if (demo) return demoGradient(item, type === 'Backdrop');
  if (!api) return '';
  const tag = type === 'Backdrop' ? item.BackdropImageTags?.[0] : item.ImageTags?.[type];
  if (!tag) return '';
  return api.imageUrl(item.Id, { type, maxWidth: width, tag });
}

export function progressPercent(item: JellyfinItem): number {
  if (!item.RunTimeTicks) return 0;
  return Math.min(100, ((item.UserData?.PlaybackPositionTicks ?? 0) / item.RunTimeTicks) * 100);
}

export function mediaCard(item: JellyfinItem, options: MediaRenderOptions): string {
  const { api, demo, showTitles, landscape = false, rowKey = 'grid', imageWidth = 640 } = options;
  const source = imageUrl(item, api, demo, landscape ? 'Backdrop' : 'Primary', imageWidth);
  const progress = progressPercent(item);
  const subtitle = [item.ProductionYear, formatRuntime(item.RunTimeTicks)].filter(Boolean).join(' • ');
  return `<button class="media-card" data-focusable="true" data-focus-zone="content" data-focus-row="${attribute(rowKey)}" data-focus-key="item:${attribute(item.Id)}" data-open-item="${attribute(item.Id)}" aria-label="${attribute(item.Name)}">
    <span class="poster ${landscape ? 'landscape' : ''}">
      ${source ? `<img src="${attribute(source)}" alt="" loading="lazy" decoding="async" width="${landscape ? 640 : 400}" height="${landscape ? 360 : 600}">` : `<span class="poster-placeholder">${escapeHtml(item.Name)}</span>`}
      ${item.UserData?.Played ? '<span class="card-badge">✓ Vu</span>' : ''}
      ${progress > 0 && progress < 95 ? `<span class="card-progress"><span style="width:${progress.toFixed(2)}%"></span></span>` : ''}
    </span>
    ${showTitles ? `<span class="card-title">${escapeHtml(item.Name)}</span><span class="card-subtitle">${escapeHtml(subtitle)}</span>` : ''}
  </button>`;
}

export function mediaRow(title: string, key: string, items: JellyfinItem[], options: Omit<MediaRenderOptions, 'rowKey'>): string {
  if (!items.length) return '';
  return `<section class="section" data-row-section="${attribute(key)}">
    <div class="section-header"><h2>${escapeHtml(title)}</h2></div>
    <div class="media-row" data-focus-zone="content-row">${items.map((item) => mediaCard(item, { ...options, rowKey: key })).join('')}</div>
  </section>`;
}
