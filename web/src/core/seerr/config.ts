const STORAGE_KEY = 'wholphin-web-seerr-v1';

export interface SeerrConfig {
  baseUrl: string;
  apiKey: string;
  version?: string;
  verifiedAt?: string;
}

type SeerrConfigs = Record<string, SeerrConfig>;

function read(): SeerrConfigs {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as SeerrConfigs; } catch { return {}; }
}

export function normalizeSeerrUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) throw new Error('Adresse Seerr requise.');
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Protocole Seerr non pris en charge.');
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
  return url.toString().replace(/\/$/, '');
}

export function loadSeerrConfig(profileKey: string): SeerrConfig | null {
  return read()[profileKey] ?? null;
}

export function saveSeerrConfig(profileKey: string, config: SeerrConfig): void {
  const configs = read();
  configs[profileKey] = { ...config, baseUrl: normalizeSeerrUrl(config.baseUrl) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function clearSeerrConfig(profileKey: string): void {
  const configs = read();
  delete configs[profileKey];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function redactedSeerrConfig(profileKey: string): Record<string, unknown> | null {
  const config = loadSeerrConfig(profileKey);
  return config ? { ...config, apiKey: '[redacted]' } : null;
}
