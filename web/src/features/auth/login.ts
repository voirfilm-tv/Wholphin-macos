import { JellyfinApi, getDeviceId, normalizeServerUrl } from '../../core/api/client';
import { beginQuickConnect, finishQuickConnect, readQuickConnectState } from '../../core/api/quickConnect';
import type { ScreenContext, ScreenResult } from '../../core/context';
import { attribute, escapeHtml, query } from '../../core/html';

export function renderLogin(context: ScreenContext, message = ''): ScreenResult {
  const sessions = Object.values(context.store.snapshot().sessions);
  return {
    html: `<div class="auth-page">
      <section class="panel auth-card" aria-labelledby="login-title">
        <img class="auth-logo" src="./assets/icon.svg" alt="">
        <h1 id="login-title">Wholphin Web</h1>
        <p>Connecte un serveur Jellyfin. Le jeton d’accès est conservé dans le stockage local de ce navigateur.</p>
        ${sessions.length ? `<div class="saved-sessions"><h2>Profils enregistrés</h2>${sessions.map((session) => `<div class="saved-session-row"><button class="saved-session" data-focusable="true" data-focus-key="saved:${attribute(session.key)}" data-activate-session="${attribute(session.key)}"><span class="avatar">${escapeHtml(session.username[0]?.toUpperCase())}</span><span><strong>${escapeHtml(session.username)}</strong><small>${escapeHtml(session.serverName)}</small></span></button><button class="btn icon danger" aria-label="Supprimer ${attribute(session.username)}" data-remove-session="${attribute(session.key)}" data-focusable="true" data-focus-key="remove:${attribute(session.key)}">×</button></div>`).join('')}</div>` : ''}
        <form class="form-grid" id="login-form">
          <div class="field"><label for="server">Serveur</label><input class="input" id="server" name="server" inputmode="url" autocomplete="url" placeholder="https://jellyfin.exemple.fr" required data-focusable="true" data-focus-key="login:server" data-focus-initial="true"></div>
          <div class="field"><label for="username">Utilisateur</label><input class="input" id="username" name="username" autocomplete="username" required data-focusable="true" data-focus-key="login:username"></div>
          <div class="field"><label for="password">Mot de passe</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" data-focusable="true" data-focus-key="login:password"></div>
          ${message ? `<div class="status error" role="alert">${escapeHtml(message)}</div>` : ''}
          <div class="auth-actions"><button class="btn primary" data-focusable="true" data-focus-key="login:submit">Connexion</button><button class="btn" type="button" id="quick-connect-button" data-focusable="true" data-focus-key="login:quick">Quick Connect</button><button class="btn" type="button" id="demo-button" data-focusable="true" data-focus-key="login:demo">Mode démo</button></div>
        </form>
        <div id="quick-connect-region" aria-live="polite"></div>
      </section>
    </div>`,
    afterRender: () => {
      const form = query<HTMLFormElement>(context.root, '#login-form');
      const serverInput = query<HTMLInputElement>(context.root, '#server');
      const demoButton = query<HTMLButtonElement>(context.root, '#demo-button');
      const quickButton = query<HTMLButtonElement>(context.root, '#quick-connect-button');
      const quickRegion = query<HTMLElement>(context.root, '#quick-connect-region');
      let quickController: AbortController | null = null;

      const saveAuthentication = (serverUrl: string, serverName: string, serverVersion: string | undefined, serverId: string, userId: string, username: string, token: string, deviceId: string) => {
        context.store.setSession({ serverId, serverUrl, serverName, serverVersion, userId, username, token, deviceId });
        context.router.navigate({ name: 'home' }, true);
      };

      demoButton.addEventListener('click', () => {
        quickController?.abort();
        context.store.enableDemo();
        context.router.navigate({ name: 'home' }, true);
      });

      context.root.querySelectorAll<HTMLElement>('[data-activate-session]').forEach((button) => button.addEventListener('click', () => {
        const key = button.dataset.activateSession;
        if (!key) return;
        context.store.activateSession(key);
        context.router.navigate({ name: 'home' }, true);
      }));
      context.root.querySelectorAll<HTMLElement>('[data-remove-session]').forEach((button) => button.addEventListener('click', () => {
        const key = button.dataset.removeSession;
        if (!key) return;
        context.store.removeSession(key);
        button.closest('.saved-session-row')?.remove();
        context.toast('Profil local supprimé.', 'success');
      }));

      quickButton.addEventListener('click', async () => {
        quickController?.abort();
        quickController = new AbortController();
        const signal = AbortSignal.any([context.signal, quickController.signal]);
        quickButton.disabled = true;
        quickRegion.innerHTML = '<div class="quick-connect-card"><div class="loader"></div><p>Création du code…</p></div>';
        try {
          const serverUrl = normalizeServerUrl(serverInput.value);
          const api = new JellyfinApi({ serverUrl, deviceId: getDeviceId() });
          const session = await beginQuickConnect(api, signal);
          quickRegion.innerHTML = `<div class="quick-connect-card"><p>Entre ce code dans une application Jellyfin déjà connectée :</p><strong class="quick-code">${escapeHtml(session.state.Code)}</strong><p data-quick-status>En attente de l’autorisation…</p><button class="btn" type="button" data-cancel-quick data-focusable="true" data-focus-key="quick:cancel">Annuler</button></div>`;
          query<HTMLButtonElement>(quickRegion, '[data-cancel-quick]').addEventListener('click', () => {
            quickController?.abort();
            quickRegion.innerHTML = '';
            quickButton.disabled = false;
          });
          const status = query<HTMLElement>(quickRegion, '[data-quick-status]');
          const deadline = Date.now() + 5 * 60_000;
          while (!signal.aborted && Date.now() < deadline) {
            await new Promise<void>((resolve, reject) => {
              const timer = window.setTimeout(resolve, 5_000);
              signal.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
            });
            const state = await readQuickConnectState(api, session.state.Secret, signal);
            if (!state.Authenticated) continue;
            status.textContent = 'Autorisation reçue. Connexion…';
            const authentication = await finishQuickConnect(api, session.state.Secret, signal);
            saveAuthentication(serverUrl, session.server.ServerName, session.server.Version, authentication.ServerId ?? session.server.Id ?? serverUrl, authentication.User.Id, authentication.User.Name, authentication.AccessToken, api.deviceId);
            return;
          }
          if (!signal.aborted) throw new Error('Le code Quick Connect a expiré.');
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          quickRegion.innerHTML = `<div class="status error" role="alert">${escapeHtml(error instanceof Error ? error.message : 'Quick Connect impossible.')}</div>`;
          quickButton.disabled = false;
        }
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        quickController?.abort();
        const submit = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type])');
        if (submit) submit.disabled = true;
        const data = new FormData(form);
        try {
          const serverUrl = normalizeServerUrl(data.get('server'));
          const api = new JellyfinApi({ serverUrl, deviceId: getDeviceId() });
          const info = await api.publicInfo(context.signal);
          const auth = await api.authenticate(String(data.get('username') ?? ''), String(data.get('password') ?? ''), context.signal);
          saveAuthentication(serverUrl, info.ServerName, info.Version, auth.ServerId ?? info.Id ?? serverUrl, auth.User.Id, auth.User.Name, auth.AccessToken, api.deviceId);
        } catch (error) {
          context.toast(error instanceof Error ? error.message : 'Connexion impossible.', 'error');
          if (submit) submit.disabled = false;
        }
      });
    },
  };
}
