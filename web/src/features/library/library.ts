import type { ScreenContext, ScreenResult } from '../../core/context';
import type { Route } from '../../core/router';
import { attribute, escapeHtml, query } from '../../core/html';
import { t } from '../../core/i18n';
import { demoItems } from '../../demo/catalog';
import type { JellyfinItem, QueryResult } from '../../types/jellyfin';
import { mediaCard, mediaListItem } from '../../ui/media';
import { VirtualGrid } from '../../ui/virtual/virtualGrid';
import { renderLiveTv } from '../liveTv/liveTv';
import { renderMusic } from '../music/music';
import { renderPhotos } from '../photos/photos';
import {
  clearLibraryPreferences,
  defaultLibraryPreferences,
  loadLibraryPreferences,
  saveLibraryPreferences,
  type LibraryCardSize,
  type LibraryPlayedFilter,
  type LibraryPreferences,
  type LibraryViewMode,
} from './libraryPreferences';

interface FilterPair { Name?: string; Id?: string }
interface QueryFiltersLegacy {
  Genres?: string[];
  Studios?: FilterPair[];
  Years?: number[];
}

function itemTypes(collectionType?: string): string | undefined {
  if (collectionType === 'movies') return 'Movie';
  if (collectionType === 'tvshows') return 'Series';
  if (collectionType === 'boxsets') return 'BoxSet';
  if (collectionType === 'playlists') return 'Playlist';
  if (collectionType === 'music') return 'MusicArtist,MusicAlbum,Audio';
  if (collectionType === 'photos') return 'PhotoAlbum,Photo';
  return undefined;
}

function sortRequest(value: LibraryPreferences['sort']): { sortBy: string; sortOrder: string } {
  if (value === 'year-desc') return { sortBy: 'ProductionYear,SortName', sortOrder: 'Descending' };
  if (value === 'rating-desc') return { sortBy: 'CommunityRating,SortName', sortOrder: 'Descending' };
  if (value === 'date-desc') return { sortBy: 'DateCreated,SortName', sortOrder: 'Descending' };
  return { sortBy: 'SortName', sortOrder: 'Ascending' };
}

function itemFilter(value: LibraryPlayedFilter): string | undefined {
  if (value === 'unplayed') return 'IsUnplayed';
  if (value === 'played') return 'IsPlayed';
  if (value === 'favorite') return 'IsFavorite';
  if (value === 'resumable') return 'IsResumable';
  return undefined;
}

function demoFilter(items: JellyfinItem[], state: LibraryPreferences, searchTerm: string, collectionType?: string): JellyfinItem[] {
  const type = collectionType === 'tvshows' ? 'Series' : collectionType === 'boxsets' ? 'BoxSet' : 'Movie';
  const search = searchTerm.toLocaleLowerCase();
  let filtered = items.filter((item) => item.Type === type && item.Name.toLocaleLowerCase().includes(search));
  if (state.genre) filtered = filtered.filter((item) => item.Genres?.includes(state.genre));
  if (state.studio) filtered = filtered.filter((item) => item.Studios?.some((studio) => (studio.Id || studio.Name) === state.studio));
  if (state.year) filtered = filtered.filter((item) => String(item.ProductionYear ?? '') === state.year);
  if (state.played === 'played') filtered = filtered.filter((item) => item.UserData?.Played);
  if (state.played === 'unplayed') filtered = filtered.filter((item) => !item.UserData?.Played);
  if (state.played === 'favorite') filtered = filtered.filter((item) => item.UserData?.IsFavorite);
  if (state.played === 'resumable') filtered = filtered.filter((item) => (item.UserData?.PlaybackPositionTicks ?? 0) > 0 && !item.UserData?.Played);
  const request = sortRequest(state.sort);
  return [...filtered].sort((a, b) => {
    if (request.sortBy.startsWith('ProductionYear')) return (b.ProductionYear ?? 0) - (a.ProductionYear ?? 0);
    if (request.sortBy.startsWith('CommunityRating')) return (b.CommunityRating ?? 0) - (a.CommunityRating ?? 0);
    if (request.sortBy.startsWith('DateCreated')) return String(b.DateCreated ?? '').localeCompare(String(a.DateCreated ?? ''));
    return a.Name.localeCompare(b.Name);
  });
}

