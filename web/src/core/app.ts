import { JellyfinApi } from './api/client';
import type { ScreenContext, ScreenResult } from './context';
import { SpatialNavigation, type Direction } from './focus/spatialNavigation';
import { escapeHtml } from './html';
import { Router, type Route, serializeRoute } from './router';
import { AppStore } from './storage/store';
import { demoItems, demoViews } from '../demo/catalog';
import { renderLogin } from '../features/auth/login';
import { renderDetail } from '../features/detail/detail';
import { renderHome } from '../features/home/home';
import { renderFavorites } from '../features/library/favorites';
import { renderLibrary } from '../features/library/library';
import { openPlayer } from '../features/player/player';
import { renderSearch } from '../features/search/search';
import { renderDiscover, renderDiscoverDetail } from '../features/seerr/discover';
import { renderAbout, renderDiagnostics, renderSettings } from '../features/settings/settings';
import type { JellyfinItem } from '../types/jellyfin';
import { imageUrl } from '../ui/media';
import { renderShell } from '../ui/shell';

export class App {
  private readonly store = new AppStore();
  private readonly router = new Router();
  private readonly focus: SpatialNavigation;
  private api: JellyfinApi | null = null;
  private views: JellyfinItem[] = [];
  private items = new Map<string, JellyfinItem>();
  private renderController = new AbortController();
  private drawerExpanded = false;
  private backdropTimer = 0;
  private backdropVersion = 0;
  private clockTimer = 0;

  constructor(private readonly root: HTMLElement) {
    this.focus = new SpatialNavigation({
      root: document.body,
      onBoundary: (direction, active) => this.onFocusBoundary(direction, active),
      onLongPress: (element) => this.openContextMenu(element),
    });
  }

  start(): void {
    this.store.load();
    this.refreshApi();
    this.root.addEventListener('click', (event) => void this.onClick(event));
    this.root.addEventListener('change', (event) => this.onChange(event));
    this.root.addEventListener('focusin', (event) => this.onFocus(event));
    this.router.addEventListener('route', (event) => void this.render((event as CustomEvent<Route>).detail));
    this.store.addEventListener('change', () => this.refreshApi());
    this.focus.start();
    this.router.start();
  }

  private refreshApi(): void {
    const session = this.store.activeSession();
    this.api = session && !this.store.snapshot().demo ? new JellyfinApi(session) : null;
    this.views = [];
  }

  private async getViews(signal: AbortSignal): Promise<JellyfinItem[]> {
    if (this.store.snapshot().demo) return demoViews;
    if (!this.api) return [];
    if (!this.views.length) this.views = (await this.api.views(signal)).Items;
    return this.views;
  }

  private createContext(signal: AbortSignal): ScreenContext {
    return {
      root: this.root,
      store: this.store,
      router: this.router,
      focus: this.focus,
      api: this.api,
      signal,
      demo: this.store.snapshot().demo,
      items: this.items,
      setBackdrop: (item) => this.setBackdrop(item),
      toast: (message, tone) => this.toast(message, tone),
      play: (item) => this.play(item),
      rerender: () => void this.render(this.router.current()),
    };
  }

