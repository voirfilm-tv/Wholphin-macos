import { attribute, escapeHtml } from '../core/html';
import { t } from '../core/i18n';
import type { Route } from '../core/router';
import type { SessionRecord } from '../core/storage/store';
import type { JellyfinItem } from '../types/jellyfin';

export interface ShellOptions {
  route: Route;
  title?: string;
  content: string;
  session: SessionRecord | null;
  demo: boolean;
  views: JellyfinItem[];
  drawerExpanded: boolean;
  showClock: boolean;
}

function routeActive(route: Route, name: string): boolean { return route.name === name; }

function viewIcon(collectionType?: string): string {
  if (collectionType === 'movies') return '▣';
  if (collectionType === 'tvshows') return '▤';
  if (collectionType === 'music') return '♫';
  if (collectionType === 'photos') return '▧';
  if (collectionType === 'livetv') return '◉';
  return '□';
}

function navButton(options: { label: string; icon: string; route?: string; active?: boolean; key: string; extra?: string }): string {
  const { label, icon, route, active, key, extra = '' } = options;
  return `<button class="nav-button ${active ? 'active' : ''}" data-focusable="true" data-focus-zone="drawer" data-focus-row="drawer" data-focus-key="nav:${attribute(key)}" ${route ? `data-route="${attribute(route)}"` : ''} ${extra}><span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${escapeHtml(label)}</span></button>`;
}

function mobileRouteButton(label: string, icon: string, route: string, active: boolean, key: string): string {
  return `<button class="mobile-nav-button ${active ? 'active' : ''}" data-route="${attribute(route)}" data-focusable="true" data-focus-key="mobile:${attribute(key)}"><span aria-hidden="true">${icon}</span><small>${escapeHtml(label)}</small></button>`;
}

function mobileLibraryButton(view: JellyfinItem, route: Route): string {
  const active = route.name === 'library' && route.parentId === view.Id;
  return `<button class="mobile-nav-button ${active ? 'active' : ''}" data-library-id="${attribute(view.Id)}" data-library-title="${attribute(view.Name)}" data-library-type="${attribute(view.CollectionType ?? '')}" data-focusable="true" data-focus-key="mobile:library:${attribute(view.Id)}"><span aria-hidden="true">${viewIcon(view.CollectionType)}</span><small>${escapeHtml(view.Name)}</small></button>`;
}

