export interface SessionRecord {
  key: string;
  serverId: string;
  serverUrl: string;
  serverName: string;
  serverVersion?: string;
  userId: string;
  username: string;
  token: string;
  deviceId: string;
}

export interface Preferences {
  accent: string;
  reducedMotion: boolean;
  showTitles: boolean;
  seekSeconds: 5 | 10 | 30;
  language: 'fr' | 'en';
  showClock: boolean;
  backdropDelayMs: number;
  highContrast: boolean;
  subtitleFontScale: 75 | 100 | 125 | 150;
  subtitleColor: string;
  subtitleBackgroundColor: string;
  subtitleBackgroundOpacity: number;
  subtitleEdge: 'none' | 'shadow' | 'outline';
  subtitleBold: boolean;
}

interface LegacyState {
  session?: Partial<SessionRecord> | null;
  demo?: boolean;
  favorites?: string[];
  recentSearches?: string[];
  preferences?: Partial<Preferences>;
}

export interface AppState {
  version: 2;
  activeSessionKey: string | null;
  sessions: Record<string, SessionRecord>;
  demo: boolean;
  demoFavorites: string[];
  preferencesByProfile: Record<string, Preferences>;
  recentSearchesByProfile: Record<string, string[]>;
}

const STORAGE_KEY = 'wholphin-web-state-v2';
const LEGACY_KEY = 'wholphin-web-state-v1';

export const defaultPreferences: Preferences = {
  accent: '#8b5cf6',
  reducedMotion: false,
  showTitles: true,
  seekSeconds: 10,
  language: 'fr',
  showClock: true,
  backdropDelayMs: 160,
  highContrast: false,
  subtitleFontScale: 100,
  subtitleColor: '#ffffff',
  subtitleBackgroundColor: '#000000',
  subtitleBackgroundOpacity: 65,
  subtitleEdge: 'shadow',
  subtitleBold: false,
};