  private async render(route: Route): Promise<void> {
    this.renderController.abort();
    this.renderController = new AbortController();
    const signal = this.renderController.signal;
    this.items = new Map();
    this.focus.setRouteKey(serializeRoute(route));
    const state = this.store.snapshot();
    if (!state.demo && !this.store.activeSession()) {
      const result = renderLogin(this.createContext(signal));
      this.root.innerHTML = result.html;
      await result.afterRender?.(this.createContext(signal));
      this.focus.invalidate();
      requestAnimationFrame(() => this.focus.focusInitial());
      return;
    }

    let views: JellyfinItem[] = [];
    try { views = await this.getViews(signal); } catch { views = []; }
    this.root.innerHTML = renderShell({
      route,
      title: this.routeTitle(route),
      content: '<div class="empty"><div class="loader"></div></div>',
      session: this.store.activeSession(),
      demo: state.demo,
      views,
      drawerExpanded: this.drawerExpanded,
      showClock: this.store.preferences().showClock,
    });
    this.updateClock();

    try {
      const context = this.createContext(signal);
      const result = await this.renderRoute(context, route);
      if (signal.aborted) return;
      this.root.innerHTML = renderShell({
        route,
        title: result.title ?? this.routeTitle(route),
        content: result.html,
        session: this.store.activeSession(),
        demo: state.demo,
        views,
        drawerExpanded: this.drawerExpanded,
        showClock: this.store.preferences().showClock,
      });
      this.updateClock();
      await result.afterRender?.(this.createContext(signal));
      this.focus.invalidate();
      requestAnimationFrame(() => this.focus.focusInitial());
    } catch (error) {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Erreur inconnue.';
      this.root.innerHTML = renderShell({
        route,
        title: 'Erreur',
        content: `<div class="empty"><div><h2>Impossible d’afficher cette page</h2><p>${escapeHtml(message)}</p><button class="btn" data-focusable="true" data-focus-initial="true" data-route="home">Accueil</button></div></div>`,
        session: this.store.activeSession(),
        demo: state.demo,
        views,
        drawerExpanded: this.drawerExpanded,
        showClock: this.store.preferences().showClock,
      });
      this.focus.invalidate();
      requestAnimationFrame(() => this.focus.focusInitial());
    }
  }

  private renderRoute(context: ScreenContext, route: Route): Promise<ScreenResult> | ScreenResult {
    switch (route.name) {
      case 'home': return renderHome(context);
      case 'search': return renderSearch(context, route);
      case 'library': return renderLibrary(context, route);
      case 'favorites': return renderFavorites(context);
      case 'item': return renderDetail(context, route.id);
      case 'discover': return renderDiscover(context, route);
      case 'discoverItem': return renderDiscoverDetail(context, route);
      case 'settings': return renderSettings(context);
      case 'about': return renderAbout();
      case 'diagnostics': return renderDiagnostics(context);
    }
  }

  private routeTitle(route: Route): string {
    if (route.name === 'library') return route.title;
    return ({
      home: 'Accueil',
      search: 'Recherche',
      favorites: 'Favoris',
      item: '',
      discover: 'Découvrir',
      discoverItem: '',
      settings: 'Paramètres',
      about: 'À propos',
      diagnostics: 'Diagnostics',
    } as Record<Route['name'], string>)[route.name];
  }