export function renderShell(options: ShellOptions): string {
  const { route, title = '', content, session, demo, views, drawerExpanded, showClock } = options;
  const visibleViews = views.slice(0, 5);
  const moreViews = views.slice(5);
  const mobileViews = views.filter((view) => ['movies', 'tvshows'].includes(view.CollectionType ?? '')).slice(0, 2);
  const profileName = demo ? (document.documentElement.lang === 'en' ? 'Demo' : 'Démo') : session?.username ?? (document.documentElement.lang === 'en' ? 'User' : 'Utilisateur');
  const serverName = demo ? (document.documentElement.lang === 'en' ? 'Sample catalog' : 'Catalogue fictif') : session?.serverName ?? '';
  return `<div class="app-shell ${drawerExpanded ? 'drawer-expanded' : ''}">
    <div class="backdrop-layer backdrop-current" aria-hidden="true"></div><div class="backdrop-layer backdrop-next" aria-hidden="true"></div>

    <aside class="side-nav" aria-label="Navigation principale">
      <button class="desktop-brand" type="button" data-action="toggle-drawer" data-focusable="true" data-focus-zone="drawer" data-focus-row="drawer" data-focus-key="nav:toggle" aria-label="${drawerExpanded ? 'Réduire' : 'Développer'} le menu"><img src="./assets/icon.svg" alt=""><strong>Wholphin</strong></button>
      <button class="profile-nav" data-focusable="true" data-focus-zone="drawer" data-focus-row="drawer" data-focus-key="nav:profile" data-action="switch-profile"><span class="avatar">${escapeHtml(profileName.slice(0, 1).toUpperCase())}</span><span class="profile-copy"><strong>${escapeHtml(profileName)}</strong><small>${escapeHtml(serverName)}</small></span></button>
      <nav class="nav-items">
        ${navButton({ label: t('nav.search'), icon: '⌕', route: 'search', active: routeActive(route, 'search'), key: 'search' })}
        ${navButton({ label: t('nav.home'), icon: '⌂', route: 'home', active: routeActive(route, 'home'), key: 'home' })}
        ${visibleViews.map((view) => navButton({ label: view.Name, icon: viewIcon(view.CollectionType), active: route.name === 'library' && route.parentId === view.Id, key: `library:${view.Id}`, extra: `data-library-id="${attribute(view.Id)}" data-library-title="${attribute(view.Name)}" data-library-type="${attribute(view.CollectionType ?? '')}"` })).join('')}
        ${moreViews.length ? navButton({ label: t('nav.more'), icon: '⌄', key: 'more', extra: 'data-action="toggle-more"' }) : ''}
        <div class="nav-more" data-nav-more hidden>${moreViews.map((view) => navButton({ label: view.Name, icon: viewIcon(view.CollectionType), active: route.name === 'library' && route.parentId === view.Id, key: `library:${view.Id}`, extra: `data-library-id="${attribute(view.Id)}" data-library-title="${attribute(view.Name)}" data-library-type="${attribute(view.CollectionType ?? '')}"` })).join('')}</div>
        ${navButton({ label: t('nav.favorites'), icon: '♥', route: 'favorites', active: routeActive(route, 'favorites'), key: 'favorites' })}
        ${navButton({ label: t('nav.discover'), icon: '✦', route: 'discover', active: routeActive(route, 'discover') || routeActive(route, 'discoverItem'), key: 'discover' })}
        ${navButton({ label: t('nav.settings'), icon: '⚙', route: 'settings', active: routeActive(route, 'settings'), key: 'settings' })}
      </nav>
      ${navButton({ label: t('nav.logout'), icon: '⇥', key: 'logout', extra: 'data-action="logout"' })}
    </aside>

    <main class="main" id="main-content">
      <header class="topbar">
        <div class="topbar-identity"><img src="./assets/icon.svg" alt=""><div><span>Wholphin Web</span><h1>${escapeHtml(title)}</h1></div></div>
        <div class="top-actions">${showClock ? '<time class="clock" data-clock></time>' : ''}<button class="user-pill" data-action="switch-profile" data-focusable="true" data-focus-key="topbar:profile"><span class="avatar">${escapeHtml(profileName.slice(0, 1).toUpperCase())}</span><span>${escapeHtml(profileName)}</span></button></div>
      </header>
      <div class="route-content">${content}</div>
    </main>

    <nav class="mobile-nav" aria-label="Navigation mobile">
      ${mobileRouteButton(t('nav.home'), '⌂', 'home', routeActive(route, 'home'), 'home')}
      ${mobileRouteButton(t('nav.search'), '⌕', 'search', routeActive(route, 'search'), 'search')}
      ${mobileViews.map((view) => mobileLibraryButton(view, route)).join('')}
      <details class="mobile-more"><summary class="mobile-nav-button"><span aria-hidden="true">•••</span><small>${escapeHtml(t('nav.more'))}</small></summary><div class="mobile-more-sheet panel">
        <div class="mobile-more-header"><span><strong>${escapeHtml(profileName)}</strong><small>${escapeHtml(serverName)}</small></span><button class="btn small" data-action="switch-profile">Changer</button></div>
        <div class="mobile-more-links">${views.map((view) => `<button data-library-id="${attribute(view.Id)}" data-library-title="${attribute(view.Name)}" data-library-type="${attribute(view.CollectionType ?? '')}"><span>${viewIcon(view.CollectionType)}</span>${escapeHtml(view.Name)}</button>`).join('')}<button data-route="favorites"><span>♥</span>${escapeHtml(t('nav.favorites'))}</button><button data-route="discover"><span>✦</span>${escapeHtml(t('nav.discover'))}</button><button data-route="settings"><span>⚙</span>${escapeHtml(t('nav.settings'))}</button><button data-action="logout"><span>⇥</span>${escapeHtml(t('nav.logout'))}</button></div>
      </div></details>
    </nav>
  </div>`;
}
