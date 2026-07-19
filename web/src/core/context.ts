import type { JellyfinApi } from './api/client';
import type { AppStore } from './storage/store';
import type { Router, Route } from './router';
import type { SpatialNavigation } from './focus/spatialNavigation';
import type { JellyfinItem } from '../types/jellyfin';

export interface ScreenContext {
  root: HTMLElement;
  store: AppStore;
  router: Router;
  focus: SpatialNavigation;
  api: JellyfinApi | null;
  signal: AbortSignal;
  demo: boolean;
  items: Map<string, JellyfinItem>;
  setBackdrop: (item?: JellyfinItem | null) => void;
  toast: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
  play: (item: JellyfinItem) => Promise<void>;
  rerender: () => void;
}

export interface ScreenResult {
  html: string;
  title?: string;
  afterRender?: (context: ScreenContext) => void | Promise<void>;
}

export interface ScreenModule {
  render(context: ScreenContext, route: Route): Promise<ScreenResult> | ScreenResult;
}
