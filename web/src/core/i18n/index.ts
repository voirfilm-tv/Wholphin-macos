export type Locale = 'fr' | 'en';

export type TranslationKey =
  | 'app.name' | 'nav.search' | 'nav.home' | 'nav.more' | 'nav.favorites' | 'nav.discover' | 'nav.settings' | 'nav.logout'
  | 'route.error' | 'route.home' | 'route.search' | 'route.favorites' | 'route.discover' | 'route.settings' | 'route.about' | 'route.diagnostics'
  | 'action.close' | 'action.back' | 'action.play' | 'action.pause' | 'action.details' | 'action.search' | 'action.cancel' | 'action.save' | 'action.remove' | 'action.configure' | 'action.reset'
  | 'state.loading' | 'state.noResults' | 'state.error'
  | 'auth.title' | 'auth.description' | 'auth.server' | 'auth.username' | 'auth.password' | 'auth.login' | 'auth.quickConnect' | 'auth.demo' | 'auth.savedProfiles' | 'auth.unlock' | 'auth.pinPrompt'
  | 'settings.language' | 'settings.interface' | 'settings.playback' | 'settings.home' | 'settings.server' | 'settings.profileLock'
  | 'library.search' | 'library.sort' | 'library.sort.name' | 'library.sort.recent' | 'library.sort.year' | 'library.sort.rating'
  | 'library.view' | 'library.view.grid' | 'library.view.list' | 'library.image' | 'library.image.poster' | 'library.image.landscape'
  | 'library.size' | 'library.size.compact' | 'library.size.comfortable' | 'library.size.large'
  | 'library.filters' | 'library.genre' | 'library.studio' | 'library.year' | 'library.played' | 'library.all'
  | 'library.unplayed' | 'library.playedOnly' | 'library.favorite' | 'library.resumable' | 'library.count' | 'library.noMatch';

type Dictionary = Record<TranslationKey, string>;

