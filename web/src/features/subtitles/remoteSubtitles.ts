import type { ScreenContext } from '../../core/context';
import { attribute, escapeHtml } from '../../core/html';
import { downloadRemoteSubtitle, searchRemoteSubtitles, type RemoteSubtitleInfo } from '../../core/api/subtitles';
import type { JellyfinItem } from '../../types/jellyfin';

const LANGUAGES = [
  ['fra', 'Français'],
  ['eng', 'English'],
  ['spa', 'Español'],
  ['deu', 'Deutsch'],
  ['ita', 'Italiano'],
  ['por', 'Português'],
  ['nld', 'Nederlands'],
  ['jpn', '日本語'],
] as const;

function subtitleBadges(subtitle: RemoteSubtitleInfo): string {
  return [
    subtitle.IsHashMatch ? '<span class="chip success">Correspondance exacte</span>' : '',
    subtitle.HearingImpaired ? '<span class="chip">SME</span>' : '',
    subtitle.Forced ? '<span class="chip">Forcé</span>' : '',
    subtitle.AiTranslated || subtitle.MachineTranslated ? '<span class="chip warning">Traduction automatique</span>' : '',
  ].join('');
}

function resultRow(subtitle: RemoteSubtitleInfo, index: number): string {
  const id = subtitle.Id ?? '';
  const details = [subtitle.ProviderName, subtitle.Format?.toUpperCase(), subtitle.Author, subtitle.FrameRate ? `${subtitle.FrameRate} fps` : ''].filter(Boolean).join(' • ');
  return `<article class="remote-subtitle-row">
    <div class="remote-subtitle-copy"><strong>${escapeHtml(subtitle.Name ?? `Sous-titre ${index + 1}`)}</strong><small>${escapeHtml(details)}</small><div class="remote-subtitle-badges">${subtitleBadges(subtitle)}</div>${subtitle.Comment ? `<p>${escapeHtml(subtitle.Comment)}</p>` : ''}</div>
    <div class="remote-subtitle-meta"><span>${subtitle.CommunityRating ? `★ ${subtitle.CommunityRating.toFixed(1)}` : ''}</span><span>${subtitle.DownloadCount ? `${subtitle.DownloadCount.toLocaleString()} téléchargements` : ''}</span><button class="btn primary" data-download-subtitle="${attribute(id)}" ${id ? '' : 'disabled'} data-focusable="true" data-focus-key="subtitle:${index}">Télécharger</button></div>
  </article>`;
}

export function openRemoteSubtitleDialog(context: ScreenContext, item: JellyfinItem): void {
  context.root.querySelector('.remote-subtitle-dialog')?.remove();
  const dialog = document.createElement('div');
  dialog.className = 'modal-backdrop remote-subtitle-dialog';
  dialog.innerHTML = `<section class="panel modal-card" role="dialog" aria-modal="true" aria-labelledby="remote-subtitle-title">
    <div class="modal-heading"><div><span class="eyebrow">Sous-titres distants</span><h2 id="remote-subtitle-title">${escapeHtml(item.Name)}</h2></div><button class="btn icon" data-close-subtitles data-focusable="true" aria-label="Fermer">×</button></div>
    <form class="remote-subtitle-search"><label class="field"><span>Langue</span><select name="language" data-focusable="true" data-focus-key="subtitles:language">${LANGUAGES.map(([value, label]) => `<option value="${value}" ${value === (context.store.preferences().language === 'en' ? 'eng' : 'fra') ? 'selected' : ''}>${label}</option>`).join('')}</select></label><button class="btn primary" data-focusable="true" data-focus-key="subtitles:search">Rechercher</button></form>
    <div class="remote-subtitle-status" data-subtitle-status>Choisis une langue puis lance la recherche.</div>
    <div class="remote-subtitle-results" data-subtitle-results></div>
  </section>`;
  context.root.append(dialog);
  context.focus.invalidate();
  dialog.querySelector<HTMLElement>('select')?.focus();
  let searchController: AbortController | null = null;
  const close = () => { searchController?.abort(); dialog.remove(); context.focus.invalidate(); };
  dialog.addEventListener('click', (event) => { if (event.target === dialog || (event.target as Element).closest('[data-close-subtitles]')) close(); }, { signal: context.signal });
  dialog.addEventListener('keydown', (event) => { if (event.key === 'Escape' || event.key === 'Backspace') { event.preventDefault(); close(); } }, { signal: context.signal });
  const form = dialog.querySelector<HTMLFormElement>('.remote-subtitle-search')!;
  const status = dialog.querySelector<HTMLElement>('[data-subtitle-status]')!;
  const results = dialog.querySelector<HTMLElement>('[data-subtitle-results]')!;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!context.api || context.demo) {
      status.className = 'remote-subtitle-status error';
      status.textContent = 'La recherche nécessite un serveur Jellyfin réel et un fournisseur de sous-titres configuré.';
      return;
    }
    searchController?.abort();
    searchController = new AbortController();
    const signal = AbortSignal.any([context.signal, searchController.signal]);
    const language = new FormData(form).get('language')?.toString() ?? 'fra';
    status.className = 'remote-subtitle-status';
    status.textContent = 'Recherche en cours…';
    results.innerHTML = '';
    try {
      const subtitles = await searchRemoteSubtitles(context.api, item.Id, language, signal);
      if (signal.aborted) return;
      status.textContent = subtitles.length ? `${subtitles.length} résultat${subtitles.length === 1 ? '' : 's'}.` : 'Aucun résultat. Vérifie les fournisseurs configurés dans la bibliothèque Jellyfin.';
      results.innerHTML = subtitles.map(resultRow).join('');
      context.focus.invalidate();
      results.querySelectorAll<HTMLButtonElement>('[data-download-subtitle]').forEach((button) => button.addEventListener('click', async () => {
        const subtitleId = button.dataset.downloadSubtitle;
        if (!subtitleId || !context.api) return;
        button.disabled = true;
        button.textContent = 'Téléchargement…';
        try {
          await downloadRemoteSubtitle(context.api, item.Id, subtitleId, signal);
          button.textContent = 'Installé';
          context.toast('Sous-titre téléchargé. Il sera disponible à la prochaine ouverture du lecteur.', 'success');
        } catch (error) {
          button.disabled = false;
          button.textContent = 'Réessayer';
          context.toast(error instanceof Error ? error.message : 'Téléchargement impossible.', 'error');
        }
      }, { signal }));
    } catch (error) {
      if (signal.aborted) return;
      status.className = 'remote-subtitle-status error';
      status.textContent = error instanceof Error ? error.message : 'Recherche de sous-titres impossible.';
    }
  }, { signal: context.signal });
}
