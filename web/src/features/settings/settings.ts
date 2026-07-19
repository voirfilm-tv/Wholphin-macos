import type { ScreenContext, ScreenResult } from '../../core/context';
import { escapeHtml } from '../../core/html';
import { clearSeerrConfig, loadSeerrConfig, normalizeSeerrUrl, redactedSeerrConfig, saveSeerrConfig } from '../../core/seerr/config';
import { SeerrClient } from '../../core/seerr/client';
import { getHomeDefinitions } from '../home/home';
import { loadHomeLayout, moveHomeRow, updateHomeRow } from '../home/homeLayout';

export async function renderSettings(context: ScreenContext): Promise<ScreenResult> {
  const preferences = context.store.preferences();
  const session = context.store.activeSession();
  const definitions = await getHomeDefinitions(context);
  const profileKey = context.store.profileKey();
  const homeLayout = loadHomeLayout(profileKey, definitions);
  const seerr = loadSeerrConfig(profileKey);
  return {
    title: 'Paramètres',
    html: `<div class="settings-layout">
      <section class="setting-card"><h2>Interface</h2>
        <label class="field">Couleur d’accent<input type="color" value="${preferences.accent}" data-preference="accent" data-focusable="true" data-focus-key="settings:accent"></label>
        <label class="switch-row"><input type="checkbox" ${preferences.showTitles ? 'checked' : ''} data-preference="showTitles" data-focusable="true" data-focus-key="settings:titles"> Afficher les titres</label>
        <label class="switch-row"><input type="checkbox" ${preferences.showClock ? 'checked' : ''} data-preference="showClock" data-focusable="true" data-focus-key="settings:clock"> Afficher l’horloge</label>
        <label class="switch-row"><input type="checkbox" ${preferences.reducedMotion ? 'checked' : ''} data-preference="reducedMotion" data-focusable="true" data-focus-key="settings:motion"> Réduire les animations</label>
        <label class="switch-row"><input type="checkbox" ${preferences.highContrast ? 'checked' : ''} data-preference="highContrast" data-focusable="true" data-focus-key="settings:contrast"> Contraste renforcé</label>
      </section>
      <section class="setting-card"><h2>Lecture</h2>
        <label class="field">Saut avant/arrière<select data-preference="seekSeconds" data-focusable="true" data-focus-key="settings:seek"><option value="5" ${preferences.seekSeconds === 5 ? 'selected' : ''}>5 secondes</option><option value="10" ${preferences.seekSeconds === 10 ? 'selected' : ''}>10 secondes</option><option value="30" ${preferences.seekSeconds === 30 ? 'selected' : ''}>30 secondes</option></select></label>
        <label class="field">Délai du backdrop<input type="range" min="0" max="500" step="20" value="${preferences.backdropDelayMs}" data-preference="backdropDelayMs" data-focusable="true" data-focus-key="settings:backdrop"><output>${preferences.backdropDelayMs} ms</output></label>
      </section>
      <section class="setting-card home-layout-card"><h2>Accueil</h2><p>Active, ordonne et choisis le format d’image de chaque rangée.</p>
        <div class="home-layout-list">${homeLayout.map((row, index) => `<div class="home-layout-row" data-home-row="${escapeHtml(row.key)}">
          <label class="switch-row"><input type="checkbox" ${row.enabled ? 'checked' : ''} data-home-enabled="${escapeHtml(row.key)}" data-focusable="true" data-focus-key="home-row:${escapeHtml(row.key)}:enabled"> <span>${escapeHtml(row.label)}</span></label>
          <select data-home-image="${escapeHtml(row.key)}" aria-label="Format ${escapeHtml(row.label)}" data-focusable="true" data-focus-key="home-row:${escapeHtml(row.key)}:image"><option value="poster" ${row.imageType === 'poster' ? 'selected' : ''}>Poster</option><option value="landscape" ${row.imageType === 'landscape' ? 'selected' : ''}>Paysage</option></select>
          <label class="home-title-toggle"><input type="checkbox" ${row.showTitles ? 'checked' : ''} data-home-titles="${escapeHtml(row.key)}" data-focusable="true" data-focus-key="home-row:${escapeHtml(row.key)}:titles"> Titres</label>
          <div class="home-row-order"><button class="btn icon small" ${index === 0 ? 'disabled' : ''} data-home-move="${escapeHtml(row.key)}" data-delta="-1" data-focusable="true" data-focus-key="home-row:${escapeHtml(row.key)}:up" aria-label="Monter">↑</button><button class="btn icon small" ${index === homeLayout.length - 1 ? 'disabled' : ''} data-home-move="${escapeHtml(row.key)}" data-delta="1" data-focusable="true" data-focus-key="home-row:${escapeHtml(row.key)}:down" aria-label="Descendre">↓</button></div>
        </div>`).join('')}</div>
      </section>
      <section class="setting-card"><h2>Seerr</h2><p>Découverte et demandes de films/séries. La clé API reste dans le stockage local de ce profil.</p>
        <form class="form-grid" id="seerr-form"><label class="field">Adresse Seerr<input class="input" name="baseUrl" value="${escapeHtml(seerr?.baseUrl ?? '')}" placeholder="https://seerr.exemple.fr" data-focusable="true" data-focus-key="settings:seerr-url"></label><label class="field">Clé API<input class="input" name="apiKey" type="password" value="" placeholder="${seerr ? 'Clé enregistrée — laisser vide pour la conserver' : 'X-Api-Key'}" autocomplete="off" data-focusable="true" data-focus-key="settings:seerr-key"></label><div class="status ${seerr ? 'success' : ''}" id="seerr-status">${seerr ? `Connecté à Seerr ${escapeHtml(seerr.version ?? '')}` : 'Non configuré'}</div><div class="actions"><button class="btn primary" data-focusable="true" data-focus-key="settings:seerr-save">Tester et enregistrer</button>${seerr ? '<button class="btn danger" type="button" data-clear-seerr data-focusable="true" data-focus-key="settings:seerr-clear">Supprimer</button>' : ''}</div></form>
      </section>
      <section class="setting-card"><h2>Serveur</h2><p>${escapeHtml(session?.serverName ?? (context.demo ? 'Mode démo' : 'Aucun serveur'))}<br>${escapeHtml(session?.serverUrl ?? '')}<br>${escapeHtml(session?.serverVersion ?? '')}</p>
        <button class="btn" data-focusable="true" data-focus-key="settings:diagnostics" data-route="diagnostics">Diagnostics</button>
        <button class="btn" data-focusable="true" data-focus-key="settings:about" data-route="about">À propos et licences</button>
      </section>
    </div>`,
    afterRender: () => {
      context.root.querySelectorAll<HTMLInputElement>('[data-home-enabled]').forEach((input) => input.addEventListener('change', () => updateHomeRow(profileKey, definitions, input.dataset.homeEnabled!, { enabled: input.checked })));
      context.root.querySelectorAll<HTMLSelectElement>('[data-home-image]').forEach((select) => select.addEventListener('change', () => updateHomeRow(profileKey, definitions, select.dataset.homeImage!, { imageType: select.value === 'landscape' ? 'landscape' : 'poster' })));
      context.root.querySelectorAll<HTMLInputElement>('[data-home-titles]').forEach((input) => input.addEventListener('change', () => updateHomeRow(profileKey, definitions, input.dataset.homeTitles!, { showTitles: input.checked })));
      context.root.querySelectorAll<HTMLButtonElement>('[data-home-move]').forEach((button) => button.addEventListener('click', () => { moveHomeRow(profileKey, definitions, button.dataset.homeMove!, Number(button.dataset.delta) < 0 ? -1 : 1); context.rerender(); }));
      const form = context.root.querySelector<HTMLFormElement>('#seerr-form');
      const status = context.root.querySelector<HTMLElement>('#seerr-status');
      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = form.querySelector<HTMLButtonElement>('button:not([type="button"])');
        if (submit) submit.disabled = true;
        const data = new FormData(form);
        try {
          const baseUrl = normalizeSeerrUrl(data.get('baseUrl'));
          const apiKey = String(data.get('apiKey') ?? '').trim() || seerr?.apiKey || '';
          if (!apiKey) throw new Error('Clé API Seerr requise.');
          const client = new SeerrClient({ baseUrl, apiKey });
          const result = await client.status(context.signal);
          saveSeerrConfig(profileKey, { baseUrl, apiKey, version: result.version, verifiedAt: new Date().toISOString() });
          if (status) { status.className = 'status success'; status.textContent = `Connecté à Seerr ${result.version}`; }
          context.toast('Configuration Seerr enregistrée.', 'success');
        } catch (error) { if (status) { status.className = 'status error'; status.textContent = error instanceof Error ? error.message : 'Connexion Seerr impossible.'; } }
        finally { if (submit) submit.disabled = false; }
      });
      context.root.querySelector<HTMLButtonElement>('[data-clear-seerr]')?.addEventListener('click', () => { clearSeerrConfig(profileKey); context.toast('Configuration Seerr supprimée.', 'success'); context.rerender(); });
    },
  };
}

