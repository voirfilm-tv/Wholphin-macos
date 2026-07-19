import type { ScreenContext, ScreenResult } from '../../core/context';
import { escapeHtml, query } from '../../core/html';
import { formatRuntime } from '../../core/time';
import { demoItems } from '../../demo/catalog';
import type { JellyfinItem, QueryResult } from '../../types/jellyfin';
import { mediaRow } from '../../ui/media';
import { openAddToPlaylistDialog, renderPlaylistDetail } from '../playlists/playlists';

const CHILD_TYPES: Record<string, string | undefined> = {
  BoxSet: 'Movie,Series',
  Playlist: undefined,
  CollectionFolder: undefined,
  Folder: undefined,
  UserView: undefined,
  MusicAlbum: 'Audio',
  MusicArtist: 'MusicAlbum,Audio',
  PhotoAlbum: 'Photo,PhotoAlbum',
};

function syntheticPeople(item: JellyfinItem): JellyfinItem[] {
  return (item.People ?? []).filter((person) => person.Id && person.Name).slice(0, 24).map((person) => ({
    Id: person.Id!,
    Name: person.Name!,
    Type: 'Person',
    Overview: [person.Type, person.Role].filter(Boolean).join(' — '),
    ImageTags: person.PrimaryImageTag ? { Primary: person.PrimaryImageTag } : undefined,
  }));
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try { return await promise; } catch { return fallback; }
}

async function childrenFor(context: ScreenContext, item: JellyfinItem): Promise<JellyfinItem[]> {
  if (context.demo) return demoItems.slice(0, 14);
  if (!context.api) return [];
  if (item.Type === 'Person') {
    const result = await context.api.request<QueryResult<JellyfinItem>>(`/Users/${context.api.userId}/Items`, {
      params: { PersonIds: item.Id, Recursive: true, Limit: 80, SortBy: 'ProductionYear,SortName', SortOrder: 'Descending', Fields: 'Overview,RunTimeTicks,Genres,CommunityRating' },
      signal: context.signal,
    });
    return result.Items;
  }
  const includeItemTypes = CHILD_TYPES[item.Type];
  if (!(item.Type in CHILD_TYPES)) return [];
  return (await context.api.items({ parentId: item.Id, includeItemTypes, limit: 100, sortBy: item.Type === 'MusicAlbum' ? 'IndexNumber' : 'SortName', signal: context.signal })).Items;
}

async function extrasFor(context: ScreenContext, item: JellyfinItem): Promise<JellyfinItem[]> {
  if (context.demo || !context.api || !['Movie', 'Series', 'Episode', 'Video'].includes(item.Type)) return [];
  return safe(context.api.request<JellyfinItem[]>(`/Items/${item.Id}/SpecialFeatures`, { params: { UserId: context.api.userId }, signal: context.signal }), []);
}

async function similarFor(context: ScreenContext, item: JellyfinItem): Promise<JellyfinItem[]> {
  if (context.demo) return demoItems.filter((candidate) => candidate.Id !== item.Id && candidate.Type === item.Type).slice(0, 18);
  if (!context.api || !['Movie', 'Series', 'MusicAlbum', 'MusicArtist'].includes(item.Type)) return [];
  const result = await safe(context.api.request<QueryResult<JellyfinItem>>(`/Items/${item.Id}/Similar`, {
    params: { UserId: context.api.userId, Limit: 18, Fields: 'Overview,RunTimeTicks,Genres,CommunityRating' }, signal: context.signal,
  }), { Items: [] });
  return result.Items;
}

function technicalInfo(item: JellyfinItem): string {
  const source = item.MediaSources?.[0];
  if (!source) return '';
  const streams = source.MediaStreams ?? [];
  const video = streams.find((stream) => stream.Type === 'Video');
  const audio = streams.find((stream) => stream.Type === 'Audio');
  const subtitles = streams.filter((stream) => stream.Type === 'Subtitle').length;
  return `<div class="technical-info"><h2>Informations techniques</h2><div class="info-grid">
    <div class="info-card"><small>Conteneur</small>${escapeHtml(source.Container ?? '—')}</div>
    <div class="info-card"><small>Vidéo</small>${escapeHtml(video?.DisplayTitle ?? video?.Codec ?? '—')}</div>
    <div class="info-card"><small>Audio</small>${escapeHtml(audio?.DisplayTitle ?? audio?.Codec ?? '—')}</div>
    <div class="info-card"><small>Sous-titres</small>${subtitles}</div>
  </div></div>`;
}

