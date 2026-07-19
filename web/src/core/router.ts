export type Route =
  | { name: 'home' }
  | { name: 'search'; query?: string }
  | { name: 'library'; parentId: string; title: string; collectionType?: string }
  | { name: 'favorites' }
  | { name: 'item'; id: string }
  | { name: 'discover'; mediaType?: 'movie' | 'tv'; query?: string }
  | { name: 'discoverItem'; mediaType: 'movie' | 'tv'; id: number }
  | { name: 'settings' }
  | { name: 'about' }
  | { name: 'diagnostics' };

export function serializeRoute(route: Route): string {
  const params = new URLSearchParams();
  switch (route.name) {
    case 'home': return '#/home';
    case 'favorites': return '#/favorites';
    case 'settings': return '#/settings';
    case 'about': return '#/about';
    case 'diagnostics': return '#/diagnostics';
    case 'search':
      if (route.query) params.set('q', route.query);
      return `#/search${params.size ? `?${params}` : ''}`;
    case 'discover':
      if (route.mediaType) params.set('type', route.mediaType);
      if (route.query) params.set('q', route.query);
      return `#/discover${params.size ? `?${params}` : ''}`;
    case 'discoverItem':
      params.set('type', route.mediaType);
      params.set('id', String(route.id));
      return `#/discover/item?${params}`;
    case 'item':
      params.set('id', route.id);
      return `#/item?${params}`;
    case 'library':
      params.set('parentId', route.parentId);
      params.set('title', route.title);
      if (route.collectionType) params.set('type', route.collectionType);
      return `#/library?${params}`;
  }
}

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const [path = 'home', rawQuery = ''] = clean.split('?');
  const params = new URLSearchParams(rawQuery);
  if (path === 'search') return { name: 'search', query: params.get('q') ?? undefined };
  if (path === 'discover') {
    const type = params.get('type');
    return { name: 'discover', mediaType: type === 'tv' ? 'tv' : type === 'movie' ? 'movie' : undefined, query: params.get('q') ?? undefined };
  }
  if (path === 'discover/item') {
    const type = params.get('type');
    const id = Number(params.get('id'));
    return (type === 'movie' || type === 'tv') && Number.isFinite(id) ? { name: 'discoverItem', mediaType: type, id } : { name: 'discover' };
  }
  if (path === 'favorites') return { name: 'favorites' };
  if (path === 'settings') return { name: 'settings' };
  if (path === 'about') return { name: 'about' };
  if (path === 'diagnostics') return { name: 'diagnostics' };
  if (path === 'item') {
    const id = params.get('id');
    return id ? { name: 'item', id } : { name: 'home' };
  }
  if (path === 'library') {
    const parentId = params.get('parentId');
    return parentId
      ? { name: 'library', parentId, title: params.get('title') ?? 'Bibliothèque', collectionType: params.get('type') ?? undefined }
      : { name: 'home' };
  }
  return { name: 'home' };
}

export class Router extends EventTarget {
  current(): Route { return parseRoute(location.hash); }
  start(): void {
    window.addEventListener('hashchange', () => this.emit());
    if (!location.hash) history.replaceState(null, '', serializeRoute({ name: 'home' }));
    queueMicrotask(() => this.emit());
  }
  navigate(route: Route, replace = false): void {
    const target = serializeRoute(route);
    if (replace) { history.replaceState(null, '', target); this.emit(); }
    else if (location.hash !== target) location.hash = target;
    else this.emit();
  }
  back(): void { history.back(); }
  private emit(): void { this.dispatchEvent(new CustomEvent<Route>('route', { detail: this.current() })); }
}
