import type { ScreenContext, ScreenResult } from '../../core/context';
import { attribute, escapeHtml, query } from '../../core/html';
import { formatRuntime } from '../../core/time';
import { demoItems } from '../../demo/catalog';
import type { JellyfinItem, QueryResult } from '../../types/jellyfin';
import { imageUrl, mediaRow } from '../../ui/media';
import { openAddToPlaylistDialog, renderPlaylistDetail } from '../playlists/playlists';
import { openRemoteSubtitleDialog } from '../subtitles/remoteSubtitles';

const CHILD_TYPES: Record<string, string | undefined> = {
  BoxSet: 'Movie,Series', Playlist: undefined, CollectionFolder: undefined, Folder: undefined, UserView: undefined,
  MusicAlbum: 'Audio', MusicArtist: 'MusicAlbum,Audio', PhotoAlbum: 'Photo,PhotoAlbum',
};

function syntheticPeople(item: JellyfinItem): JellyfinItem[] {
  return (item.People ?? []).filter((person) => person.Id && person.Name).slice(0, 24).map((person) => ({
    Id: person.Id!, Name: person.Name!, Type: 'Person', Overview: [person.Type, person.Role].filter(Boolean).join(' — '), ImageTags: person.PrimaryImageTag ? { Primary: person.PrimaryImageTag } : undefined,
  }));
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> { try { return await promise; } catch { return fallback; } }

async function childrenFor(context: ScreenContext, item: JellyfinItem): Promise<JellyfinItem[]> {
  if (context.demo) return demoItems.slice(0, 14);
  if (!context.api) return [];
  if (item.Type === 'Person') {
    const result = await context.api.request<QueryResult<JellyfinItem>>(`/Users/${context.api.userId}/Items`, {
      params: { PersonIds: item.Id, Recursive: true, Limit: 80, SortBy: 'ProductionYear,SortName', SortOrder: 'Descending', Fields: 'Overview,RunTimeTicks,Genres,CommunityRating' }, signal: context.signal,
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

function streamSummary(item: JellyfinItem): string[] {
  const source = item.MediaSources?.[0];
  if (!source) return item.MediaSourceCount && item.MediaSourceCount > 1 ? [`${item.MediaSourceCount} versions`] : [];
  const video = source.MediaStreams?.find((stream) => stream.Type === 'Video');
  const audio = source.MediaStreams?.find((stream) => stream.Type === 'Audio');
  const result = [
    video?.DisplayTitle ?? [video?.Height ? `${video.Height}p` : '', video?.Codec?.toUpperCase(), video?.VideoRangeType ?? video?.VideoRange].filter(Boolean).join(' '),
    audio?.DisplayTitle ?? [audio?.Codec?.toUpperCase(), audio?.ChannelLayout].filter(Boolean).join(' '),
    (item.MediaSourceCount ?? item.MediaSources?.length ?? 0) > 1 ? `${item.MediaSourceCount ?? item.MediaSources?.length} versions` : '',
  ].filter((value): value is string => Boolean(value));
  return [...new Set(result)];
}

function directorNames(item: JellyfinItem): string {
  return (item.People ?? [])
    .filter((person) => person.Type?.toLocaleLowerCase() === 'director' && person.Name)
    .map((person) => person.Name!)
    .join(', ');
}

function technicalInfo(item: JellyfinItem): string {
  const source = item.MediaSources?.[0];
  if (!source) return '';
  const streams = source.MediaStreams ?? [];
  const video = streams.find((stream) => stream.Type === 'Video');
  const audio = streams.find((stream) => stream.Type === 'Audio');
  const subtitles = streams.filter((stream) => stream.Type === 'Subtitle').length;
  return `<section class="technical-info"><h2>Informations techniques</h2><div class="info-grid">
    <div class="info-card"><small>Conteneur</small>${escapeHtml(source.Container?.toUpperCase() ?? '—')}</div><div class="info-card"><small>Vidéo</small>${escapeHtml(video?.DisplayTitle ?? video?.Codec?.toUpperCase() ?? '—')}</div><div class="info-card"><small>Audio</small>${escapeHtml(audio?.DisplayTitle ?? audio?.Codec?.toUpperCase() ?? '—')}</div><div class="info-card"><small>Sous-titres</small>${subtitles}</div>
  </div></section>`;
}

export async function renderDetail(context: ScreenContext, id: string): Promise<ScreenResult> {
  const item = context.demo ? demoItems.find((candidate) => candidate.Id === id) : await context.api?.item(id, context.signal);
  if (!item) throw new Error('Contenu introuvable.');
  context.items.set(item.Id, item);
  context.setBackdrop(item);
  if (item.Type === 'Playlist') return renderPlaylistDetail(context, item);

  const people = syntheticPeople(item);
  const [children, extras, similar] = await Promise.all([
    item.Type === 'Series' ? Promise.resolve([]) : safe(childrenFor(context, item), []), extrasFor(context, item), similarFor(context, item),
  ]);
  for (const related of [...people, ...children, ...extras, ...similar]) context.items.set(related.Id, related);

  let seriesSection = '';
  let initialSeasonId = '';
  if (item.Type === 'Series') {
    const seasons = context.demo ? Array.from({ length: 3 }, (_, index) => ({ Id: `${item.Id}-season-${index + 1}`, Name: `Saison ${index + 1}`, Type: 'Season' } satisfies JellyfinItem)) : (await context.api!.seasons(item.Id, context.signal)).Items;
    initialSeasonId = seasons[0]?.Id ?? '';
    seriesSection = `<section class="section series-browser"><div class="season-tabs" role="tablist">${seasons.map((season, index) => `<button class="chip ${index === 0 ? 'active' : ''}" role="tab" aria-selected="${index === 0}" data-season-id="${attribute(season.Id)}" data-focusable="true" data-focus-zone="season-tabs" data-focus-row="season-tabs" data-focus-key="season:${attribute(season.Id)}">${escapeHtml(season.Name)}</button>`).join('')}</div><div id="episode-list"><div class="empty"><div class="loader"></div></div></div></section>`;
  }

  const genres = item.Genres?.join(' • ') ?? '';
  const directors = directorNames(item);
  const streams = streamSummary(item);
  const logo = imageUrl(item, context.api, context.demo, 'Logo', 900);
  const tagline = item.Taglines?.find((value) => value.trim());
  const overview = item.Overview?.trim() || 'Aucun résumé disponible.';
  const overviewExpandable = overview.length > 260;
  const quickDetails = [item.ProductionYear, formatRuntime(item.RunTimeTicks), item.OfficialRating, item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : ''].filter(Boolean);
  const relatedSections = [
    people.length ? mediaRow('Distribution et équipe', `people:${item.Id}`, people, { api: context.api, demo: context.demo, showTitles: true }) : '',
    children.length ? mediaRow(item.Type === 'Person' ? 'Filmographie' : item.Type === 'MusicAlbum' ? 'Titres' : 'Contenu', `children:${item.Id}`, children, { api: context.api, demo: context.demo, showTitles: true }) : '',
    extras.length ? mediaRow('Bonus et contenus spéciaux', `extras:${item.Id}`, extras, { api: context.api, demo: context.demo, showTitles: true, landscape: true }) : '',
    similar.length ? mediaRow('Contenus similaires', `similar:${item.Id}`, similar, { api: context.api, demo: context.demo, showTitles: true }) : '',
  ].join('');
  const canAddToPlaylist = !['Person', 'MusicArtist', 'Photo', 'PhotoAlbum', 'CollectionFolder', 'Folder', 'UserView'].includes(item.Type);
  const canSearchSubtitles = ['Movie', 'Episode', 'Video', 'MusicVideo'].includes(item.Type);
  const playable = ['Movie', 'Episode', 'Video', 'MusicVideo', 'Audio'].includes(item.Type);

  return {
    html: `<section class="detail-layout wholphin-detail"><div class="detail-content">
      <span class="eyebrow">${escapeHtml(item.Type)}</span>
      <div class="detail-title">${logo ? `<img class="detail-logo" src="${attribute(logo)}" alt="${attribute(item.Name)}">` : ''}<h1 class="${logo ? 'visually-hidden' : ''}">${escapeHtml(item.Name)}</h1></div>
      ${quickDetails.length ? `<div class="hero-meta detail-quick-details">${quickDetails.map((detail) => `<span>${escapeHtml(String(detail))}</span>`).join('')}</div>` : ''}
      ${genres ? `<p class="detail-genres">${escapeHtml(genres)}</p>` : ''}
      ${streams.length ? `<div class="detail-streams">${streams.map((stream) => `<span>${escapeHtml(stream)}</span>`).join('')}</div>` : ''}
      ${tagline ? `<p class="detail-tagline">${escapeHtml(tagline)}</p>` : ''}
      <div class="detail-overview-wrap ${overviewExpandable ? 'is-collapsible' : ''}" data-overview-wrap><p class="detail-overview" data-overview>${escapeHtml(overview)}</p>${overviewExpandable ? '<button class="detail-overview-toggle" type="button" data-toggle-overview aria-expanded="false">Lire la suite</button>' : ''}</div>
      ${directors ? `<p class="detail-director">Réalisé par <strong>${escapeHtml(directors)}</strong></p>` : ''}
      <div class="actions detail-actions">${playable ? `<button class="btn primary" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:play" data-play-item="${attribute(item.Id)}">▶ Lire</button>` : ''}
        <button class="btn" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:favorite" data-toggle-favorite="${attribute(item.Id)}">${item.UserData?.IsFavorite ? '♥ Retirer' : '♡ Favori'}</button>
        ${!['Person', 'MusicArtist'].includes(item.Type) ? `<button class="btn" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:watched" data-toggle-watched="${attribute(item.Id)}">${item.UserData?.Played ? '↶ Non vu' : '✓ Vu'}</button>` : ''}
        ${canAddToPlaylist ? `<button class="btn" data-add-to-playlist="${attribute(item.Id)}" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:playlist">＋ Playlist</button>` : ''}
        ${canSearchSubtitles ? `<button class="btn" data-search-subtitles="${attribute(item.Id)}" data-focusable="true" data-focus-zone="detail-actions" data-focus-key="detail:subtitles">CC Sous-titres</button>` : ''}
      </div>
    </div></section>${seriesSection}${relatedSections}${technicalInfo(item)}`,
    afterRender: () => {
      context.root.querySelector<HTMLButtonElement>('[data-toggle-overview]')?.addEventListener('click', (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const wrap = button.closest<HTMLElement>('[data-overview-wrap]');
        const expanded = wrap?.classList.toggle('expanded') ?? false;
        button.setAttribute('aria-expanded', String(expanded));
        button.textContent = expanded ? 'Réduire' : 'Lire la suite';
      }, { signal: context.signal });
      context.root.querySelector<HTMLButtonElement>('[data-add-to-playlist]')?.addEventListener('click', () => void openAddToPlaylistDialog(context, item).catch((error) => context.toast(error instanceof Error ? error.message : 'Playlists indisponibles.', 'error')), { signal: context.signal });
      context.root.querySelector<HTMLButtonElement>('[data-search-subtitles]')?.addEventListener('click', () => openRemoteSubtitleDialog(context, item), { signal: context.signal });
      if (item.Type !== 'Series') return;
      const episodeList = query<HTMLElement>(context.root, '#episode-list');
      let controller: AbortController | null = null;
      const loadSeason = async (seasonId: string) => {
        controller?.abort(); controller = new AbortController();
        const signal = AbortSignal.any([context.signal, controller.signal]);
        episodeList.innerHTML = '<div class="empty"><div class="loader"></div></div>';
        try {
          const episodes = context.demo ? Array.from({ length: 12 }, (_, index) => ({ ...demoItems[index % demoItems.length]!, Id: `${seasonId}-episode-${index + 1}`, Name: `Épisode ${index + 1}`, Type: 'Episode', SeriesName: item.Name, ParentIndexNumber: Number(seasonId.split('-').at(-1)) || 1, IndexNumber: index + 1 })) : (await context.api!.episodes(item.Id, seasonId, signal)).Items;
          if (signal.aborted) return;
          for (const episode of episodes) context.items.set(episode.Id, episode);
          episodeList.innerHTML = mediaRow('Épisodes', `series:${item.Id}:season:${seasonId}`, episodes, { api: context.api, demo: context.demo, showTitles: true, landscape: true });
          context.focus.invalidate();
        } catch (error) {
          if (!signal.aborted) episodeList.innerHTML = `<div class="empty"><p>${escapeHtml(error instanceof Error ? error.message : 'Épisodes indisponibles.')}</p></div>`;
        }
      };
      context.root.querySelectorAll<HTMLButtonElement>('[data-season-id]').forEach((button) => button.addEventListener('click', () => {
        context.root.querySelectorAll('[data-season-id]').forEach((candidate) => { candidate.classList.remove('active'); candidate.setAttribute('aria-selected', 'false'); });
        button.classList.add('active'); button.setAttribute('aria-selected', 'true'); void loadSeason(button.dataset.seasonId!);
      }, { signal: context.signal }));
      if (initialSeasonId) void loadSeason(initialSeasonId);
    },
  };
}
