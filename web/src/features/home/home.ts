import type { ScreenContext, ScreenResult } from '../../core/context';
import { attribute, escapeHtml } from '../../core/html';
import { formatRuntime } from '../../core/time';
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

const PLAYABLE_TYPES = new Set(['Movie', 'Episode', 'Video', 'MusicVideo', 'Audio', 'TvChannel', 'Recording']);

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

function itemMeta(item?: JellyfinItem): string {
  if (!item) return '';
  return [item.SeriesName, item.ProductionYear, formatRuntime(item.RunTimeTicks), item.OfficialRating].filter(Boolean).join(' • ');
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
    html: `<section class="hero home-hero" data-home-hero><div class="hero-content">
      <span class="eyebrow" data-hero-eyebrow>${context.demo ? 'Démonstration' : 'Jellyfin'}</span>
      <h2 data-hero-title>${escapeHtml(hero?.Name ?? 'Bienvenue')}</h2>
      <div class="hero-meta" data-hero-meta ${itemMeta(hero) ? '' : 'hidden'}>${escapeHtml(itemMeta(hero))}</div>
      <p data-hero-overview>${escapeHtml(hero?.Overview ?? 'Retrouve tes bibliothèques dans une interface web inspirée de Wholphin.')}</p>
      <div class="actions" data-hero-actions ${hero ? '' : 'hidden'}><button class="btn primary" data-focusable="true" data-focus-zone="hero" data-focus-key="hero:play" data-hero-play data-play-item="${attribute(hero?.Id ?? '')}" ${hero && PLAYABLE_TYPES.has(hero.Type) ? '' : 'hidden'}>▶ Lire</button><button class="btn" data-focusable="true" data-focus-zone="hero" data-focus-key="hero:details" data-hero-details data-open-item="${attribute(hero?.Id ?? '')}">Détails</button><button class="btn" data-focusable="true" data-focus-zone="hero" data-focus-key="hero:customize" data-route="settings">Personnaliser</button></div>
    </div></section>
    ${visibleRows.map(({ row, preference }) => mediaRow(row.title, row.key, row.items, { api: context.api, demo: context.demo, showTitles: preference.showTitles && preferences.showTitles, landscape: preference.imageType === 'landscape' || row.defaultLandscape })).join('')}
    ${visibleRows.length ? '' : '<div class="empty"><p>Aucune rangée active ou aucun contenu disponible.</p><button class="btn" data-route="settings" data-focusable="true">Configurer l’accueil</button></div>'}`,
    afterRender: () => {
      const title = context.root.querySelector<HTMLElement>('[data-hero-title]');
      const meta = context.root.querySelector<HTMLElement>('[data-hero-meta]');
      const overview = context.root.querySelector<HTMLElement>('[data-hero-overview]');
      const play = context.root.querySelector<HTMLButtonElement>('[data-hero-play]');
      const details = context.root.querySelector<HTMLButtonElement>('[data-hero-details]');
      let activeId = hero?.Id ?? '';

      const updateHero = (item: JellyfinItem) => {
        if (item.Id === activeId) return;
        activeId = item.Id;
        if (title) title.textContent = item.Name;
        const metadata = itemMeta(item);
        if (meta) { meta.textContent = metadata; meta.hidden = !metadata; }
        if (overview) overview.textContent = item.Overview?.trim() || 'Aucun résumé disponible.';
        if (details) details.dataset.openItem = item.Id;
        if (play) { play.dataset.playItem = item.Id; play.hidden = !PLAYABLE_TYPES.has(item.Type); }
        context.setBackdrop(item);
      };

      context.root.querySelectorAll<HTMLElement>('.media-row [data-open-item]').forEach((card) => {
        const activate = () => {
          const id = card.dataset.openItem;
          const item = id ? context.items.get(id) : undefined;
          if (item) updateHero(item);
        };
        card.addEventListener('focus', activate, { signal: context.signal });
        card.addEventListener('pointerenter', activate, { signal: context.signal });
      });
    },
  };
}
