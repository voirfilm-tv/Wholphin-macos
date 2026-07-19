import type { ScreenContext, ScreenResult } from '../../core/context';
import type { Route } from '../../core/router';
import { escapeHtml, query } from '../../core/html';
import { demoItems } from '../../demo/catalog';
import type { JellyfinItem } from '../../types/jellyfin';
import { mediaCard } from '../../ui/media';

function itemTypes(collectionType?: string): string | undefined {
  if (collectionType === 'movies') return 'Movie';
  if (collectionType === 'tvshows') return 'Series';
  if (collectionType === 'boxsets') return 'BoxSet';
  if (collectionType === 'playlists') return 'Playlist';
  if (collectionType === 'music') return 'MusicArtist,MusicAlbum,Audio';
  if (collectionType === 'photos') return 'PhotoAlbum,Photo';
  return undefined;
}

export async function renderLibrary(context: ScreenContext, route: Extract<Route, { name: 'library' }>): Promise<ScreenResult> {
  const preferences = context.store.preferences();
  let items: JellyfinItem[];
  if (context.demo) {
    items = route.collectionType === 'tvshows'
      ? demoItems.filter((item) => item.Type === 'Series')
      : demoItems.filter((item) => item.Type === 'Movie');
  } else {
    if (!context.api) throw new Error('Client Jellyfin indisponible.');
    items = (await context.api.items({ parentId: route.parentId, includeItemTypes: itemTypes(route.collectionType), limit: 200, signal: context.signal })).Items;
  }
  for (const item of items) context.items.set(item.Id, item);
  if (items[0]) context.setBackdrop(items[0]);
  const renderGrid = (list: JellyfinItem[]) => list.map((item) => mediaCard(item, { api: context.api, demo: context.demo, showTitles: preferences.showTitles, rowKey: `library:${route.parentId}` })).join('');
  return {
    title: route.title,
    html: `<div class="toolbar">
      <input class="input" id="library-filter" placeholder="Filtrer…" aria-label="Filtrer la bibliothèque" data-focusable="true" data-focus-key="library:filter">
      <select id="library-sort" aria-label="Trier" data-focusable="true" data-focus-key="library:sort"><option value="name">Titre</option><option value="year-desc">Année décroissante</option><option value="rating-desc">Note décroissante</option></select>
    </div><div class="media-grid" id="library-grid">${renderGrid(items)}</div>`,
    afterRender: () => {
      const filter = query<HTMLInputElement>(context.root, '#library-filter');
      const sort = query<HTMLSelectElement>(context.root, '#library-sort');
      const grid = query<HTMLElement>(context.root, '#library-grid');
      const update = () => {
        const term = filter.value.trim().toLocaleLowerCase();
        const filtered = items.filter((item) => item.Name.toLocaleLowerCase().includes(term));
        if (sort.value === 'year-desc') filtered.sort((a, b) => (b.ProductionYear ?? 0) - (a.ProductionYear ?? 0));
        else if (sort.value === 'rating-desc') filtered.sort((a, b) => (b.CommunityRating ?? 0) - (a.CommunityRating ?? 0));
        else filtered.sort((a, b) => a.Name.localeCompare(b.Name));
        grid.innerHTML = filtered.length ? renderGrid(filtered) : `<div class="empty"><p>Aucun résultat pour « ${escapeHtml(filter.value)} ».</p></div>`;
        context.focus.invalidate();
      };
      filter.addEventListener('input', update);
      sort.addEventListener('change', update);
    },
  };
}
