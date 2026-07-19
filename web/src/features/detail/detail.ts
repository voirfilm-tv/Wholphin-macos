import type { ScreenContext, ScreenResult } from '../../core/context';
import { escapeHtml } from '../../core/html';
import { formatRuntime } from '../../core/time';
import { demoItems } from '../../demo/catalog';
import type { JellyfinItem } from '../../types/jellyfin';
import { mediaRow } from '../../ui/media';

export async function renderDetail(context: ScreenContext, id: string): Promise<ScreenResult> {
  const item = context.demo ? demoItems.find((candidate) => candidate.Id === id) : await context.api?.item(id, context.signal);
  if (!item) throw new Error('Contenu introuvable.');
  context.items.set(item.Id, item);
  context.setBackdrop(item);
  let secondary = '';
  if (item.Type === 'Series') {
    if (context.demo) {
      const episodes: JellyfinItem[] = Array.from({ length: 10 }, (_, index) => ({
        ...demoItems[(index + 2) % demoItems.length]!,
        Id: `${item.Id}-episode-${index + 1}`,
        Name: `Épisode ${index + 1}`,
        Type: 'Episode',
        SeriesName: item.Name,
        ParentIndexNumber: 1,
        IndexNumber: index + 1,
      }));
      for (const episode of episodes) context.items.set(episode.Id, episode);
      secondary = mediaRow('Saison 1', `series:${item.Id}:season:1`, episodes, { api: context.api, demo: true, showTitles: true, landscape: true });
    } else if (context.api) {
      const seasons = (await context.api.seasons(item.Id, context.signal)).Items;
      const firstSeason = seasons[0];
      if (firstSeason) {
        const episodes = (await context.api.episodes(item.Id, firstSeason.Id, context.signal)).Items;
        for (const episode of episodes) context.items.set(episode.Id, episode);
        secondary = mediaRow(firstSeason.Name, `series:${item.Id}:season:${firstSeason.Id}`, episodes, { api: context.api, demo: false, showTitles: true, landscape: true });
      }
    }
  }
  const genres = item.Genres?.join(' • ') ?? '';
  return {
    html: `<section class="detail-layout"><div class="detail-content">
      <span class="eyebrow">${escapeHtml(item.Type)}</span>
      <h1>${escapeHtml(item.Name)}</h1>
      <div class="hero-meta"><span>${item.ProductionYear ?? ''}</span><span>${formatRuntime(item.RunTimeTicks)}</span><span>${item.OfficialRating ?? ''}</span><span>${item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : ''}</span></div>
      <p class="detail-overview">${escapeHtml(item.Overview ?? 'Aucun résumé disponible.')}</p>
      ${genres ? `<p class="detail-genres">${escapeHtml(genres)}</p>` : ''}
      <div class="actions">
        <button class="btn primary" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:play" data-play-item="${item.Id}">▶ Lire</button>
        <button class="btn" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:favorite" data-toggle-favorite="${item.Id}">${item.UserData?.IsFavorite ? '♥ Retirer' : '♡ Favori'}</button>
        <button class="btn" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:watched" data-toggle-watched="${item.Id}">${item.UserData?.Played ? '↶ Non vu' : '✓ Vu'}</button>
      </div>
      <div class="info-grid">
        <div class="info-card"><small>Type</small>${escapeHtml(item.Type)}</div>
        <div class="info-card"><small>Durée</small>${escapeHtml(formatRuntime(item.RunTimeTicks) || 'Inconnue')}</div>
        <div class="info-card"><small>Note</small>${item.CommunityRating?.toFixed(1) ?? '—'}</div>
      </div>
    </div></section>${secondary}`,
  };
}