  private async onClick(event: MouseEvent): Promise<void> {
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-route],[data-library-id],[data-open-item],[data-play-item],[data-toggle-favorite],[data-toggle-watched],[data-action],[data-activate-session]');
    if (!target) return;
    if (target.dataset.route) {
      this.router.navigate({ name: target.dataset.route as Route['name'] } as Route);
      return;
    }
    if (target.dataset.libraryId) {
      this.router.navigate({
        name: 'library',
        parentId: target.dataset.libraryId,
        title: target.dataset.libraryTitle ?? 'Bibliothèque',
        collectionType: target.dataset.libraryType,
      });
      return;
    }
    if (target.dataset.openItem) {
      this.router.navigate({ name: 'item', id: target.dataset.openItem });
      return;
    }
    if (target.dataset.playItem) {
      const item = await this.resolveItem(target.dataset.playItem);
      if (item) await this.play(item);
      return;
    }
    if (target.dataset.toggleFavorite) {
      await this.toggleFavorite(target.dataset.toggleFavorite, target);
      return;
    }
    if (target.dataset.toggleWatched) {
      await this.toggleWatched(target.dataset.toggleWatched, target);
      return;
    }
    if (target.dataset.activateSession) {
      this.store.activateSession(target.dataset.activateSession);
      this.router.navigate({ name: 'home' }, true);
      return;
    }
    switch (target.dataset.action) {
      case 'toggle-drawer':
        this.setDrawerExpanded(!this.drawerExpanded);
        break;
      case 'toggle-more': {
        const more = this.root.querySelector<HTMLElement>('[data-nav-more]');
        if (more) {
          more.hidden = !more.hidden;
          this.focus.invalidate();
        }
        break;
      }
      case 'logout':
        this.store.logout();
        this.router.navigate({ name: 'home' }, true);
        break;
      case 'copy-diagnostics': {
        const text = this.root.querySelector('#diagnostics-report')?.textContent ?? '';
        await navigator.clipboard.writeText(text);
        this.toast('Rapport copié.', 'success');
        break;
      }
    }
  }

  private onChange(event: Event): void {
    const target = (event.target as Element | null)?.closest<HTMLInputElement | HTMLSelectElement>('[data-preference]');
    if (!target) return;
    const key = target.dataset.preference;
    if (!key) return;
    const value: unknown = target instanceof HTMLInputElement && target.type === 'checkbox'
      ? target.checked
      : ['seekSeconds', 'backdropDelayMs'].includes(key) ? Number(target.value) : target.value;
    this.store.updatePreferences({ [key]: value } as never);
    if (target instanceof HTMLInputElement && target.type === 'range') {
      const output = target.parentElement?.querySelector('output');
      if (output) output.textContent = `${target.value} ms`;
    }
    if (key === 'showClock') void this.render(this.router.current());
  }

  private onFocus(event: FocusEvent): void {
    const element = (event.target as Element | null)?.closest<HTMLElement>('[data-open-item]');
    if (!element?.dataset.openItem) return;
    const item = this.items.get(element.dataset.openItem);
    if (item) this.setBackdrop(item);
  }

  private onFocusBoundary(direction: Direction, active: HTMLElement | null): boolean {
    if (direction === 'left' && active?.dataset.focusZone !== 'drawer') {
      this.setDrawerExpanded(true);
      requestAnimationFrame(() => this.root.querySelector<HTMLElement>('[data-focus-key="nav:home"]')?.focus());
      return true;
    }
    if (direction === 'right' && active?.dataset.focusZone === 'drawer') {
      this.setDrawerExpanded(false);
      requestAnimationFrame(() => this.root.querySelector<HTMLElement>('[data-focus-zone="content"], [data-focus-zone="hero"]')?.focus());
      return true;
    }
    return false;
  }

  private setDrawerExpanded(expanded: boolean): void {
    this.drawerExpanded = expanded;
    this.root.querySelector('.app-shell')?.classList.toggle('drawer-expanded', expanded);
    this.root.querySelector('.side-nav')?.classList.toggle('expanded', expanded);
    this.focus.invalidate();
  }

  private openContextMenu(element: HTMLElement): void {
    const id = element.dataset.openItem;
    if (!id) return;
    const item = this.items.get(id);
    if (!item) return;
    document.querySelector('.context-menu')?.remove();
    const menu = document.createElement('div');
    menu.className = 'context-menu panel';
    menu.innerHTML = `<h2>${escapeHtml(item.Name)}</h2><button class="btn primary" data-play-item="${item.Id}">Lire</button><button class="btn" data-toggle-favorite="${item.Id}">${item.UserData?.IsFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button><button class="btn" data-open-item="${item.Id}">Détails</button><button class="btn" data-action="close-context">Fermer</button>`;
    this.root.append(menu);
    menu.querySelectorAll<HTMLElement>('button').forEach((button) => { button.dataset.focusable = 'true'; });
    menu.addEventListener('click', (event) => {
      if ((event.target as Element).closest('[data-action="close-context"]')) menu.remove();
    });
    menu.querySelector<HTMLElement>('button')?.focus();
    this.focus.invalidate();
  }

  private async resolveItem(id: string): Promise<JellyfinItem | null> {
    const cached = this.items.get(id) ?? (this.store.snapshot().demo ? demoItems.find((item) => item.Id === id) : undefined);
    if (cached) return cached;
    if (!this.api) return null;
    const item = await this.api.item(id);
    this.items.set(id, item);
    return item;
  }

  private async toggleFavorite(id: string, button: HTMLElement): Promise<void> {
    const item = await this.resolveItem(id);
    if (!item) return;
    const next = !item.UserData?.IsFavorite;
    item.UserData = { ...item.UserData, IsFavorite: next };
    button.textContent = next ? '♥ Retirer' : '♡ Favori';
    try {
      if (this.store.snapshot().demo) this.store.toggleDemoFavorite(id);
      else await this.api?.markFavorite(id, next);
      this.toast(next ? 'Ajouté aux favoris.' : 'Retiré des favoris.', 'success');
    } catch (error) {
      item.UserData.IsFavorite = !next;
      button.textContent = !next ? '♥ Retirer' : '♡ Favori';
      this.toast(error instanceof Error ? error.message : 'Action impossible.', 'error');
    }
  }

  private async toggleWatched(id: string, button: HTMLElement): Promise<void> {
    const item = await this.resolveItem(id);
    if (!item) return;
    const next = !item.UserData?.Played;
    item.UserData = { ...item.UserData, Played: next };
    button.textContent = next ? '↶ Non vu' : '✓ Vu';
    try {
      if (!this.store.snapshot().demo) await this.api?.markPlayed(id, next);
      this.toast(next ? 'Marqué comme vu.' : 'Marqué comme non vu.', 'success');
    } catch (error) {
      item.UserData.Played = !next;
      button.textContent = !next ? '↶ Non vu' : '✓ Vu';
      this.toast(error instanceof Error ? error.message : 'Action impossible.', 'error');
    }
  }

  private async findNextEpisode(item: JellyfinItem): Promise<JellyfinItem | null> {
    if (this.store.snapshot().demo || !this.api || item.Type !== 'Episode' || !item.SeriesId) return null;
    const seasons = (await this.api.seasons(item.SeriesId)).Items
      .filter((season) => season.Id)
      .sort((left, right) => (left.IndexNumber ?? 0) - (right.IndexNumber ?? 0));
    let seasonIndex = seasons.findIndex((season) => season.Id === item.SeasonId);
    if (seasonIndex < 0 && item.ParentIndexNumber !== undefined) seasonIndex = seasons.findIndex((season) => season.IndexNumber === item.ParentIndexNumber);
    if (seasonIndex < 0) return null;

    for (let index = seasonIndex; index < seasons.length; index += 1) {
      const season = seasons[index]!;
      const episodes = (await this.api.episodes(item.SeriesId, season.Id)).Items
        .sort((left, right) => (left.IndexNumber ?? 0) - (right.IndexNumber ?? 0));
      if (index === seasonIndex) {
        const currentIndex = episodes.findIndex((episode) => episode.Id === item.Id);
        if (currentIndex >= 0 && episodes[currentIndex + 1]) return episodes[currentIndex + 1]!;
      } else if (episodes[0]) {
        return episodes[0];
      }
    }
    return null;
  }

  private async play(item: JellyfinItem): Promise<void> {
    let nextItem: JellyfinItem | null = null;
    try { nextItem = await this.findNextEpisode(item); } catch { nextItem = null; }
    await openPlayer({
      item,
      api: this.api,
      demo: this.store.snapshot().demo,
      seekSeconds: this.store.preferences().seekSeconds,
      nextItem,
      onPlayNext: (next) => this.play(next),
    });
  }

  private setBackdrop(item?: JellyfinItem | null): void {
    const version = ++this.backdropVersion;
    window.clearTimeout(this.backdropTimer);
    this.backdropTimer = window.setTimeout(() => {
      if (version !== this.backdropVersion) return;
      const current = this.root.querySelector<HTMLElement>('.backdrop-current');
      const next = this.root.querySelector<HTMLElement>('.backdrop-next');
      if (!current || !next) return;
      const source = item
        ? imageUrl(item, this.api, this.store.snapshot().demo, 'Backdrop', 1920) || imageUrl(item, this.api, this.store.snapshot().demo, 'Primary', 1280)
        : '';
      next.style.backgroundImage = source ? `url("${source}")` : '';
      next.classList.add('visible');
      window.setTimeout(() => {
        current.style.backgroundImage = next.style.backgroundImage;
        next.classList.remove('visible');
      }, 320);
    }, this.store.preferences().backdropDelayMs);
  }

  private updateClock(): void {
    window.clearInterval(this.clockTimer);
    const update = () => {
      const element = this.root.querySelector<HTMLTimeElement>('[data-clock]');
      if (!element) return;
      const now = new Date();
      element.dateTime = now.toISOString();
      element.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    update();
    this.clockTimer = window.setInterval(update, 30_000);
  }

  private toast(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral'): void {
    let region = document.querySelector<HTMLElement>('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('aria-live', 'polite');
      document.body.append(region);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 3_200);
  }
}
