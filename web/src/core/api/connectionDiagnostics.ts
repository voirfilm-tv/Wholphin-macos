import { JellyfinApiError, normalizeServerUrl } from './client.js';

export type ConnectionIssueKind =
  | 'mixed-content'
  | 'unauthorized'
  | 'forbidden'
  | 'not-jellyfin'
  | 'server-error'
  | 'network-or-cors'
  | 'invalid-address'
  | 'unknown';

export interface ConnectionIssue {
  kind: ConnectionIssueKind;
  message: string;
  technical?: string;
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

export function assertBrowserCanReachServer(input: unknown, pageProtocol = globalThis.location?.protocol ?? 'https:'): string {
  const serverUrl = normalizeServerUrl(input);
  const target = new URL(serverUrl);
  if (pageProtocol === 'https:' && target.protocol === 'http:' && !isLoopback(target.hostname)) {
    throw new Error('Cette interface est ouverte en HTTPS, mais le serveur Jellyfin utilise HTTP. Les navigateurs bloquent cette connexion. Utilise une adresse Jellyfin en HTTPS ou héberge aussi le client web en HTTP sur ton réseau local.');
  }
  return serverUrl;
}

export function describeConnectionError(error: unknown, serverUrl?: string, pageProtocol = globalThis.location?.protocol ?? 'https:'): ConnectionIssue {
  try {
    if (serverUrl) assertBrowserCanReachServer(serverUrl, pageProtocol);
  } catch (mixedContentError) {
    return {
      kind: 'mixed-content',
      message: mixedContentError instanceof Error ? mixedContentError.message : 'Connexion HTTP bloquée depuis une page HTTPS.',
    };
  }

  if (error instanceof JellyfinApiError) {
    if (error.status === 401) return { kind: 'unauthorized', message: 'Identifiant ou mot de passe incorrect.', technical: error.message };
    if (error.status === 403) return { kind: 'forbidden', message: 'Le serveur a refusé cette connexion.', technical: error.message };
    if (error.status === 404) return { kind: 'not-jellyfin', message: 'Cette adresse ne semble pas pointer vers un serveur Jellyfin. Vérifie le domaine, le port et l’éventuel sous-chemin.', technical: error.message };
    if (error.status && error.status >= 500) return { kind: 'server-error', message: `Le serveur Jellyfin a répondu avec une erreur ${error.status}.`, technical: error.message };
  }

  const technical = error instanceof Error ? error.message : String(error ?? 'Erreur inconnue');
  if (error instanceof TypeError || /failed to fetch|networkerror|load failed|cors|certificate|ssl/i.test(technical)) {
    return {
      kind: 'network-or-cors',
      message: 'Impossible de joindre ce serveur depuis le navigateur. Vérifie que l’adresse est accessible, que le certificat HTTPS est valide et que Jellyfin autorise l’origine de ce client web dans ses paramètres CORS.',
      technical,
    };
  }
  if (/adresse|url|protocol|requise/i.test(technical)) return { kind: 'invalid-address', message: technical, technical };
  return { kind: 'unknown', message: technical || 'Connexion impossible.', technical };
}