const dictionaries: Record<Locale, Dictionary> = {
  fr: {
    'app.name': 'Wholphin Web', 'nav.search': 'Recherche', 'nav.home': 'Accueil', 'nav.more': 'Plus', 'nav.favorites': 'Favoris', 'nav.discover': 'Découvrir', 'nav.settings': 'Paramètres', 'nav.logout': 'Déconnexion',
    'route.error': 'Erreur', 'route.home': 'Accueil', 'route.search': 'Recherche', 'route.favorites': 'Favoris', 'route.discover': 'Découvrir', 'route.settings': 'Paramètres', 'route.about': 'À propos', 'route.diagnostics': 'Diagnostics',
    'action.close': 'Fermer', 'action.back': 'Retour', 'action.play': 'Lire', 'action.pause': 'Pause', 'action.details': 'Détails', 'action.search': 'Rechercher', 'action.cancel': 'Annuler', 'action.save': 'Enregistrer', 'action.remove': 'Supprimer', 'action.configure': 'Configurer', 'action.reset': 'Réinitialiser',
    'state.loading': 'Chargement…', 'state.noResults': 'Aucun résultat.', 'state.error': 'Une erreur est survenue.',
    'auth.title': 'Wholphin Web', 'auth.description': 'Connecte un serveur Jellyfin. Le jeton d’accès est conservé dans le stockage local de ce navigateur.', 'auth.server': 'Serveur', 'auth.username': 'Utilisateur', 'auth.password': 'Mot de passe', 'auth.login': 'Connexion', 'auth.quickConnect': 'Quick Connect', 'auth.demo': 'Mode démo', 'auth.savedProfiles': 'Profils enregistrés', 'auth.unlock': 'Déverrouiller', 'auth.pinPrompt': 'Entre le PIN local de ce profil.',
    'settings.language': 'Langue', 'settings.interface': 'Interface', 'settings.playback': 'Lecture', 'settings.home': 'Accueil', 'settings.server': 'Serveur', 'settings.profileLock': 'Verrouillage du profil',
    'library.search': 'Rechercher dans la bibliothèque', 'library.sort': 'Tri', 'library.sort.name': 'Titre', 'library.sort.recent': 'Ajout récent', 'library.sort.year': 'Année décroissante', 'library.sort.rating': 'Note décroissante',
    'library.view': 'Affichage', 'library.view.grid': 'Grille', 'library.view.list': 'Liste', 'library.image': 'Images', 'library.image.poster': 'Poster', 'library.image.landscape': 'Paysage',
    'library.size': 'Taille', 'library.size.compact': 'Compacte', 'library.size.comfortable': 'Normale', 'library.size.large': 'Grande',
    'library.filters': 'Filtres', 'library.genre': 'Genre', 'library.studio': 'Studio', 'library.year': 'Année', 'library.played': 'État', 'library.all': 'Tous',
    'library.unplayed': 'Non vus', 'library.playedOnly': 'Vus', 'library.favorite': 'Favoris', 'library.resumable': 'En cours', 'library.count': '{count} éléments', 'library.noMatch': 'Aucun résultat pour « {query} ».',
  },
  en: {
    'app.name': 'Wholphin Web', 'nav.search': 'Search', 'nav.home': 'Home', 'nav.more': 'More', 'nav.favorites': 'Favorites', 'nav.discover': 'Discover', 'nav.settings': 'Settings', 'nav.logout': 'Sign out',
    'route.error': 'Error', 'route.home': 'Home', 'route.search': 'Search', 'route.favorites': 'Favorites', 'route.discover': 'Discover', 'route.settings': 'Settings', 'route.about': 'About', 'route.diagnostics': 'Diagnostics',
    'action.close': 'Close', 'action.back': 'Back', 'action.play': 'Play', 'action.pause': 'Pause', 'action.details': 'Details', 'action.search': 'Search', 'action.cancel': 'Cancel', 'action.save': 'Save', 'action.remove': 'Remove', 'action.configure': 'Configure', 'action.reset': 'Reset',
    'state.loading': 'Loading…', 'state.noResults': 'No results.', 'state.error': 'An error occurred.',
    'auth.title': 'Wholphin Web', 'auth.description': 'Connect a Jellyfin server. The access token is kept in this browser’s local storage.', 'auth.server': 'Server', 'auth.username': 'User', 'auth.password': 'Password', 'auth.login': 'Sign in', 'auth.quickConnect': 'Quick Connect', 'auth.demo': 'Demo mode', 'auth.savedProfiles': 'Saved profiles', 'auth.unlock': 'Unlock', 'auth.pinPrompt': 'Enter this profile’s local PIN.',
    'settings.language': 'Language', 'settings.interface': 'Interface', 'settings.playback': 'Playback', 'settings.home': 'Home', 'settings.server': 'Server', 'settings.profileLock': 'Profile lock',
    'library.search': 'Search this library', 'library.sort': 'Sort', 'library.sort.name': 'Title', 'library.sort.recent': 'Recently added', 'library.sort.year': 'Year descending', 'library.sort.rating': 'Rating descending',
    'library.view': 'View', 'library.view.grid': 'Grid', 'library.view.list': 'List', 'library.image': 'Images', 'library.image.poster': 'Poster', 'library.image.landscape': 'Landscape',
    'library.size': 'Size', 'library.size.compact': 'Compact', 'library.size.comfortable': 'Comfortable', 'library.size.large': 'Large',
    'library.filters': 'Filters', 'library.genre': 'Genre', 'library.studio': 'Studio', 'library.year': 'Year', 'library.played': 'Status', 'library.all': 'All',
    'library.unplayed': 'Unplayed', 'library.playedOnly': 'Played', 'library.favorite': 'Favorites', 'library.resumable': 'In progress', 'library.count': '{count} items', 'library.noMatch': 'No results for “{query}”.',
  },
};

let locale: Locale = 'fr';

function storedLocale(): Locale | null {
  try {
    const state = JSON.parse(localStorage.getItem('wholphin-web-state-v2') ?? 'null') as {
      demo?: boolean;
      activeSessionKey?: string | null;
      preferencesByProfile?: Record<string, { language?: string }>;
    } | null;
    if (!state) return null;
    const profileKey = state.demo ? 'demo' : state.activeSessionKey ?? 'anonymous';
    return state.preferencesByProfile?.[profileKey]?.language === 'en' ? 'en' : 'fr';
  } catch {
    return null;
  }
}

function syncLocale(): void {
  const next = storedLocale();
  if (next && next !== locale) setLocale(next);
}

export function setLocale(value: string | undefined): Locale {
  locale = value === 'en' ? 'en' : 'fr';
  document.documentElement.lang = locale;
  return locale;
}

export function getLocale(): Locale {
  syncLocale();
  return locale;
}

export function t(key: TranslationKey, values: Record<string, string | number> = {}): string {
  syncLocale();
  let text = dictionaries[locale][key] ?? dictionaries.fr[key];
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}
