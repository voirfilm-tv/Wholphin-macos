import type { AuthenticationResult, PublicSystemInfo } from '../../types/jellyfin';
import type { JellyfinApi } from './client';

export interface QuickConnectResult {
  Authenticated: boolean;
  Secret: string;
  Code: string;
  DateAdded?: string;
}

export interface QuickConnectSession {
  api: JellyfinApi;
  server: PublicSystemInfo;
  state: QuickConnectResult;
}

export async function beginQuickConnect(api: JellyfinApi, signal?: AbortSignal): Promise<QuickConnectSession> {
  const [server, enabled] = await Promise.all([
    api.publicInfo(signal),
    api.request<boolean>('/QuickConnect/Enabled', { anonymous: true, signal, timeoutMs: 8_000 }),
  ]);
  if (!enabled) throw new Error('Quick Connect est désactivé sur ce serveur.');
  const state = await api.request<QuickConnectResult>('/QuickConnect/Initiate', {
    method: 'POST', anonymous: true, signal, timeoutMs: 8_000, dedupe: false,
  });
  if (!state.Secret || !state.Code) throw new Error('Le serveur n’a pas renvoyé de code Quick Connect valide.');
  return { api, server, state };
}

export function readQuickConnectState(api: JellyfinApi, secret: string, signal?: AbortSignal): Promise<QuickConnectResult> {
  return api.request('/QuickConnect/Connect', {
    params: { secret }, anonymous: true, signal, timeoutMs: 8_000, dedupe: false,
  });
}

export async function finishQuickConnect(api: JellyfinApi, secret: string, signal?: AbortSignal): Promise<AuthenticationResult> {
  const authentication = await api.request<AuthenticationResult>('/Users/AuthenticateWithQuickConnect', {
    method: 'POST', anonymous: true, signal, timeoutMs: 10_000, dedupe: false,
    body: { Secret: secret },
  });
  api.token = authentication.AccessToken;
  api.userId = authentication.User.Id;
  return authentication;
}