function defaults(): AppState {
  return {
    version: 2,
    activeSessionKey: null,
    sessions: {},
    demo: false,
    demoFavorites: [],
    preferencesByProfile: {},
    recentSearchesByProfile: {},
  };
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

function validHex(value: unknown, fallback: string): string {
  const text = String(value ?? '');
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function clonePreferences(value?: Partial<Preferences>): Preferences {
  const merged = { ...defaultPreferences, ...(value ?? {}) };
  const scales = [75, 100, 125, 150] as const;
  const edges = ['none', 'shadow', 'outline'] as const;
  return {
    ...merged,
    accent: validHex(merged.accent, defaultPreferences.accent),
    subtitleFontScale: scales.includes(merged.subtitleFontScale as (typeof scales)[number]) ? merged.subtitleFontScale : 100,
    subtitleColor: validHex(merged.subtitleColor, '#ffffff'),
    subtitleBackgroundColor: validHex(merged.subtitleBackgroundColor, '#000000'),
    subtitleBackgroundOpacity: Math.max(0, Math.min(100, Number(merged.subtitleBackgroundOpacity) || 0)),
    subtitleEdge: edges.includes(merged.subtitleEdge as (typeof edges)[number]) ? merged.subtitleEdge : 'shadow',
    subtitleBold: Boolean(merged.subtitleBold),
  };
}

function hexToRgba(hex: string, opacity: number): string {
  const value = validHex(hex, '#000000').slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(100, opacity)) / 100})`;
}

function subtitleShadow(edge: Preferences['subtitleEdge']): string {
  if (edge === 'none') return 'none';
  if (edge === 'outline') return '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 4px #000';
  return '0 2px 3px #000, 0 0 5px #000';
}

function migrateLegacy(legacy: LegacyState): AppState {
  const state = defaults();
  state.demo = Boolean(legacy.demo);
  state.demoFavorites = legacy.favorites ?? [];
  const session = legacy.session;
  if (session?.serverUrl && session.userId && session.token) {
    const key = `${session.serverUrl}::${session.userId}`;
    state.sessions[key] = {
      key,
      serverId: session.serverId ?? session.serverUrl,
      serverUrl: session.serverUrl,
      serverName: session.serverName ?? session.serverUrl,
      serverVersion: session.serverVersion,
      userId: session.userId,
      username: session.username ?? 'Utilisateur',
      token: session.token,
      deviceId: session.deviceId ?? crypto.randomUUID(),
    };
    state.activeSessionKey = key;
    state.preferencesByProfile[key] = clonePreferences(legacy.preferences);
    state.recentSearchesByProfile[key] = legacy.recentSearches ?? [];
  } else {
    state.preferencesByProfile.demo = clonePreferences(legacy.preferences);
    state.recentSearchesByProfile.demo = legacy.recentSearches ?? [];
  }
  return state;
}

export class AppStore extends EventTarget {
  private state: AppState = defaults();

  load(): AppState {
    const current = safeParse<AppState>(localStorage.getItem(STORAGE_KEY));
    if (current?.version === 2) {
      this.state = {
        ...defaults(),
        ...current,
        sessions: current.sessions ?? {},
        preferencesByProfile: current.preferencesByProfile ?? {},
        recentSearchesByProfile: current.recentSearchesByProfile ?? {},
      };
    } else {
      const legacy = safeParse<LegacyState>(localStorage.getItem(LEGACY_KEY));
      this.state = legacy ? migrateLegacy(legacy) : defaults();
      this.save();
    }
    this.applyPreferences();
    return this.snapshot();
  }

  snapshot(): AppState {
    return structuredClone(this.state);
  }

  activeSession(): SessionRecord | null {
    return this.state.activeSessionKey ? this.state.sessions[this.state.activeSessionKey] ?? null : null;
  }

  profileKey(): string {
    return this.state.demo ? 'demo' : this.state.activeSessionKey ?? 'anonymous';
  }

  preferences(): Preferences {
    const key = this.profileKey();
    return clonePreferences(this.state.preferencesByProfile[key]);
  }

  setSession(session: Omit<SessionRecord, 'key'>): SessionRecord {
    const key = `${session.serverId || session.serverUrl}::${session.userId}`;
    const record: SessionRecord = { ...session, key };
    this.state.sessions[key] = record;
    this.state.activeSessionKey = key;
    this.state.demo = false;
    this.state.preferencesByProfile[key] ??= clonePreferences();
    this.state.recentSearchesByProfile[key] ??= [];
    this.applyPreferences();
    this.save();
    return record;
  }

  removeSession(key: string): void {
    delete this.state.sessions[key];
    delete this.state.preferencesByProfile[key];
    delete this.state.recentSearchesByProfile[key];
    if (this.state.activeSessionKey === key) this.state.activeSessionKey = null;
    this.applyPreferences();
    this.save();
  }

  activateSession(key: string): void {
    if (!this.state.sessions[key]) throw new Error('Session inconnue.');
    this.state.activeSessionKey = key;
    this.state.demo = false;
    this.applyPreferences();
    this.save();
  }

  enableDemo(): void {
    this.state.demo = true;
    this.state.activeSessionKey = null;
    this.state.preferencesByProfile.demo ??= clonePreferences();
    this.state.recentSearchesByProfile.demo ??= [];
    this.applyPreferences();
    this.save();
  }

  logout(): void {
    this.state.activeSessionKey = null;
    this.state.demo = false;
    this.applyPreferences();
    this.save();
  }

  updatePreferences(patch: Partial<Preferences>): void {
    const key = this.profileKey();
    this.state.preferencesByProfile[key] = clonePreferences({ ...this.preferences(), ...patch });
    this.applyPreferences();
    this.save();
  }

  recentSearches(): string[] {
    return [...(this.state.recentSearchesByProfile[this.profileKey()] ?? [])];
  }

  addRecentSearch(query: string): void {
    const clean = query.trim();
    if (!clean) return;
    const key = this.profileKey();
    const current = this.state.recentSearchesByProfile[key] ?? [];
    this.state.recentSearchesByProfile[key] = [clean, ...current.filter((value) => value !== clean)].slice(0, 8);
    this.save();
  }

  toggleDemoFavorite(id: string): boolean {
    const exists = this.state.demoFavorites.includes(id);
    this.state.demoFavorites = exists
      ? this.state.demoFavorites.filter((value) => value !== id)
      : [...this.state.demoFavorites, id];
    this.save();
    return !exists;
  }

  isDemoFavorite(id: string): boolean {
    return this.state.demoFavorites.includes(id);
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.dispatchEvent(new CustomEvent('change', { detail: this.snapshot() }));
  }

  private applyPreferences(): void {
    const preferences = this.preferences();
    document.documentElement.style.setProperty('--accent', preferences.accent);
    document.documentElement.style.setProperty('--accent-soft', `${preferences.accent}33`);
    document.documentElement.style.setProperty('--subtitle-font-size', `${preferences.subtitleFontScale}%`);
    document.documentElement.style.setProperty('--subtitle-color', preferences.subtitleColor);
    document.documentElement.style.setProperty('--subtitle-background', hexToRgba(preferences.subtitleBackgroundColor, preferences.subtitleBackgroundOpacity));
    document.documentElement.style.setProperty('--subtitle-shadow', subtitleShadow(preferences.subtitleEdge));
    document.documentElement.style.setProperty('--subtitle-weight', preferences.subtitleBold ? '700' : '500');
    document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
    document.documentElement.dataset.highContrast = String(preferences.highContrast);
  }
}
