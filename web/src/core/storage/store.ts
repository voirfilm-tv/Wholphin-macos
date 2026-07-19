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

function clonePreferences(value?: Partial<Preferences>): Preferences {
  return { ...defaultPreferences, ...(value ?? {}) };
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
    this.save();
    return record;
  }

  removeSession(key: string): void {
    delete this.state.sessions[key];
    delete this.state.preferencesByProfile[key];
    delete this.state.recentSearchesByProfile[key];
    if (this.state.activeSessionKey === key) this.state.activeSessionKey = null;
    this.save();
  }

  activateSession(key: string): void {
    if (!this.state.sessions[key]) throw new Error('Session inconnue.');
    this.state.activeSessionKey = key;
    this.state.demo = false;
    this.save();
  }

  enableDemo(): void {
    this.state.demo = true;
    this.state.activeSessionKey = null;
    this.state.preferencesByProfile.demo ??= clonePreferences();
    this.state.recentSearchesByProfile.demo ??= [];
    this.save();
  }

  logout(): void {
    this.state.activeSessionKey = null;
    this.state.demo = false;
    this.save();
  }

  updatePreferences(patch: Partial<Preferences>): void {
    const key = this.profileKey();
    this.state.preferencesByProfile[key] = { ...this.preferences(), ...patch };
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
    document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
    document.documentElement.dataset.highContrast = String(preferences.highContrast);
  }
}
