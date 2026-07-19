import { attribute, escapeHtml } from '../core/html';
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

function routeActive(route: Route, name: string): boolean {
  return route.name === name;
}

function navButton(options: {
  label: string;
  icon: string;
  route?: string;
  active?: boolean;
  key: string;
  extra?: string;
}): string {
  const { label, icon, route, active, key, extra = '' } = options;
  return `<button class="nav-button ${active ? 'active' : ''}" data-focusable="true" data-focus-zone="drawer" data-focus-row="drawer" data-focus-key="nav:${attribute(key)}" ${route ? `data-route="${attribute(route)}"` : ''} ${extra}>
    <span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${escapeHtml(label)}</span>
  </button>`;
}

export function renderShell(options: ShellOptions): string {
  const { route, title = '', content, session, demo, views, drawerExpanded, showClock } = options;
  const visibleViews = views.slice(0, 5);
  const moreViews = views.slice(5);
  const profileName = demo ? 'Démo' : session?.username ?? 'Utilisateur';
  const serverName = demo ? 'Catalogue fictif' : session?.serverName ?? '';
  return `<div class="app-shell ${drawerExpanded ? 'drawer-expanded' : ''}">
    <div class="backdrop-layer backdrop-current" aria-hidden="true"></div>
    <div class="backdrop-layer backdrop-next" aria-hidden="true"></div>
    <aside class="side-nav" aria-label="Navigation principale">
      <button class="profile-nav" data-focusable="true" data-focus-zone="drawer" data-focus-row="drawer" data-focus-key="nav:profile" data-action="switch-profile">
        <span class="avatar">${escapeHtml(profileName.slice(0, 1).toUpperCase())}</span>
        <span class="profile-copy"><strong>${escapeHtml(profileName)}</strong><small>${escapeHtml(serverName)}</small></span>
      </button>
      <nav class="nav-items">
        ${navButton({ label: 'Recherche', icon: '⌕', route: 'search', active: routeActive(route, 'search'), key: 'search' })}
        ${navButton({ label: 'Accueil', icon: '⌂', route: 'home', active: routeActive(route, 'home'), key: 'home' })}
        ${visibleViews.map((view) => navButton({
          label: view.Name, icon: view.CollectionType === 'movies' ? '▣' : view.CollectionType === 'tvshows' ? '▤' : view.CollectionType === 'music' ? '♫' : view.CollectionType === 'photos' ? '▧' : '□',
          active: route.name === 'library' && route.parentId === view.Id,
          key: `library:${view.Id}`,
          extra: `data-library-id="${attribute(view.Id)}" data-library-title="${attribute(view.Name)}" data-library-type="${attribute(view.CollectionType ?? '')}"`,
        })).join('')}
        ${moreViews.length ? navButton({ label: 'Plus', icon: '⌄', key: 'more', extra: 'data-action="toggle-more"' }) : ''}
        <div class="nav-more" data-nav-more hidden>
          ${moreViews.map((view) => navButton({
            label: view.Name, icon: '□', active: route.name === 'library' && route.parentId === view.Id,
            key: `library:${view.Id}`,
            extra: `data-library-id="${attribute(view.Id)}" data-library-title="${attribute(view.Name)}" data-library-type="${attribute(view.CollectionType ?? '')}"`,
          })).join('')}
        </div>
        ${navButton({ label: 'Favoris', icon: '♥', route: 'favorites', active: routeActive(route, 'favorites'), key: 'favorites' })}
        ${navButton({ label: 'Paramètres', icon: '⚙', route: 'settings', active: routeActive(route, 'settings'), key: 'settings' })}
      </nav>
      ${navButton({ label: 'Déconnexion', icon: '⇥', key: 'logout', extra: 'data-action="logout"' })}
    </aside>
    <main class="main" id="main-content">
      <header class="topbar">
        <h1>${escapeHtml(title)}</h1>
        <div class="top-actions">
          ${showClock ? '<time class="clock" data-clock></time>' : ''}
          <button class="btn icon menu-toggle" data-focusable="true" data-focus-zone="topbar" data-focus-key="topbar:menu" data-action="toggle-drawer" aria-label="Ouvrir le menu">☰</button>
        </div>
      </header>
      <div class="route-content">${content}</div>
    </main>
  </div>`;
}
