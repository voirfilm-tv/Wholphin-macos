import { JellyfinApi, getDeviceId } from '../../core/api/client';
import { assertBrowserCanReachServer, describeConnectionError } from '../../core/api/connectionDiagnostics';
import { beginQuickConnect, finishQuickConnect, readQuickConnectState } from '../../core/api/quickConnect';
import type { ScreenContext, ScreenResult } from '../../core/context';
import { attribute, escapeHtml, query } from '../../core/html';
import type { PublicSystemInfo } from '../../types/jellyfin';

function stableHue(value: string): number {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

export function renderLogin(context: ScreenContext, message = ''): ScreenResult {
  const sessions = Object.values(context.store.snapshot().sessions);
  const initialServer = sessions[0]?.serverUrl ?? '';
  return {
    html: `<div class="auth-page">
      <div class="auth-ambient" aria-hidden="true"></div>
      <main class="auth-layout">
        <section class="auth-intro" aria-labelledby="login-title">
          <img class="auth-logo" src="./assets/icon.svg" alt="">
          <span class="eyebrow">Client Jellyfin indépendant</span>
          <h1 id="login-title">Wholphin Web</h1>
          <p>Une seule interface web, utilisable avec n’importe quel serveur Jellyfin compatible. L’adresse, le compte et le jeton restent dans ce navigateur.</p>
          <div class="auth-steps" aria-label="Étapes de connexion"><span class="active" data-step-indicator="server">1 <b>Serveur</b></span><span data-step-indicator="account">2 <b>Compte</b></span></div>
        </section>

        <section class="panel auth-card">
          ${sessions.length ? `<section class="saved-sessions" aria-labelledby="saved-title"><div class="section-header compact"><div><h2 id="saved-title">Profils enregistrés</h2><p>Reprendre une connexion locale.</p></div></div><div class="saved-session-grid">${sessions.map((session) => `<div class="saved-session-row"><button class="saved-session" style="--server-hue:${stableHue(session.serverId || session.serverUrl)}" data-focusable="true" data-focus-key="saved:${attribute(session.key)}" data-activate-session="${attribute(session.key)}"><span class="server-orb">${escapeHtml(session.username[0]?.toUpperCase() ?? '?')}</span><span><strong>${escapeHtml(session.username)}</strong><small>${escapeHtml(session.serverName)}</small><em>${escapeHtml(session.serverUrl)}</em></span></button><button class="btn icon danger" aria-label="Supprimer ${attribute(session.username)}" data-remove-session="${attribute(session.key)}" data-focusable="true" data-focus-key="remove:${attribute(session.key)}">×</button></div>`).join('')}</div><div class="auth-divider"><span>ou connecter un autre serveur</span></div></section>` : ''}

          <div class="status error" id="connection-status" role="alert" ${message ? '' : 'hidden'}>${escapeHtml(message)}</div>

          <form class="form-grid connection-step" id="server-form" data-auth-step="server">
            <div class="field"><label for="server">Adresse du serveur Jellyfin</label><input class="input server-input" id="server" name="server" inputmode="url" autocomplete="url" value="${attribute(initialServer)}" placeholder="https://jellyfin.exemple.fr" required data-focusable="true" data-focus-key="login:server" data-focus-initial="true"><small>Le domaine, le port et un éventuel sous-chemin sont acceptés.</small></div>
            <div class="auth-actions"><button class="btn primary" type="submit" data-focusable="true" data-focus-key="login:continue">Continuer</button><button class="btn" type="button" id="demo-button" data-focusable="true" data-focus-key="login:demo">Explorer la démo</button></div>
          </form>

          <section class="connection-step" id="account-step" data-auth-step="account" hidden>
            <div class="verified-server" id="verified-server"></div>
            <form class="form-grid" id="credentials-form">
              <div class="field"><label for="username">Utilisateur</label><input class="input" id="username" name="username" autocomplete="username" required data-focusable="true" data-focus-key="login:username"></div>
              <div class="field"><label for="password">Mot de passe</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" data-focusable="true" data-focus-key="login:password"></div>
              <div class="auth-actions"><button class="btn primary" type="submit" data-focusable="true" data-focus-key="login:submit">Se connecter</button><button class="btn" type="button" id="quick-connect-button" data-focusable="true" data-focus-key="login:quick">Quick Connect</button><button class="btn subtle" type="button" id="change-server-button" data-focusable="true" data-focus-key="login:back">Changer de serveur</button></div>
            </form>
            <div id="quick-connect-region" aria-live="polite"></div>
          </section>
        </section>
      </main>
    </div>`,
    afterRender: () => {
      const serverForm = query<HTMLFormElement>(context.root, '#server-form');
      const credentialsForm = query<HTMLFormElement>(context.root, '#credentials-form');
      const serverInput = query<HTMLInputElement>(context.root, '#server');
      const usernameInput = query<HTMLInputElement>(context.root, '#username');
      const demoButton = query<HTMLButtonElement>(context.root, '#demo-button');
      const quickButton = query<HTMLButtonElement>(context.root, '#quick-connect-button');
      const changeServerButton = query<HTMLButtonElement>(context.root, '#change-server-button');
      const accountStep = query<HTMLElement>(context.root, '#account-step');
      const verifiedServer = query<HTMLElement>(context.root, '#verified-server');
      const quickRegion = query<HTMLElement>(context.root, '#quick-connect-region');
      const status = query<HTMLElement>(context.root, '#connection-status');
      let verified: { serverUrl: string; api: JellyfinApi; info: PublicSystemInfo } | null = null;
      let quickController: AbortController | null = null;

      const setStatus = (text = '') => {
        status.textContent = text;
        status.hidden = !text;
      };

      const setStep = (step: 'server' | 'account') => {
        const account = step === 'account';
        serverForm.hidden = account;
        accountStep.hidden = !account;
        context.root.querySelectorAll<HTMLElement>('[data-step-indicator]').forEach((indicator) => indicator.classList.toggle('active', indicator.dataset.stepIndicator === step));
        context.focus.invalidate();
        requestAnimationFrame(() => (account ? usernameInput : serverInput).focus());
      };

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

      serverForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus();
        const submit = serverForm.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submit) submit.disabled = true;
        try {
          const serverUrl = assertBrowserCanReachServer(serverInput.value);
          const api = new JellyfinApi({ serverUrl, deviceId: getDeviceId() });
          const info = await api.publicInfo(context.signal);
          verified = { serverUrl, api, info };
          verifiedServer.innerHTML = `<span class="server-orb" style="--server-hue:${stableHue(info.Id ?? serverUrl)}">${escapeHtml(info.ServerName.slice(0, 1).toUpperCase())}</span><span><small>Serveur vérifié</small><strong>${escapeHtml(info.ServerName)}</strong><em>${escapeHtml(serverUrl)} · Jellyfin ${escapeHtml(info.Version)}</em></span>`;
          setStep('account');
        } catch (error) {
          const issue = describeConnectionError(error, serverInput.value);
          setStatus(issue.message);
        } finally {
          if (submit) submit.disabled = false;
        }
      });

      changeServerButton.addEventListener('click', () => {
        quickController?.abort();
        quickController = null;
        quickRegion.innerHTML = '';
        quickButton.disabled = false;
        verified = null;
        setStatus();
        setStep('server');
      });

      quickButton.addEventListener('click', async () => {
        if (!verified) return;
        quickController?.abort();
        quickController = new AbortController();
        const signal = AbortSignal.any([context.signal, quickController.signal]);
        quickButton.disabled = true;
        setStatus();
        quickRegion.innerHTML = '<div class="quick-connect-card"><div class="loader"></div><p>Création du code…</p></div>';
        try {
          const session = await beginQuickConnect(verified.api, signal);
          quickRegion.innerHTML = `<div class="quick-connect-card"><p>Entre ce code dans une application Jellyfin déjà connectée :</p><strong class="quick-code">${escapeHtml(session.state.Code)}</strong><p data-quick-status>En attente de l’autorisation…</p><button class="btn" type="button" data-cancel-quick data-focusable="true" data-focus-key="quick:cancel">Annuler</button></div>`;
          query<HTMLButtonElement>(quickRegion, '[data-cancel-quick]').addEventListener('click', () => {
            quickController?.abort();
            quickRegion.innerHTML = '';
            quickButton.disabled = false;
          });
          const quickStatus = query<HTMLElement>(quickRegion, '[data-quick-status]');
          const deadline = Date.now() + 5 * 60_000;
          while (!signal.aborted && Date.now() < deadline) {
            await new Promise<void>((resolve, reject) => {
              const timer = window.setTimeout(resolve, 5_000);
              signal.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
            });
            const state = await readQuickConnectState(verified.api, session.state.Secret, signal);
            if (!state.Authenticated) continue;
            quickStatus.textContent = 'Autorisation reçue. Connexion…';
            const authentication = await finishQuickConnect(verified.api, session.state.Secret, signal);
            saveAuthentication(verified.serverUrl, verified.info.ServerName, verified.info.Version, authentication.ServerId ?? verified.info.Id ?? verified.serverUrl, authentication.User.Id, authentication.User.Name, authentication.AccessToken, verified.api.deviceId);
            return;
          }
          if (!signal.aborted) throw new Error('Le code Quick Connect a expiré.');
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setStatus(describeConnectionError(error, verified.serverUrl).message);
          quickRegion.innerHTML = '';
          quickButton.disabled = false;
        }
      });

      credentialsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!verified) return;
        quickController?.abort();
        setStatus();
        const submit = credentialsForm.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submit) submit.disabled = true;
        const data = new FormData(credentialsForm);
        try {
          const auth = await verified.api.authenticate(String(data.get('username') ?? ''), String(data.get('password') ?? ''), context.signal);
          saveAuthentication(verified.serverUrl, verified.info.ServerName, verified.info.Version, auth.ServerId ?? verified.info.Id ?? verified.serverUrl, auth.User.Id, auth.User.Name, auth.AccessToken, verified.api.deviceId);
        } catch (error) {
          setStatus(describeConnectionError(error, verified.serverUrl).message);
          if (submit) submit.disabled = false;
        }
      });
    },
  };
}