export function renderAbout(): ScreenResult {
  return { title: 'À propos', html: `<section class="panel section prose"><h2>Wholphin Web</h2><p>Adaptation web non officielle de l’expérience Wholphin pour Jellyfin. Le projet reste sous GPL-2.0 et conserve les notices d’attribution.</p><p>Les fonctions Android TV sans équivalent navigateur — MPV, ExoPlayer et changement automatique de fréquence HDMI — sont documentées comme adaptations web et ne sont pas simulées.</p><p>Référence fonctionnelle figée dans <code>web/docs/REFERENCE_BASELINE.md</code>.</p></section>` };
}

export function renderDiagnostics(context: ScreenContext): ScreenResult {
  const session = context.store.activeSession();
  const report = {
    app: 'Wholphin Web 0.2.0', demo: context.demo, browser: navigator.userAgent, language: navigator.language, online: navigator.onLine,
    screen: `${screen.width}x${screen.height}@${devicePixelRatio}`, session: session ? { ...session, token: '[redacted]' } : null,
    api: context.api?.diagnostics() ?? null, seerr: redactedSeerrConfig(context.store.profileKey()),
    codecs: { h264: document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"'), hevc: document.createElement('video').canPlayType('video/mp4; codecs="hvc1"'), vp9: document.createElement('video').canPlayType('video/webm; codecs="vp9"'), av1: document.createElement('video').canPlayType('video/mp4; codecs="av01.0.05M.08"'), hls: document.createElement('video').canPlayType('application/vnd.apple.mpegurl') },
  };
  return { title: 'Diagnostics', html: `<section class="panel section prose"><p>Le rapport masque les jetons et clés API mais contient des informations techniques sur le navigateur et le serveur.</p><pre id="diagnostics-report">${escapeHtml(JSON.stringify(report, null, 2))}</pre><button class="btn primary" data-focusable="true" data-focus-key="diagnostics:copy" data-action="copy-diagnostics">Copier le rapport</button></section>` };
}
