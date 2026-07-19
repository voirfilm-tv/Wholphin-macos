import type { ScreenContext, ScreenResult } from '../../core/context';
import { attribute, escapeHtml } from '../../core/html';
import {
  addItemsToPlaylist,
  createPlaylist,
  getPlaylistItems,
  listPlaylists,
  movePlaylistEntry,
  removePlaylistEntries,
  renamePlaylist,
  type PlaylistEntry,
} from '../../core/api/playlists';
import type { JellyfinItem } from '../../types/jellyfin';
import { imageUrl } from '../../ui/media';
import { formatRuntime } from '../../core/time';

function demoEntries(): PlaylistEntry[] {
  return Array.from({ length: 12 }, (_, index) => ({
    Id: `demo-playlist-entry-${index + 1}`,
    PlaylistItemId: `demo-playlist-item-${index + 1}`,
    Name: `Élément de playlist ${index + 1}`,
    Type: index % 3 === 0 ? 'Audio' : index % 2 === 0 ? 'Episode' : 'Movie',
    RunTimeTicks: (1_800 + index * 120) * 10_000_000,
    ProductionYear: 2020 + index % 6,
  }));
}

function entryRow(entry: PlaylistEntry, index: number, total: number, context: ScreenContext): string {
  const source = context.demo ? '' : imageUrl(entry, context.api, false, 'Primary', 240) || imageUrl(entry, context.api, false, 'Backdrop', 320);
  const entryId = entry.PlaylistItemId ?? '';
  return `<article class="playlist-entry" data-playlist-row="${attribute(entryId)}">
    <button class="playlist-entry-open" data-open-item="${attribute(entry.Id)}" data-focusable="true" data-focus-zone="playlist-items" data-focus-row="playlist-list" data-focus-key="playlist:item:${attribute(entryId || entry.Id)}">
      <span class="playlist-index">${index + 1}</span>
      <span class="playlist-thumb">${source ? `<img src="${attribute(source)}" alt="" loading="lazy" decoding="async" width="112" height="64">` : '▶'}</span>
      <span class="playlist-copy"><strong>${escapeHtml(entry.Name)}</strong><small>${escapeHtml([entry.SeriesName, entry.ProductionYear, formatRuntime(entry.RunTimeTicks)].filter(Boolean).join(' • '))}</small></span>
    </button>
    <div class="playlist-entry-actions">
      <button class="btn icon small" data-play-item="${attribute(entry.Id)}" data-focusable="true" aria-label="Lire">▶</button>
      <button class="btn icon small" data-playlist-move="${attribute(entryId)}" data-playlist-index="${index}" data-delta="-1" ${!entryId || index === 0 ? 'disabled' : ''} data-focusable="true" aria-label="Monter">↑</button>
      <button class="btn icon small" data-playlist-move="${attribute(entryId)}" data-playlist-index="${index}" data-delta="1" ${!entryId || index === total - 1 ? 'disabled' : ''} data-focusable="true" aria-label="Descendre">↓</button>
      <button class="btn icon small danger" data-playlist-remove="${attribute(entryId)}" ${!entryId ? 'disabled' : ''} data-focusable="true" aria-label="Retirer">×</button>
    </div>
  </article>`;
}