export async function renderDetail(context: ScreenContext, id: string): Promise<ScreenResult> {
  const item = context.demo ? demoItems.find((candidate) => candidate.Id === id) : await context.api?.item(id, context.signal);
  if (!item) throw new Error('Contenu introuvable.');
  context.items.set(item.Id, item);
  context.setBackdrop(item);
  if (item.Type === 'Playlist') return renderPlaylistDetail(context, item);

  const people = syntheticPeople(item);
  const [children, extras, similar] = await Promise.all([
    item.Type === 'Series' ? Promise.resolve([]) : safe(childrenFor(context, item), []),
    extrasFor(context, item),
    similarFor(context, item),
  ]);
  for (const related of [...people, ...children, ...extras, ...similar]) context.items.set(related.Id, related);

  let seriesSection = '';
  let initialSeasonId = '';
  if (item.Type === 'Series') {
    const seasons = context.demo
      ? Array.from({ length: 3 }, (_, index) => ({ Id: `${item.Id}-season-${index + 1}`, Name: `Saison ${index + 1}`, Type: 'Season' } satisfies JellyfinItem))
      : (await context.api!.seasons(item.Id, context.signal)).Items;
    initialSeasonId = seasons[0]?.Id ?? '';
    seriesSection = `<section class="section series-browser"><div class="season-tabs" role="tablist">${seasons.map((season, index) => `<button class="chip ${index === 0 ? 'active' : ''}" role="tab" aria-selected="${index === 0}" data-season-id="${escapeHtml(season.Id)}" data-focusable="true" data-focus-zone="season-tabs" data-focus-row="season-tabs" data-focus-key="season:${escapeHtml(season.Id)}">${escapeHtml(season.Name)}</button>`).join('')}</div><div id="episode-list"><div class="empty"><div class="loader"></div></div></div></section>`;
  }

  const genres = item.Genres?.join(' • ') ?? '';
  const relatedSections = [
    people.length ? mediaRow('Distribution et équipe', `people:${item.Id}`, people, { api: context.api, demo: context.demo, showTitles: true }) : '',
    children.length ? mediaRow(item.Type === 'Person' ? 'Filmographie' : item.Type === 'MusicAlbum' ? 'Titres' : 'Contenu', `children:${item.Id}`, children, { api: context.api, demo: context.demo, showTitles: true }) : '',
    extras.length ? mediaRow('Bonus et contenus spéciaux', `extras:${item.Id}`, extras, { api: context.api, demo: context.demo, showTitles: true, landscape: true }) : '',
    similar.length ? mediaRow('Contenus similaires', `similar:${item.Id}`, similar, { api: context.api, demo: context.demo, showTitles: true }) : '',
  ].join('');
  const canAddToPlaylist = !['Person', 'MusicArtist', 'Photo', 'PhotoAlbum', 'CollectionFolder', 'Folder', 'UserView'].includes(item.Type);

  return {
    html: `<section class="detail-layout"><div class="detail-content">
      <span class="eyebrow">${escapeHtml(item.Type)}</span>
      <h1>${escapeHtml(item.Name)}</h1>
      <div class="hero-meta"><span>${item.ProductionYear ?? ''}</span><span>${formatRuntime(item.RunTimeTicks)}</span><span>${escapeHtml(item.OfficialRating ?? '')}</span><span>${item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : ''}</span></div>
      <p class="detail-overview">${escapeHtml(item.Overview ?? 'Aucun résumé disponible.')}</p>
      ${genres ? `<p class="detail-genres">${escapeHtml(genres)}</p>` : ''}
      <div class="actions">
        ${['Movie', 'Episode', 'Video', 'MusicVideo', 'Audio'].includes(item.Type) ? `<button class="btn primary" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:play" data-play-item="${item.Id}">▶ Lire</button>` : ''}
        <button class="btn" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:favorite" data-toggle-favorite="${item.Id}">${item.UserData?.IsFavorite ? '♥ Retirer' : '♡ Favori'}</button>
        ${!['Person', 'MusicArtist'].includes(item.Type) ? `<button class="btn" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:watched" data-toggle-watched="${item.Id}">${item.UserData?.Played ? '↶ Non vu' : '✓ Vu'}</button>` : ''}
        ${canAddToPlaylist ? `<button class="btn" data-add-to-playlist="${item.Id}" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:playlist">＋ Playlist</button>` : ''}
      </div>
    </div></section>${seriesSection}${relatedSections}${technicalInfo(item)}`,
    afterRender: () => {
      context.root.querySelector<HTMLButtonElement>('[data-add-to-playlist]')?.addEventListener('click', () => {
        void openAddToPlaylistDialog(context, item).catch((error) => context.toast(error instanceof Error ? error.message : 'Playlists indisponibles.', 'error'));
      }, { signal: context.signal });
      if (item.Type !== 'Series') return;
      const episodeList = query<HTMLElement>(context.root, '#episode-list');
      let controller: AbortController | null = null;
      const loadSeason = async (seasonId: string) => {
        controller?.abort();
        controller = new AbortController();
        const signal = AbortSignal.any([context.signal, controller.signal]);
        episodeList.innerHTML = '<div class="empty"><div class="loader"></div></div>';
        try {
          const episodes = context.demo
            ? Array.from({ length: 12 }, (_, index) => ({ ...demoItems[index % demoItems.length]!, Id: `${seasonId}-episode-${index + 1}`, Name: `Épisode ${index + 1}`, Type: 'Episode', SeriesName: item.Name, ParentIndexNumber: Number(seasonId.split('-').at(-1)) || 1, IndexNumber: index + 1 }))
            : (await context.api!.episodes(item.Id, seasonId, signal)).Items;
          if (signal.aborted) return;
          for (const episode of episodes) context.items.set(episode.Id, episode);
          episodeList.innerHTML = mediaRow('Épisodes', `series:${item.Id}:season:${seasonId}`, episodes, { api: context.api, demo: context.demo, showTitles: true, landscape: true });
          context.focus.invalidate();
        } catch (error) {
          if (signal.aborted) return;
          episodeList.innerHTML = `<div class="empty"><p>${escapeHtml(error instanceof Error ? error.message : 'Épisodes indisponibles.')}</p></div>`;
        }
      };
      context.root.querySelectorAll<HTMLButtonElement>('[data-season-id]').forEach((button) => button.addEventListener('click', () => {
        context.root.querySelectorAll('[data-season-id]').forEach((candidate) => { candidate.classList.remove('active'); candidate.setAttribute('aria-selected', 'false'); });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        void loadSeason(button.dataset.seasonId!);
      }, { signal: context.signal }));
      if (initialSeasonId) void loadSeason(initialSeasonId);
    },
  };
}
