export type LibraryViewMode = 'grid' | 'list';
export type LibraryImageType = 'poster' | 'landscape';
export type LibraryCardSize = 'compact' | 'comfortable' | 'large';
export type LibraryPlayedFilter = 'all' | 'unplayed' | 'played' | 'favorite' | 'resumable';

export interface LibraryPreferences {
  viewMode: LibraryViewMode;
  imageType: LibraryImageType;
  cardSize: LibraryCardSize;
  sort: 'name' | 'date-desc' | 'year-desc' | 'rating-desc';
  genre: string;
  studio: string;
  year: string;
  played: LibraryPlayedFilter;
}

const STORAGE_KEY = 'wholphin-web-library-preferences-v1';

type StoredPreferences = Record<string, Partial<LibraryPreferences>>;

export function defaultLibraryPreferences(collectionType?: string): LibraryPreferences {
  const landscape = ['homevideos', 'musicvideos'].includes(collectionType ?? '');
  return {
    viewMode: 'grid',
    imageType: landscape ? 'landscape' : 'poster',
    cardSize: 'comfortable',
    sort: 'name',
    genre: '',
    studio: '',
    year: '',
    played: 'all',
  };
}

function safeRead(): StoredPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as unknown;
    return parsed && typeof parsed === 'object' ? parsed as StoredPreferences : {};
  } catch {
    return {};
  }
}

function storageId(profileKey: string, parentId: string): string {
  return `${profileKey}::${parentId}`;
}

export function normalizeLibraryPreferences(value: Partial<LibraryPreferences> | undefined, collectionType?: string): LibraryPreferences {
  const defaults = defaultLibraryPreferences(collectionType);
  const viewMode = value?.viewMode === 'list' ? 'list' : 'grid';
  const imageType = value?.imageType === 'landscape' ? 'landscape' : 'poster';
  const cardSize = value?.cardSize === 'compact' || value?.cardSize === 'large' ? value.cardSize : 'comfortable';
  const sort = ['date-desc', 'year-desc', 'rating-desc'].includes(value?.sort ?? '')
    ? value!.sort as LibraryPreferences['sort']
    : 'name';
  const played = ['unplayed', 'played', 'favorite', 'resumable'].includes(value?.played ?? '')
    ? value!.played as LibraryPlayedFilter
    : 'all';
  return {
    ...defaults,
    ...value,
    viewMode,
    imageType,
    cardSize,
    sort,
    played,
    genre: typeof value?.genre === 'string' ? value.genre : '',
    studio: typeof value?.studio === 'string' ? value.studio : '',
    year: typeof value?.year === 'string' ? value.year : '',
  };
}

export function loadLibraryPreferences(profileKey: string, parentId: string, collectionType?: string): LibraryPreferences {
  return normalizeLibraryPreferences(safeRead()[storageId(profileKey, parentId)], collectionType);
}

export function saveLibraryPreferences(profileKey: string, parentId: string, preferences: LibraryPreferences): void {
  const all = safeRead();
  all[storageId(profileKey, parentId)] = normalizeLibraryPreferences(preferences);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function clearLibraryPreferences(profileKey: string, parentId: string): void {
  const all = safeRead();
  delete all[storageId(profileKey, parentId)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