export async function renderPlaylistDetail(context: ScreenContext, playlist: JellyfinItem): Promise<ScreenResult> {
  const entries = context.demo ? demoEntries() : context.api ? (await getPlaylistItems(context.api, playlist.Id, context.signal)).Items : [];
  for (const entry of entries) context.items.set(entry.Id, entry);
  return {
    title: playlist.Name,
    html: `<section class="playlist-detail panel">
      <div class="playlist-detail-header"><div><span class="eyebrow">Playlist</span><h1>${escapeHtml(playlist.Name)}</h1><p>${entries.length} élément${entries.length === 1 ? '' : 's'}</p></div>
        <div class="playlist-header-actions">
          ${entries[0] ? `<button class="btn primary" data-play-item="${attribute(entries[0].Id)}" data-focusable="true" data-focus-key="playlist:play">▶ Lire</button>` : ''}
          ${!context.demo ? '<button class="btn" data-playlist-rename data-focusable="true" data-focus-key="playlist:rename">Renommer</button>' : ''}
        </div>
      </div>
      <div class="playlist-list">${entries.length ? entries.map((entry, index) => entryRow(entry, index, entries.length, context)).join('') : '<div class="empty"><p>Cette playlist est vide.</p></div>'}</div>
    </section>`,
    afterRender: () => {
      if (!context.api || context.demo) return;
      context.root.querySelector<HTMLButtonElement>('[data-playlist-rename]')?.addEventListener('click', async () => {
        const value = window.prompt('Nouveau nom de la playlist', playlist.Name);
        if (!value || value.trim() === playlist.Name) return;
        try {
          await renamePlaylist(context.api!, playlist.Id, value, context.signal);
          context.toast('Playlist renommée.', 'success');
          context.rerender();
        } catch (error) {
          context.toast(error instanceof Error ? error.message : 'Renommage impossible.', 'error');
        }
      }, { signal: context.signal });
      context.root.querySelectorAll<HTMLButtonElement>('[data-playlist-remove]').forEach((button) => button.addEventListener('click', async () => {
        const entryId = button.dataset.playlistRemove;
        if (!entryId || !window.confirm('Retirer cet élément de la playlist ?')) return;
        try {
          await removePlaylistEntries(context.api!, playlist.Id, [entryId], context.signal);
          context.toast('Élément retiré.', 'success');
          context.rerender();
        } catch (error) {
          context.toast(error instanceof Error ? error.message : 'Suppression impossible.', 'error');
        }
      }, { signal: context.signal }));
      context.root.querySelectorAll<HTMLButtonElement>('[data-playlist-move]').forEach((button) => button.addEventListener('click', async () => {
        const entryId = button.dataset.playlistMove;
        const index = Number(button.dataset.playlistIndex);
        const delta = Number(button.dataset.delta);
        if (!entryId || !Number.isFinite(index) || !Number.isFinite(delta)) return;
        try {
          await movePlaylistEntry(context.api!, playlist.Id, entryId, index + delta, context.signal);
          context.rerender();
        } catch (error) {
          context.toast(error instanceof Error ? error.message : 'Déplacement impossible.', 'error');
        }
      }, { signal: context.signal }));
    },
  };
}

export async function openAddToPlaylistDialog(context: ScreenContext, item: JellyfinItem): Promise<void> {
  if (context.demo || !context.api) {
    context.toast('La modification des playlists nécessite un serveur Jellyfin.', 'neutral');
    return;
  }
  const playlists = await listPlaylists(context.api, context.signal);
  const dialog = document.createElement('div');
  dialog.className = 'modal-backdrop playlist-dialog';
  dialog.innerHTML = `<section class="panel modal-card" role="dialog" aria-modal="true" aria-labelledby="playlist-dialog-title">
    <h2 id="playlist-dialog-title">Ajouter « ${escapeHtml(item.Name)} »</h2>
    <label class="field"><span>Playlist existante</span><select data-playlist-select data-focusable="true">${playlists.map((playlist) => `<option value="${attribute(playlist.Id)}">${escapeHtml(playlist.Name)}</option>`).join('')}</select></label>
    <div class="modal-actions"><button class="btn primary" data-playlist-add ${playlists.length ? '' : 'disabled'} data-focusable="true">Ajouter</button></div>
    <hr>
    <label class="field"><span>Nouvelle playlist</span><input data-playlist-new-name maxlength="120" placeholder="Nom de la playlist" data-focusable="true"></label>
    <div class="modal-actions"><button class="btn" data-playlist-create data-focusable="true">Créer et ajouter</button><button class="btn" data-playlist-close data-focusable="true">Fermer</button></div>
  </section>`;
  context.root.append(dialog);
  context.focus.invalidate();
  dialog.querySelector<HTMLElement>('[data-playlist-select], [data-playlist-new-name]')?.focus();
  const close = () => { dialog.remove(); context.focus.invalidate(); };
  dialog.addEventListener('click', (event) => { if (event.target === dialog || (event.target as Element).closest('[data-playlist-close]')) close(); }, { signal: context.signal });
  dialog.addEventListener('keydown', (event) => { if (event.key === 'Escape' || event.key === 'Backspace') { event.preventDefault(); close(); } }, { signal: context.signal });
  dialog.querySelector<HTMLButtonElement>('[data-playlist-add]')?.addEventListener('click', async () => {
    const id = dialog.querySelector<HTMLSelectElement>('[data-playlist-select]')?.value;
    if (!id) return;
    try {
      await addItemsToPlaylist(context.api!, id, [item.Id], context.signal);
      context.toast('Ajouté à la playlist.', 'success');
      close();
    } catch (error) { context.toast(error instanceof Error ? error.message : 'Ajout impossible.', 'error'); }
  }, { signal: context.signal });
  dialog.querySelector<HTMLButtonElement>('[data-playlist-create]')?.addEventListener('click', async () => {
    const name = dialog.querySelector<HTMLInputElement>('[data-playlist-new-name]')?.value ?? '';
    try {
      await createPlaylist(context.api!, name, [item.Id], context.signal);
      context.toast('Playlist créée.', 'success');
      close();
    } catch (error) { context.toast(error instanceof Error ? error.message : 'Création impossible.', 'error'); }
  }, { signal: context.signal });
}
