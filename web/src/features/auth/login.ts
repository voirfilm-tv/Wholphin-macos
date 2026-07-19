import { JellyfinApi, getDeviceId, normalizeServerUrl } from '../../core/api/client';
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
        ${sessions.length ? `<div class="saved-sessions"><h2>Profils enregistrés</h2>${sessions.map((session) => `<button class="saved-session" data-focusable="true" data-focus-key="saved:${attribute(session.key)}" data-activate-session="${attribute(session.key)}"><span class="avatar">${escapeHtml(session.username[0]?.toUpperCase())}</span><span><strong>${escapeHtml(session.username)}</strong><small>${escapeHtml(session.serverName)}</small></span></button>`).join('')}</div>` : ''}
        <form class="form-grid" id="login-form">
          <div class="field"><label for="server">Serveur</label><input class="input" id="server" name="server" inputmode="url" autocomplete="url" placeholder="https://jellyfin.exemple.fr" required data-focusable="true" data-focus-key="login:server" data-focus-initial="true"></div>
          <div class="field"><label for="username">Utilisateur</label><input class="input" id="username" name="username" autocomplete="username" required data-focusable="true" data-focus-key="login:username"></div>
          <div class="field"><label for="password">Mot de passe</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" data-focusable="true" data-focus-key="login:password"></div>
          ${message ? `<div class="status error" role="alert">${escapeHtml(message)}</div>` : ''}
          <div class="auth-actions"><button class="btn primary" data-focusable="true" data-focus-key="login:submit">Connexion</button><button class="btn" type="button" id="demo-button" data-focusable="true" data-focus-key="login:demo">Mode démo</button></div>
        </form>
      </section>
    </div>`,
    afterRender: () => {
      const form = query<HTMLFormElement>(context.root, '#login-form');
      const demoButton = query<HTMLButtonElement>(context.root, '#demo-button');
      demoButton.addEventListener('click', () => {
        context.store.enableDemo();
        context.router.navigate({ name: 'home' }, true);
      });
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type])');
        if (submit) submit.disabled = true;
        const data = new FormData(form);
        try {
          const serverUrl = normalizeServerUrl(data.get('server'));
          const api = new JellyfinApi({ serverUrl, deviceId: getDeviceId() });
          const info = await api.publicInfo(context.signal);
          const auth = await api.authenticate(String(data.get('username') ?? ''), String(data.get('password') ?? ''), context.signal);
          context.store.setSession({
            serverId: auth.ServerId ?? info.Id ?? serverUrl,
            serverUrl,
            serverName: info.ServerName,
            serverVersion: info.Version,
            userId: auth.User.Id,
            username: auth.User.Name,
            token: auth.AccessToken,
            deviceId: api.deviceId,
          });
          context.router.navigate({ name: 'home' }, true);
        } catch (error) {
          const text = error instanceof Error ? error.message : 'Connexion impossible.';
          context.toast(text, 'error');
          if (submit) submit.disabled = false;
        }
      });
    },
  };
}
