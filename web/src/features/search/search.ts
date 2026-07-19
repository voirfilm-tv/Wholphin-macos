import type { ScreenContext, ScreenResult } from '../../core/context';
import type { Route } from '../../core/router';
import { escapeHtml, query } from '../../core/html';
import { demoItems } from '../../demo/catalog';
import type { JellyfinItem } from '../../types/jellyfin';
import { mediaRow } from '../../ui/media';

function groupTitle(type: string): string {
  return ({ Movie: 'Films', Series: 'Séries', Episode: 'Épisodes', BoxSet: 'Collections', MusicAlbum: 'Albums', MusicArtist: 'Artistes', Audio: 'Titres' } as Record<string, string>)[type] ?? type;
}

export async function renderSearch(context: ScreenContext, route: Extract<Route, { name: 'search' }>): Promise<ScreenResult> {
  const preferences = context.store.preferences();
  const initial = route.query ?? '';
  const recent = context.store.recentSearches();
  const execute = async (term: string, signal: AbortSignal = context.signal): Promise<JellyfinItem[]> => {
    const clean = term.trim();
    if (!clean) return [];
    context.store.addRecentSearch(clean);
    const result = context.demo
      ? demoItems.filter((item) => item.Name.toLocaleLowerCase().includes(clean.toLocaleLowerCase()) || item.Genres?.some((genre) => genre.toLocaleLowerCase().includes(clean.toLocaleLowerCase())))
      : (await context.api!.search(clean, signal)).Items;
    for (const item of result) context.items.set(item.Id, item);
    return result;
  };
  let initialResults: JellyfinItem[] = [];
  if (initial) initialResults = await execute(initial);
  const grouped = (items: JellyfinItem[]) => {
    const groups = new Map<string, JellyfinItem[]>();
    for (const item of items) groups.set(item.Type, [...(groups.get(item.Type) ?? []), item]);
    return [...groups.entries()].map(([type, values]) => mediaRow(groupTitle(type), `search:${type}`, values, { api: context.api, demo: context.demo, showTitles: preferences.showTitles, landscape: type === 'Episode' })).join('');
  };
  return {
    title: 'Recherche',
    html: `<form class="toolbar search-toolbar" id="search-form">
      <input class="input" id="search-input" name="q" value="${escapeHtml(initial)}" placeholder="Film, série, épisode, artiste…" autocomplete="off" data-focusable="true" data-focus-key="search:input" data-focus-initial="true">
      <button class="btn primary" data-focusable="true" data-focus-key="search:submit">Rechercher</button>
    </form>
    ${recent.length ? `<div class="recent-searches"><span>Récentes</span>${recent.map((value) => `<button class="chip" data-focusable="true" data-focus-key="recent:${escapeHtml(value)}" data-search-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('')}</div>` : ''}
    <div id="search-results">${initialResults.length ? grouped(initialResults) : '<div class="empty"><p>Saisis un terme pour rechercher dans toutes les bibliothèques.</p></div>'}</div>`,
    afterRender: () => {
      const form = query<HTMLFormElement>(context.root, '#search-form');
      const input = query<HTMLInputElement>(context.root, '#search-input');
      const results = query<HTMLElement>(context.root, '#search-results');
      let controller: AbortController | null = null;
      const run = async (term: string) => {
        controller?.abort();
        controller = new AbortController();
        const currentController = controller;
        results.innerHTML = '<div class="empty"><div class="loader"></div></div>';
        try {
          const items = await execute(term, currentController.signal);
          if (currentController.signal.aborted || controller !== currentController) return;
          results.innerHTML = items.length ? grouped(items) : `<div class="empty"><p>Aucun résultat pour « ${escapeHtml(term)} ».</p></div>`;
          context.focus.invalidate();
        } catch (error) {
          if (currentController.signal.aborted || controller !== currentController) return;
          results.innerHTML = `<div class="empty"><p>${escapeHtml(error instanceof Error ? error.message : 'Recherche impossible.')}</p></div>`;
        }
      };
      form.addEventListener('submit', (event) => { event.preventDefault(); void run(input.value); });
      context.root.querySelectorAll<HTMLElement>('[data-search-value]').forEach((button) => button.addEventListener('click', () => {
        input.value = button.dataset.searchValue ?? '';
        void run(input.value);
      }));
    },
  };
}
