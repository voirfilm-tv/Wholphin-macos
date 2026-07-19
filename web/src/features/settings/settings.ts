import type { ScreenContext, ScreenResult } from '../../core/context';
import { escapeHtml } from '../../core/html';

export function renderSettings(context: ScreenContext): ScreenResult {
  const preferences = context.store.preferences();
  const session = context.store.activeSession();
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
      <section class="setting-card"><h2>Serveur</h2><p>${escapeHtml(session?.serverName ?? (context.demo ? 'Mode démo' : 'Aucun serveur'))}<br>${escapeHtml(session?.serverUrl ?? '')}<br>${escapeHtml(session?.serverVersion ?? '')}</p>
        <button class="btn" data-focusable="true" data-focus-key="settings:diagnostics" data-route="diagnostics">Diagnostics</button>
        <button class="btn" data-focusable="true" data-focus-key="settings:about" data-route="about">À propos et licences</button>
      </section>
    </div>`,
  };
}

export function renderAbout(): ScreenResult {
  return {
    title: 'À propos',
    html: `<section class="panel section prose"><h2>Wholphin Web</h2><p>Adaptation web non officielle de l’expérience Wholphin pour Jellyfin. Le projet reste sous GPL-2.0 et conserve les notices d’attribution.</p><p>Les fonctions Android TV sans équivalent navigateur — MPV, ExoPlayer et changement automatique de fréquence HDMI — sont documentées comme adaptations web et ne sont pas simulées.</p><p>Référence fonctionnelle figée dans <code>web/docs/REFERENCE_BASELINE.md</code>.</p></section>`,
  };
}

export function renderDiagnostics(context: ScreenContext): ScreenResult {
  const session = context.store.activeSession();
  const report = {
    app: 'Wholphin Web 0.2.0',
    demo: context.demo,
    browser: navigator.userAgent,
    language: navigator.language,
    online: navigator.onLine,
    screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
    session: session ? { ...session, token: '[redacted]' } : null,
    api: context.api?.diagnostics() ?? null,
    codecs: {
      h264: document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"'),
      hevc: document.createElement('video').canPlayType('video/mp4; codecs="hvc1"'),
      vp9: document.createElement('video').canPlayType('video/webm; codecs="vp9"'),
      av1: document.createElement('video').canPlayType('video/mp4; codecs="av01.0.05M.08"'),
      hls: document.createElement('video').canPlayType('application/vnd.apple.mpegurl'),
    },
  };
  return {
    title: 'Diagnostics',
    html: `<section class="panel section prose"><p>Le rapport masque les jetons mais contient des informations techniques sur le navigateur et le serveur.</p><pre id="diagnostics-report">${escapeHtml(JSON.stringify(report, null, 2))}</pre><button class="btn primary" data-focusable="true" data-focus-key="diagnostics:copy" data-action="copy-diagnostics">Copier le rapport</button></section>`,
  };
}