function option(value: string, label: string, selected: string): string {
  return `<option value="${attribute(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function minimumColumnWidth(size: LibraryCardSize, landscape: boolean): number {
  const base = size === 'compact' ? 145 : size === 'large' ? 230 : 180;
  return landscape ? Math.round(base * 1.45) : base;
}

export async function renderLibrary(context: ScreenContext, route: Extract<Route, { name: 'library' }>): Promise<ScreenResult> {
  if (route.collectionType === 'livetv') return renderLiveTv(context, route);
  if (route.collectionType === 'music') return renderMusic(context, route);
  if (route.collectionType === 'photos') return renderPhotos(context, route);

  const appPreferences = context.store.preferences();
  const profileKey = context.store.profileKey();
  let libraryPreferences = loadLibraryPreferences(profileKey, route.parentId, route.collectionType);
  const pageSize = 60;
  const includedTypes = itemTypes(route.collectionType);

  let availableFilters: QueryFiltersLegacy = {};
  if (context.demo) {
    availableFilters = {
      Genres: [...new Set(demoItems.flatMap((item) => item.Genres ?? []))].sort(),
      Studios: [...new Map(demoItems.flatMap((item) => item.Studios ?? []).map((studio) => [studio.Id || studio.Name, studio])).values()],
      Years: [...new Set(demoItems.map((item) => item.ProductionYear).filter((year): year is number => Boolean(year)))].sort((a, b) => b - a),
    };
  } else if (context.api) {
    try {
      availableFilters = await context.api.request<QueryFiltersLegacy>('/Items/Filters', {
        params: {
          UserId: context.api.userId,
          ParentId: route.parentId,
          IncludeItemTypes: includedTypes,
          Recursive: true,
        },
        signal: context.signal,
      });
    } catch {
      availableFilters = {};
    }
  }

  const fetchPage = async (startIndex: number, searchTerm: string, state: LibraryPreferences, signal = context.signal): Promise<QueryResult<JellyfinItem>> => {
    if (context.demo) {
      const filtered = demoFilter(demoItems, state, searchTerm, route.collectionType);
      return { Items: filtered.slice(startIndex, startIndex + pageSize), TotalRecordCount: filtered.length, StartIndex: startIndex };
    }
    if (!context.api) throw new Error('Client Jellyfin indisponible.');
    const request = sortRequest(state.sort);
    return context.api.items({
      parentId: route.parentId,
      includeItemTypes: includedTypes,
      searchTerm: searchTerm || undefined,
      limit: pageSize,
      startIndex,
      sortBy: request.sortBy,
      sortOrder: request.sortOrder,
      filters: itemFilter(state.played),
      genres: state.genre || undefined,
      studios: state.studio || undefined,
      years: state.year || undefined,
      signal,
    });
  };

  const initial = await fetchPage(0, '', libraryPreferences);
  for (const item of initial.Items) context.items.set(item.Id, item);
  if (initial.Items[0]) context.setBackdrop(initial.Items[0]);

  const genreOptions = (availableFilters.Genres ?? []).map((genre) => option(genre, genre, libraryPreferences.genre)).join('');
  const studioOptions = (availableFilters.Studios ?? []).filter((studio) => studio.Name).map((studio) => option(studio.Id || studio.Name || '', studio.Name || '', libraryPreferences.studio)).join('');
  const yearOptions = (availableFilters.Years ?? []).map((year) => option(String(year), String(year), libraryPreferences.year)).join('');

  return {
    title: route.title,
    html: `<div class="library-toolbar panel">
      <div class="library-toolbar-primary">
        <input class="input" id="library-filter" placeholder="${attribute(t('library.search'))}" aria-label="${attribute(t('library.search'))}" data-focusable="true" data-focus-key="library:filter">
        <label><span>${escapeHtml(t('library.sort'))}</span><select id="library-sort" data-focusable="true" data-focus-key="library:sort">
          ${option('name', t('library.sort.name'), libraryPreferences.sort)}${option('date-desc', t('library.sort.recent'), libraryPreferences.sort)}${option('year-desc', t('library.sort.year'), libraryPreferences.sort)}${option('rating-desc', t('library.sort.rating'), libraryPreferences.sort)}
        </select></label>
        <div class="segmented" role="group" aria-label="${attribute(t('library.view'))}">
          <button class="chip ${libraryPreferences.viewMode === 'grid' ? 'active' : ''}" data-library-view="grid" aria-pressed="${libraryPreferences.viewMode === 'grid'}" data-focusable="true" data-focus-key="library:view:grid">▦ ${escapeHtml(t('library.view.grid'))}</button>
          <button class="chip ${libraryPreferences.viewMode === 'list' ? 'active' : ''}" data-library-view="list" aria-pressed="${libraryPreferences.viewMode === 'list'}" data-focusable="true" data-focus-key="library:view:list">☷ ${escapeHtml(t('library.view.list'))}</button>
        </div>
        <span class="result-count" id="library-count">${escapeHtml(t('library.count', { count: initial.TotalRecordCount ?? initial.Items.length }))}</span>
      </div>
      <details class="library-advanced" ${libraryPreferences.genre || libraryPreferences.studio || libraryPreferences.year || libraryPreferences.played !== 'all' ? 'open' : ''}>
        <summary data-focusable="true" data-focus-key="library:advanced">${escapeHtml(t('library.filters'))}</summary>
        <div class="library-filter-grid">
          <label><span>${escapeHtml(t('library.genre'))}</span><select id="library-genre" data-focusable="true" data-focus-key="library:genre">${option('', t('library.all'), libraryPreferences.genre)}${genreOptions}</select></label>
          <label><span>${escapeHtml(t('library.studio'))}</span><select id="library-studio" data-focusable="true" data-focus-key="library:studio">${option('', t('library.all'), libraryPreferences.studio)}${studioOptions}</select></label>
          <label><span>${escapeHtml(t('library.year'))}</span><select id="library-year" data-focusable="true" data-focus-key="library:year">${option('', t('library.all'), libraryPreferences.year)}${yearOptions}</select></label>
          <label><span>${escapeHtml(t('library.played'))}</span><select id="library-played" data-focusable="true" data-focus-key="library:played">
            ${option('all', t('library.all'), libraryPreferences.played)}${option('unplayed', t('library.unplayed'), libraryPreferences.played)}${option('played', t('library.playedOnly'), libraryPreferences.played)}${option('favorite', t('library.favorite'), libraryPreferences.played)}${option('resumable', t('library.resumable'), libraryPreferences.played)}
          </select></label>
          <label><span>${escapeHtml(t('library.image'))}</span><select id="library-image" data-focusable="true" data-focus-key="library:image">${option('poster', t('library.image.poster'), libraryPreferences.imageType)}${option('landscape', t('library.image.landscape'), libraryPreferences.imageType)}</select></label>
          <label><span>${escapeHtml(t('library.size'))}</span><select id="library-size" data-focusable="true" data-focus-key="library:size">${option('compact', t('library.size.compact'), libraryPreferences.cardSize)}${option('comfortable', t('library.size.comfortable'), libraryPreferences.cardSize)}${option('large', t('library.size.large'), libraryPreferences.cardSize)}</select></label>
          <button class="btn" id="library-reset" data-focusable="true" data-focus-key="library:reset">${escapeHtml(t('action.reset'))}</button>
        </div>
      </details>
    </div><div id="library-grid" aria-live="polite"></div>`,
    afterRender: () => {
      const searchInput = query<HTMLInputElement>(context.root, '#library-filter');
      const sort = query<HTMLSelectElement>(context.root, '#library-sort');
      const genre = query<HTMLSelectElement>(context.root, '#library-genre');
      const studio = query<HTMLSelectElement>(context.root, '#library-studio');
      const year = query<HTMLSelectElement>(context.root, '#library-year');
      const played = query<HTMLSelectElement>(context.root, '#library-played');
      const image = query<HTMLSelectElement>(context.root, '#library-image');
      const size = query<HTMLSelectElement>(context.root, '#library-size');
      const container = query<HTMLElement>(context.root, '#library-grid');
      const count = query<HTMLElement>(context.root, '#library-count');
      let loaded = [...initial.Items];
      let total = initial.TotalRecordCount ?? loaded.length;
      let queryController: AbortController | null = null;
      let debounce = 0;
      let grid: VirtualGrid<JellyfinItem> | null = null;

      const persist = () => saveLibraryPreferences(profileKey, route.parentId, libraryPreferences);
      const updateCount = () => { count.textContent = t('library.count', { count: total }); };

      const createGrid = () => {
        grid?.destroy();
        grid = null;
        container.className = '';
        container.removeAttribute('style');
        if (!loaded.length) {
          container.className = 'empty library-empty';
          container.innerHTML = `<p>${escapeHtml(t('library.noMatch', { query: searchInput.value.trim() }))}</p>`;
          context.focus.invalidate();
          return;
        }
        const list = libraryPreferences.viewMode === 'list';
        const landscape = libraryPreferences.imageType === 'landscape';
        const renderItem = (item: JellyfinItem) => list
          ? mediaListItem(item, { api: context.api, demo: context.demo, rowKey: `library:${route.parentId}`, imageWidth: 240 })
          : mediaCard(item, { api: context.api, demo: context.demo, showTitles: appPreferences.showTitles, landscape, rowKey: `library:${route.parentId}`, imageWidth: landscape ? 720 : 480 });
        grid = new VirtualGrid<JellyfinItem>({
          container,
          items: loaded,
          totalCount: total,
          renderItem,
          itemKey: (item) => item.Id,
          signal: context.signal,
          minColumnWidth: list ? 10_000 : minimumColumnWidth(libraryPreferences.cardSize, landscape),
          columnGap: list ? 0 : 16,
          rowGap: list ? 10 : 22,
          rowHeight: list ? () => 104 : (columnWidth) => landscape ? columnWidth * 9 / 16 + 68 + 22 : columnWidth * 1.5 + 68 + 22,
          windowClassName: list ? 'virtual-list-window' : landscape ? 'virtual-landscape-window' : '',
          onRendered: () => context.focus.invalidate(),
          loadMore: async () => {
            const page = await fetchPage(loaded.length, searchInput.value.trim(), libraryPreferences, context.signal);
            loaded = [...loaded, ...page.Items];
            total = page.TotalRecordCount ?? total;
            for (const item of page.Items) context.items.set(item.Id, item);
            updateCount();
            return { items: page.Items, totalCount: total };
          },
        });
      };

      const reload = async () => {
        queryController?.abort();
        queryController = new AbortController();
        const signal = AbortSignal.any([context.signal, queryController.signal]);
        count.textContent = t('state.loading');
        try {
          const page = await fetchPage(0, searchInput.value.trim(), libraryPreferences, signal);
          if (signal.aborted) return;
          loaded = [...page.Items];
          total = page.TotalRecordCount ?? loaded.length;
          context.items.clear();
          for (const item of loaded) context.items.set(item.Id, item);
          updateCount();
          createGrid();
        } catch (error) {
          if (signal.aborted) return;
          grid?.destroy();
          container.className = 'empty library-empty';
          container.innerHTML = `<p>${escapeHtml(error instanceof Error ? error.message : t('state.error'))}</p>`;
        }
      };

      const updateDataPreference = () => {
        libraryPreferences = {
          ...libraryPreferences,
          sort: sort.value as LibraryPreferences['sort'],
          genre: genre.value,
          studio: studio.value,
          year: year.value,
          played: played.value as LibraryPlayedFilter,
        };
        persist();
        void reload();
      };

      searchInput.addEventListener('input', () => {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(() => void reload(), 280);
      }, { signal: context.signal });
      for (const control of [sort, genre, studio, year, played]) control.addEventListener('change', updateDataPreference, { signal: context.signal });
      image.addEventListener('change', () => {
        libraryPreferences = { ...libraryPreferences, imageType: image.value === 'landscape' ? 'landscape' : 'poster' };
        persist();
        createGrid();
      }, { signal: context.signal });
      size.addEventListener('change', () => {
        const value = size.value as LibraryCardSize;
        libraryPreferences = { ...libraryPreferences, cardSize: value };
        persist();
        createGrid();
      }, { signal: context.signal });
      context.root.querySelectorAll<HTMLButtonElement>('[data-library-view]').forEach((button) => button.addEventListener('click', () => {
        const viewMode = button.dataset.libraryView === 'list' ? 'list' : 'grid';
        libraryPreferences = { ...libraryPreferences, viewMode: viewMode as LibraryViewMode };
        persist();
        context.root.querySelectorAll<HTMLButtonElement>('[data-library-view]').forEach((candidate) => {
          const active = candidate.dataset.libraryView === viewMode;
          candidate.classList.toggle('active', active);
          candidate.setAttribute('aria-pressed', String(active));
        });
        createGrid();
      }, { signal: context.signal }));
      query<HTMLButtonElement>(context.root, '#library-reset').addEventListener('click', () => {
        clearLibraryPreferences(profileKey, route.parentId);
        libraryPreferences = defaultLibraryPreferences(route.collectionType);
        context.rerender();
      }, { signal: context.signal });
      context.signal.addEventListener('abort', () => {
        window.clearTimeout(debounce);
        queryController?.abort();
        grid?.destroy();
      }, { once: true });
      createGrid();
    },
  };
}
