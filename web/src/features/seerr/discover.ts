import type { ScreenContext, ScreenResult } from '../../core/context';
import type { Route } from '../../core/router';
import { attribute, escapeHtml, query } from '../../core/html';
import { loadSeerrConfig } from '../../core/seerr/config';
import { SeerrClient, seerrTitle, seerrYear, tmdbImage } from '../../core/seerr/client';
import type { SeerrDetails, SeerrMediaType, SeerrPage, SeerrResult } from '../../types/seerr';

const MEDIA_STATUS: Record<number, string> = { 1: 'Inconnu', 2: 'Demandé', 3: 'En cours', 4: 'Partiellement disponible', 5: 'Disponible', 6: 'Supprimé' };

function demoPage(type: SeerrMediaType, query = ''): SeerrPage<SeerrResult> {
  const results = Array.from({ length: 24 }, (_, index) => ({
    id: (type === 'movie' ? 1000 : 2000) + index,
    mediaType: type,
    title: type === 'movie' ? `Film à découvrir ${index + 1}` : undefined,
    name: type === 'tv' ? `Série à découvrir ${index + 1}` : undefined,
    overview: 'Résultat Seerr fictif utilisé pour valider la navigation, les états de disponibilité et les demandes sans contacter un service externe.',
    releaseDate: type === 'movie' ? `${2026 - (index % 20)}-01-01` : undefined,
    firstAirDate: type === 'tv' ? `${2026 - (index % 20)}-01-01` : undefined,
    voteAverage: 6.2 + (index % 25) / 10,
    mediaInfo: index % 7 === 0 ? { status: 5 } : index % 5 === 0 ? { status: 2 } : null,
  } satisfies SeerrResult)).filter((item) => !query || seerrTitle(item).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return { page: 1, totalPages: 1, totalResults: results.length, results };
}

function card(item: SeerrResult, fallbackType: SeerrMediaType): string {
  const type = item.mediaType === 'tv' || item.mediaType === 'movie' ? item.mediaType : fallbackType;
  const poster = tmdbImage(item.posterPath, 'w500');
  const status = item.mediaInfo?.status ? MEDIA_STATUS[item.mediaInfo.status] : '';
  return `<button class="seerr-card" data-seerr-id="${item.id}" data-seerr-type="${type}" data-focusable="true" data-focus-zone="discover-grid" data-focus-row="discover:${type}" data-focus-key="discover:${type}:${item.id}" aria-label="${attribute(seerrTitle(item))}">
    <span class="seerr-poster">${poster ? `<img src="${attribute(poster)}" alt="" loading="lazy" decoding="async" width="342" height="513">` : `<span class="seerr-placeholder"><span>${type === 'movie' ? '🎬' : '📺'}</span><strong>${escapeHtml(seerrTitle(item))}</strong></span>`}${status ? `<span class="seerr-status status-${item.mediaInfo?.status}">${escapeHtml(status)}</span>` : ''}</span>
    <span class="card-title">${escapeHtml(seerrTitle(item))}</span><span class="card-subtitle">${escapeHtml([seerrYear(item), item.voteAverage ? `★ ${item.voteAverage.toFixed(1)}` : ''].filter(Boolean).join(' • '))}</span>
  </button>`;
}

function grid(page: SeerrPage<SeerrResult>, fallbackType: SeerrMediaType): string {
  return page.results.length ? `<div class="seerr-grid">${page.results.map((item) => card(item, fallbackType)).join('')}</div>` : '<div class="empty"><p>Aucun résultat.</p></div>';
}

function clientFor(context: ScreenContext): SeerrClient | null {
  const config = loadSeerrConfig(context.store.profileKey());
  return config ? new SeerrClient(config) : null;
}

export async function renderDiscover(context: ScreenContext, route: Extract<Route, { name: 'discover' }>): Promise<ScreenResult> {
  const type = route.mediaType ?? 'movie';
  const queryText = route.query?.trim() ?? '';
  const client = context.demo ? null : clientFor(context);
  if (!context.demo && !client) {
    return {
      title: 'Découvrir',
      html: '<div class="empty"><div><h2>Seerr n’est pas configuré</h2><p>Ajoute l’adresse et la clé API Seerr dans les paramètres pour découvrir et demander de nouveaux contenus.</p><button class="btn primary" data-route="settings" data-focusable="true" data-focus-initial="true">Configurer Seerr</button></div></div>',
    };
  }
  const initial = context.demo ? demoPage(type, queryText) : queryText ? await client!.search(queryText, 1, 'fr', context.signal) : await client!.discover(type, 1, 'fr', context.signal);
  return {
    title: 'Découvrir',
    html: `<div class="discover-header"><div><span class="eyebrow">Seerr</span><h2>Découvrir de nouveaux contenus</h2><p>${initial.totalResults ?? initial.results.length} résultats</p></div></div>
      <form class="discover-search" id="discover-search"><input class="input" name="q" value="${escapeHtml(queryText)}" placeholder="Rechercher un film ou une série…" data-focusable="true" data-focus-key="discover:search" data-focus-initial="true"><button class="btn primary" data-focusable="true" data-focus-key="discover:submit">Rechercher</button></form>
      <div class="discover-tabs" role="tablist"><button class="chip ${type === 'movie' && !queryText ? 'active' : ''}" data-discover-type="movie" data-focusable="true" data-focus-zone="discover-tabs" data-focus-row="discover-tabs" data-focus-key="discover:movies">Films</button><button class="chip ${type === 'tv' && !queryText ? 'active' : ''}" data-discover-type="tv" data-focusable="true" data-focus-zone="discover-tabs" data-focus-row="discover-tabs" data-focus-key="discover:tv">Séries</button></div>
      <div id="discover-results">${grid(initial, type)}</div>
      ${initial.totalPages > 1 ? `<div class="discover-pagination"><button class="btn" data-discover-more="2" data-discover-more-type="${type}" data-discover-query="${attribute(queryText)}" data-focusable="true" data-focus-key="discover:more">Charger plus</button></div>` : ''}`,
    afterRender: () => {
      const results = query<HTMLElement>(context.root, '#discover-results');
      const form = query<HTMLFormElement>(context.root, '#discover-search');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const q = String(new FormData(form).get('q') ?? '').trim();
        context.router.navigate({ name: 'discover', mediaType: type, query: q || undefined });
      });
      context.root.querySelectorAll<HTMLButtonElement>('[data-discover-type]').forEach((button) => button.addEventListener('click', () => context.router.navigate({ name: 'discover', mediaType: button.dataset.discoverType === 'tv' ? 'tv' : 'movie' })));
      context.root.querySelectorAll<HTMLButtonElement>('[data-seerr-id]').forEach((button) => button.addEventListener('click', () => context.router.navigate({ name: 'discoverItem', mediaType: button.dataset.seerrType === 'tv' ? 'tv' : 'movie', id: Number(button.dataset.seerrId) })));
      context.root.querySelector<HTMLButtonElement>('[data-discover-more]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const page = Number(button.dataset.discoverMore);
        button.disabled = true;
        try {
          const more = context.demo ? { ...demoPage(type, queryText), page, totalPages: page } : queryText ? await client!.search(queryText, page, 'fr', context.signal) : await client!.discover(type, page, 'fr', context.signal);
          results.insertAdjacentHTML('beforeend', more.results.map((item) => card(item, type)).join(''));
          context.root.querySelectorAll<HTMLButtonElement>('[data-seerr-id]').forEach((candidate) => {
            if (candidate.dataset.bound === 'true') return;
            candidate.dataset.bound = 'true';
            candidate.addEventListener('click', () => context.router.navigate({ name: 'discoverItem', mediaType: candidate.dataset.seerrType === 'tv' ? 'tv' : 'movie', id: Number(candidate.dataset.seerrId) }));
          });
          if (page >= more.totalPages) button.remove(); else { button.dataset.discoverMore = String(page + 1); button.disabled = false; }
          context.focus.invalidate();
        } catch (error) { button.disabled = false; context.toast(error instanceof Error ? error.message : 'Chargement Seerr impossible.', 'error'); }
      });
    },
  };
}

