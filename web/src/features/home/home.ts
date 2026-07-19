import type { ScreenContext, ScreenResult } from '../../core/context';
import { escapeHtml } from '../../core/html';
import { demoRows, demoViews } from '../../demo/catalog';
import type { JellyfinItem } from '../../types/jellyfin';
import { mediaRow } from '../../ui/media';
import { loadHomeLayout, type HomeRowDefinition } from './homeLayout';

interface HomeRowData {
  key: string;
  title: string;
  items: JellyfinItem[];
  defaultLandscape?: boolean;
}

function latestTypes(view: JellyfinItem): string | undefined {
  if (view.CollectionType === 'movies') return 'Movie';
  if (view.CollectionType === 'tvshows') return 'Series';
  if (view.CollectionType === 'boxsets') return 'BoxSet';
  if (view.CollectionType === 'playlists') return 'Playlist';
  if (view.CollectionType === 'music') return 'MusicAlbum';
  if (view.CollectionType === 'photos') return 'PhotoAlbum,Photo';
  if (view.CollectionType === 'musicvideos') return 'MusicVideo';
  if (view.CollectionType === 'homevideos') return 'Video';
  return undefined;
}

export async function getHomeDefinitions(context: ScreenContext): Promise<HomeRowDefinition[]> {
  const views = context.demo ? demoViews : (await context.api!.views(context.signal)).Items;
  return [
    { key: 'resume', label: 'Continuer à regarder', defaultImageType: 'landscape' },
    { key: 'next-up', label: 'À suivre', defaultImageType: 'landscape' },
    { key: 'favorites', label: 'Favoris', defaultImageType: 'poster' },
    ...views.filter((view) => latestTypes(view)).map((view) => ({ key: `latest:${view.Id}`, label: `Ajouts récents — ${view.Name}`, defaultImageType: view.CollectionType === 'photos' ? 'landscape' as const : 'poster' as const })),
  ];
}

export async function renderHome(context: ScreenContext): Promise<ScreenResult> {
  const preferences = context.store.preferences();
  let rows: HomeRowData[];
  let definitions: HomeRowDefinition[];
  if (context.demo) {
    const demo = demoRows();
    rows = demo.map((row) => ({ key: row.key === 'latest-movies' ? `latest:${demoViews[0]!.Id}` : row.key === 'latest-shows' ? `latest:${demoViews[1]!.Id}` : row.key, title: row.title, items: row.items, defaultLandscape: row.landscape }));
    definitions = await getHomeDefinitions(context);
  } else {
    if (!context.api) throw new Error('Client Jellyfin indisponible.');
    const views = (await context.api.views(context.signal)).Items;
    definitions = await getHomeDefinitions(context);
    const [resumeResult, nextResult, favoritesResult, latestResults] = await Promise.all([
      context.api.resume(30, context.signal),
      context.api.nextUp(30, context.signal),
      context.api.items({ filters: 'IsFavorite', limit: 30, sortBy: 'DateCreated', sortOrder: 'Descending', signal: context.signal }),
      Promise.all(views.filter((view) => latestTypes(view)).map(async (view) => {
        try {
          const result = await context.api!.items({ parentId: view.Id, includeItemTypes: latestTypes(view), limit: 30, sortBy: 'DateCreated', sortOrder: 'Descending', signal: context.signal });
          return { key: `latest:${view.Id}`, title: `Ajouts récents — ${view.Name}`, items: result.Items, defaultLandscape: view.CollectionType === 'photos' } satisfies HomeRowData;
        } catch {
          return { key: `latest:${view.Id}`, title: `Ajouts récents — ${view.Name}`, items: [] } satisfies HomeRowData;
        }
      })),
    ]);
    rows = [
      { key: 'resume', title: 'Continuer à regarder', items: resumeResult.Items, defaultLandscape: true },
      { key: 'next-up', title: 'À suivre', items: nextResult.Items, defaultLandscape: true },
      { key: 'favorites', title: 'Favoris', items: favoritesResult.Items },
      ...latestResults,
    ];
  }

  const byKey = new Map(rows.map((row) => [row.key, row]));
  const layout = loadHomeLayout(context.store.profileKey(), definitions);
  const visibleRows = layout.filter((preference) => preference.enabled).map((preference) => ({ preference, row: byKey.get(preference.key) })).filter((entry): entry is { preference: typeof layout[number]; row: HomeRowData } => Boolean(entry.row?.items.length));
  for (const { row } of visibleRows) for (const item of row.items) context.items.set(item.Id, item);
  const hero = visibleRows.flatMap(({ row }) => row.items)[0];
  if (hero) context.setBackdrop(hero);

  return {
    title: 'Accueil',
    html: `<section class="hero"><div class="hero-content">
      <span class="eyebrow">${context.demo ? 'Démonstration' : 'Jellyfin'}</span>
      <h2>${escapeHtml(hero?.Name ?? 'Bienvenue')}</h2>
      <p>${escapeHtml(hero?.Overview ?? 'Retrouve tes bibliothèques dans une interface conçue pour le grand écran.')}</p>
      ${hero ? `<div class="actions"><button class="btn primary" data-focusable="true" data-focus-zone="hero" data-focus-key="hero:play" data-play-item="${hero.Id}">▶ Lire</button><button class="btn" data-focusable="true" data-focus-zone="hero" data-focus-key="hero:details" data-open-item="${hero.Id}">Détails</button><button class="btn" data-focusable="true" data-focus-zone="hero" data-focus-key="hero:customize" data-route="settings">Personnaliser</button></div>` : ''}
    </div></section>
    ${visibleRows.map(({ row, preference }) => mediaRow(row.title, row.key, row.items, { api: context.api, demo: context.demo, showTitles: preference.showTitles && preferences.showTitles, landscape: preference.imageType === 'landscape' || row.defaultLandscape })).join('')}
    ${visibleRows.length ? '' : '<div class="empty"><p>Aucune rangée active ou aucun contenu disponible.</p><button class="btn" data-route="settings" data-focusable="true">Configurer l’accueil</button></div>'}`,
  };
}
