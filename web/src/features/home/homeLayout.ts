export type HomeImageType = 'poster' | 'landscape';

export interface HomeRowDefinition {
  key: string;
  label: string;
  defaultEnabled?: boolean;
  defaultImageType?: HomeImageType;
}

export interface HomeRowPreference {
  key: string;
  label: string;
  enabled: boolean;
  imageType: HomeImageType;
  showTitles: boolean;
}

const STORAGE_KEY = 'wholphin-web-home-layout-v1';

type StoredLayouts = Record<string, HomeRowPreference[]>;

function parse(): StoredLayouts {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as StoredLayouts; } catch { return {}; }
}

export function loadHomeLayout(profileKey: string, definitions: HomeRowDefinition[]): HomeRowPreference[] {
  const stored = parse();
  const previous = stored[profileKey] ?? [];
  const byKey = new Map(previous.map((row) => [row.key, row]));
  const known = definitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    enabled: byKey.get(definition.key)?.enabled ?? definition.defaultEnabled ?? true,
    imageType: byKey.get(definition.key)?.imageType ?? definition.defaultImageType ?? 'poster',
    showTitles: byKey.get(definition.key)?.showTitles ?? true,
  } satisfies HomeRowPreference));
  const definitionKeys = new Set(definitions.map((definition) => definition.key));
  const ordered = previous.filter((row) => definitionKeys.has(row.key)).map((row) => known.find((candidate) => candidate.key === row.key)!).filter(Boolean);
  const orderedKeys = new Set(ordered.map((row) => row.key));
  ordered.push(...known.filter((row) => !orderedKeys.has(row.key)));
  return ordered;
}

export function saveHomeLayout(profileKey: string, layout: HomeRowPreference[]): void {
  const stored = parse();
  stored[profileKey] = layout;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function updateHomeRow(profileKey: string, definitions: HomeRowDefinition[], key: string, patch: Partial<HomeRowPreference>): HomeRowPreference[] {
  const layout = loadHomeLayout(profileKey, definitions).map((row) => row.key === key ? { ...row, ...patch } : row);
  saveHomeLayout(profileKey, layout);
  return layout;
}

export function moveHomeRow(profileKey: string, definitions: HomeRowDefinition[], key: string, delta: -1 | 1): HomeRowPreference[] {
  const layout = loadHomeLayout(profileKey, definitions);
  const index = layout.findIndex((row) => row.key === key);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= layout.length) return layout;
  [layout[index], layout[target]] = [layout[target]!, layout[index]!];
  saveHomeLayout(profileKey, layout);
  return layout;
}