function demoDetails(type: SeerrMediaType, id: number): SeerrDetails {
  const item = demoPage(type).results.find((result) => result.id === id) ?? demoPage(type).results[0]!;
  return { ...item, mediaType: type, runtime: type === 'movie' ? 118 : undefined, episodeRunTime: type === 'tv' ? [48] : undefined, tagline: 'Une fiche Seerr de démonstration', genres: [{ id: 1, name: 'Drame' }, { id: 2, name: 'Aventure' }], numberOfSeasons: type === 'tv' ? 4 : undefined, seasons: type === 'tv' ? Array.from({ length: 4 }, (_, index) => ({ id: index + 1, name: `Saison ${index + 1}`, seasonNumber: index + 1, episodeCount: 10 })) : undefined, credits: { cast: Array.from({ length: 8 }, (_, index) => ({ id: index + 1, name: `Interprète ${index + 1}`, character: `Rôle ${index + 1}` })) } };
}

export async function renderDiscoverDetail(context: ScreenContext, route: Extract<Route, { name: 'discoverItem' }>): Promise<ScreenResult> {
  const client = context.demo ? null : clientFor(context);
  if (!context.demo && !client) throw new Error('Seerr n’est pas configuré.');
  const item = context.demo ? demoDetails(route.mediaType, route.id) : await client!.details(route.mediaType, route.id, 'fr', context.signal);
  const title = seerrTitle(item);
  const backdrop = tmdbImage(item.backdropPath, 'original');
  const poster = tmdbImage(item.posterPath, 'w500');
  const available = item.mediaInfo?.status === 5;
  const pending = item.mediaInfo?.status === 2 || item.mediaInfo?.status === 3;
  const status = item.mediaInfo?.status ? MEDIA_STATUS[item.mediaInfo.status] : 'Non demandé';
  const runtime = route.mediaType === 'movie' ? item.runtime : item.episodeRunTime?.[0];
  return {
    title: '',
    html: `<section class="seerr-detail" style="--seerr-backdrop:${backdrop ? `url('${attribute(backdrop)}')` : 'none'}"><div class="seerr-detail-scrim"></div><div class="seerr-detail-content">
      ${poster ? `<img class="seerr-detail-poster" src="${attribute(poster)}" alt="" width="342" height="513">` : ''}
      <div class="seerr-detail-copy"><span class="eyebrow">${route.mediaType === 'movie' ? 'Film' : 'Série'} • Seerr</span><h1>${escapeHtml(title)}</h1><div class="hero-meta"><span>${escapeHtml(seerrYear(item))}</span><span>${runtime ? `${runtime} min` : ''}</span><span>${item.voteAverage ? `★ ${item.voteAverage.toFixed(1)}` : ''}</span><span class="seerr-inline-status status-${item.mediaInfo?.status ?? 0}">${escapeHtml(status)}</span></div>${item.tagline ? `<p class="seerr-tagline">${escapeHtml(item.tagline)}</p>` : ''}<p class="detail-overview">${escapeHtml(item.overview ?? 'Aucun résumé disponible.')}</p><p class="detail-genres">${escapeHtml(item.genres?.map((genre) => genre.name).join(' • ') ?? '')}</p>
      <div class="actions"><button class="btn primary" data-seerr-request="${route.id}" data-seerr-request-type="${route.mediaType}" data-focusable="true" data-focus-key="seerr:request" ${available || pending || context.demo ? 'disabled' : ''}>${available ? '✓ Disponible' : pending ? '⌛ Demande en cours' : context.demo ? 'Demande désactivée en démo' : '＋ Demander'}</button><button class="btn" data-route="discover" data-focusable="true" data-focus-key="seerr:back">Retour à Découvrir</button></div></div></div></section>
      ${route.mediaType === 'tv' && item.seasons?.length ? `<section class="section"><h2>Saisons</h2><div class="seerr-season-list">${item.seasons.filter((season) => season.seasonNumber > 0).map((season) => `<div class="seerr-season"><strong>${escapeHtml(season.name)}</strong><span>${season.episodeCount ?? 0} épisodes</span></div>`).join('')}</div></section>` : ''}
      ${item.credits?.cast?.length ? `<section class="section"><h2>Distribution</h2><div class="seerr-cast">${item.credits.cast.slice(0, 18).map((person) => `<div><span class="seerr-person-photo">${person.profilePath ? `<img src="${attribute(tmdbImage(person.profilePath, 'w342'))}" alt="" loading="lazy">` : '◉'}</span><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.character ?? '')}</small></div>`).join('')}</div></section>` : ''}`,
    afterRender: () => {
      const requestButton = context.root.querySelector<HTMLButtonElement>('[data-seerr-request]');
      requestButton?.addEventListener('click', async () => {
        requestButton.disabled = true;
        requestButton.textContent = 'Envoi de la demande…';
        try {
          await client!.requestMedia(route.mediaType, route.id, route.mediaType === 'tv' ? 'all' : undefined, context.signal);
          requestButton.textContent = '✓ Demande envoyée';
          context.toast('Demande transmise à Seerr.', 'success');
        } catch (error) { requestButton.disabled = false; requestButton.textContent = '＋ Demander'; context.toast(error instanceof Error ? error.message : 'Demande Seerr impossible.', 'error'); }
      });
    },
  };
}
