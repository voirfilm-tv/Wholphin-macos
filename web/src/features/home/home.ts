import type { ScreenContext, ScreenResult } from '../../core/context';
import { escapeHtml } from '../../core/html';
import { demoRows } from '../../demo/catalog';
import type { JellyfinItem } from '../../types/jellyfin';
import { mediaRow } from '../../ui/media';

export async function renderHome(context: ScreenContext): Promise<ScreenResult> {
  const preferences = context.store.preferences();
  let rows: Array<{ title: string; key: string; items: JellyfinItem[]; landscape?: boolean }>;
  if (context.demo) {
    rows = demoRows();
  } else {
    if (!context.api) throw new Error('Client Jellyfin indisponible.');
    const views = await context.api.views(context.signal);
    const movieView = views.Items.find((view) => view.CollectionType === 'movies');
    const showView = views.Items.find((view) => view.CollectionType === 'tvshows');
    const [resume, next, movies, shows] = await Promise.all([
      context.api.resume(20, context.signal),
      context.api.nextUp(20, context.signal),
      movieView ? context.api.latest(movieView.Id, 'Movie', 20, context.signal) : [],
      showView ? context.api.latest(showView.Id, 'Series', 20, context.signal) : [],
    ]);
    rows = [
      { title: 'Continuer à regarder', key: 'resume', items: resume.Items, landscape: true },
      { title: 'À suivre', key: 'next-up', items: next.Items, landscape: true },
      { title: 'Films récemment ajoutés', key: 'latest-movies', items: movies },
      { title: 'Séries récemment ajoutées', key: 'latest-shows', items: shows },
    ];
  }
  for (const row of rows) for (const item of row.items) context.items.set(item.Id, item);
  const hero = rows.flatMap((row) => row.items)[0];
  if (hero) context.setBackdrop(hero);
  return {
    title: 'Accueil',
    html: `<section class="hero"><div class="hero-content">
      <span class="eyebrow">${context.demo ? 'Démonstration' : 'Jellyfin'}</span>
      <h2>${escapeHtml(hero?.Name ?? 'Bienvenue')}</h2>
      <p>${escapeHtml(hero?.Overview ?? 'Retrouve tes bibliothèques dans une interface conçue pour le grand écran.')}</p>
      ${hero ? `<div class="actions"><button class="btn primary" data-focusable="true" data-focus-zone="hero" data-focus-key="hero:play" data-play-item="${hero.Id}">▶ Lire</button><button class="btn" data-focusable="true" data-focus-zone="hero" data-focus-key="hero:details" data-open-item="${hero.Id}">Détails</button></div>` : ''}
    </div></section>
    ${rows.map((row) => mediaRow(row.title, row.key, row.items, { api: context.api, demo: context.demo, showTitles: preferences.showTitles, landscape: row.landscape })).join('')}`,
  };
}
