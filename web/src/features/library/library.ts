import type { ScreenContext, ScreenResult } from '../../core/context';
import type { Route } from '../../core/router';
import { escapeHtml, query } from '../../core/html';
import { demoItems } from '../../demo/catalog';
import type { JellyfinItem, QueryResult } from '../../types/jellyfin';
import { mediaCard } from '../../ui/media';
import { VirtualGrid } from '../../ui/virtual/virtualGrid';
import { renderLiveTv } from '../liveTv/liveTv';
import { renderMusic } from '../music/music';
import { renderPhotos } from '../photos/photos';

function itemTypes(collectionType?: string): string | undefined {
  if (collectionType === 'movies') return 'Movie';
  if (collectionType === 'tvshows') return 'Series';
  if (collectionType === 'boxsets') return 'BoxSet';
  if (collectionType === 'playlists') return 'Playlist';
  if (collectionType === 'music') return 'MusicArtist,MusicAlbum,Audio';
  if (collectionType === 'photos') return 'PhotoAlbum,Photo';
  return undefined;
}

function sortRequest(value: string): { sortBy: string; sortOrder: string } {
  if (value === 'year-desc') return { sortBy: 'ProductionYear,SortName', sortOrder: 'Descending' };
  if (value === 'rating-desc') return { sortBy: 'CommunityRating,SortName', sortOrder: 'Descending' };
  if (value === 'date-desc') return { sortBy: 'DateCreated,SortName', sortOrder: 'Descending' };
  return { sortBy: 'SortName', sortOrder: 'Ascending' };
}

export async function renderLibrary(context: ScreenContext, route: Extract<Route, { name: 'library' }>): Promise<ScreenResult> {
  if (route.collectionType === 'livetv') return renderLiveTv(context, route);
  if (route.collectionType === 'music') return renderMusic(context, route);
  if (route.collectionType === 'photos') return renderPhotos(context, route);
  const preferences = context.store.preferences();
  const pageSize = 60;
  const fetchPage = async (startIndex: number, searchTerm = '', sort = 'name', signal = context.signal): Promise<QueryResult<JellyfinItem>> => {
    if (context.demo) {
      const type = route.collectionType === 'tvshows' ? 'Series' : 'Movie';
      let filtered = demoItems.filter((item) => item.Type === type && item.Name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()));
      const request = sortRequest(sort);
      filtered = [...filtered].sort((a, b) => {
        if (request.sortBy.startsWith('ProductionYear')) return (b.ProductionYear ?? 0) - (a.ProductionYear ?? 0);
        if (request.sortBy.startsWith('CommunityRating')) return (b.CommunityRating ?? 0) - (a.CommunityRating ?? 0);
        return a.Name.localeCompare(b.Name);
      });
      return { Items: filtered.slice(startIndex, startIndex + pageSize), TotalRecordCount: filtered.length, StartIndex: startIndex };
    }
    if (!context.api) throw new Error('Client Jellyfin indisponible.');
    const request = sortRequest(sort);
    return context.api.items({
      parentId: route.parentId,
      includeItemTypes: itemTypes(route.collectionType),
      searchTerm: searchTerm || undefined,
      limit: pageSize,
      startIndex,
      sortBy: request.sortBy,
      sortOrder: request.sortOrder,
      signal,
    });
  };

  const initial = await fetchPage(0);
  for (const item of initial.Items) context.items.set(item.Id, item);
  if (initial.Items[0]) context.setBackdrop(initial.Items[0]);

  return {
    title: route.title,
    html: `<div class="toolbar">
      <input class="input" id="library-filter" placeholder="Filtrer toute la bibliothèque…" aria-label="Filtrer la bibliothèque" data-focusable="true" data-focus-key="library:filter">
      <select id="library-sort" aria-label="Trier" data-focusable="true" data-focus-key="library:sort"><option value="name">Titre</option><option value="date-desc">Ajout récent</option><option value="year-desc">Année décroissante</option><option value="rating-desc">Note décroissante</option></select>
      <span class="result-count" id="library-count">${initial.TotalRecordCount ?? initial.Items.length} éléments</span>
    </div><div id="library-grid" aria-live="polite"></div>`,
    afterRender: () => {
      const filter = query<HTMLInputElement>(context.root, '#library-filter');
      const sort = query<HTMLSelectElement>(context.root, '#library-sort');
      const container = query<HTMLElement>(context.root, '#library-grid');
      const count = query<HTMLElement>(context.root, '#library-count');
      let loaded = [...initial.Items];
      let total = initial.TotalRecordCount ?? loaded.length;
      let queryController: AbortController | null = null;
      let debounce = 0;

      const renderItem = (item: JellyfinItem) => mediaCard(item, { api: context.api, demo: context.demo, showTitles: preferences.showTitles, rowKey: `library:${route.parentId}` });
      const grid = new VirtualGrid<JellyfinItem>({
        container,
        items: loaded,
        totalCount: total,
        renderItem,
        itemKey: (item) => item.Id,
        signal: context.signal,
        onRendered: () => context.focus.invalidate(),
        loadMore: async () => {
          const page = await fetchPage(loaded.length, filter.value.trim(), sort.value, context.signal);
          loaded = [...loaded, ...page.Items];
          total = page.TotalRecordCount ?? total;
          for (const item of page.Items) context.items.set(item.Id, item);
          count.textContent = `${total} éléments`;
          return { items: page.Items, totalCount: total };
        },
      });

      const reload = async () => {
        queryController?.abort();
        queryController = new AbortController();
        const signal = AbortSignal.any([context.signal, queryController.signal]);
        count.textContent = 'Chargement…';
        try {
          const page = await fetchPage(0, filter.value.trim(), sort.value, signal);
          if (signal.aborted) return;
          loaded = [...page.Items];
          total = page.TotalRecordCount ?? loaded.length;
          context.items.clear();
          for (const item of loaded) context.items.set(item.Id, item);
          count.textContent = `${total} éléments`;
          if (!loaded.length) container.innerHTML = `<div class="empty"><p>Aucun résultat pour « ${escapeHtml(filter.value)} ».</p></div>`;
          grid.setItems(loaded, total);
          context.focus.invalidate();
        } catch (error) {
          if (signal.aborted) return;
          container.innerHTML = `<div class="empty"><p>${escapeHtml(error instanceof Error ? error.message : 'Chargement impossible.')}</p></div>`;
        }
      };
      filter.addEventListener('input', () => {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(() => void reload(), 280);
      });
      sort.addEventListener('change', () => void reload());
    },
  };
}
