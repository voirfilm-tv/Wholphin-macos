const STORAGE_KEY = 'wholphin-web-state-v1';

const defaults = {
  session: null,
  demo: false,
  favorites: [],
  recentSearches: [],
  preferences: {
    accent: '#8b5cf6',
    reducedMotion: false,
    showTitles: true,
    cardShape: 'poster',
    seekSeconds: 10,
    language: 'fr'
  }
};

function safeParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

export const store = {
  state: structuredClone(defaults),
  listeners: new Set(),

  load() {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    this.state = {
      ...structuredClone(defaults),
      ...(saved || {}),
      preferences: { ...defaults.preferences, ...(saved?.preferences || {}) }
    };
    this.applyPreferences();
    return this.state;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.emit();
  },

  set(patch) {
    this.state = { ...this.state, ...patch };
    this.save();
  },

  setPreferences(patch) {
    this.state.preferences = { ...this.state.preferences, ...patch };
    this.applyPreferences();
    this.save();
  },

  applyPreferences() {
    document.documentElement.style.setProperty('--accent', this.state.preferences.accent || defaults.preferences.accent);
    document.documentElement.style.setProperty('--accent-soft', `${this.state.preferences.accent || defaults.preferences.accent}33`);
    document.documentElement.dataset.reducedMotion = String(Boolean(this.state.preferences.reducedMotion));
  },

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  emit() {
    for (const listener of this.listeners) listener(this.state);
  },

  clearSession() {
    this.state.session = null;
    this.state.demo = false;
    this.save();
  },

  addRecentSearch(query) {
    const clean = query.trim();
    if (!clean) return;
    this.state.recentSearches = [clean, ...this.state.recentSearches.filter(item => item !== clean)].slice(0, 8);
    this.save();
  },

  toggleDemoFavorite(id) {
    const has = this.state.favorites.includes(id);
    this.state.favorites = has ? this.state.favorites.filter(item => item !== id) : [...this.state.favorites, id];
    this.save();
    return !has;
  }
};
