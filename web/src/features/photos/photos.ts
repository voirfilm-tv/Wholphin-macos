import type { ScreenContext, ScreenResult } from '../../core/context';
import type { Route } from '../../core/router';
import { attribute, escapeHtml } from '../../core/html';
import { demoItems } from '../../demo/catalog';
import type { JellyfinItem } from '../../types/jellyfin';
import { imageUrl, mediaCard } from '../../ui/media';
import { PhotoSlideshow } from '../../core/photos/slideshow';

const slideshow = new PhotoSlideshow();

function demoPhotos(): { albums: JellyfinItem[]; photos: JellyfinItem[] } {
  const albums = Array.from({ length: 7 }, (_, index) => ({ ...demoItems[index]!, Id: `demo-photo-album-${index + 1}`, Name: `Album photo ${index + 1}`, Type: 'PhotoAlbum' } satisfies JellyfinItem));
  const photos = Array.from({ length: 48 }, (_, index) => ({ ...demoItems[index % demoItems.length]!, Id: `demo-photo-${index + 1}`, Name: `Photo ${index + 1}`, Type: 'Photo', ParentId: albums[Math.floor(index / 8) % albums.length]!.Id } satisfies JellyfinItem));
  return { albums, photos };
}

function photoGrid(photos: JellyfinItem[], context: ScreenContext): string {
  return `<div class="photo-grid">${photos.map((photo, index) => {
    const source = context.demo ? imageUrl(photo, context.api, true, 'Backdrop', 1200) : imageUrl(photo, context.api, false, 'Primary', 1000);
    return `<button class="photo-card" data-photo-index="${index}" data-focusable="true" data-focus-zone="photos" data-focus-row="photo-grid" data-focus-key="photo:${attribute(photo.Id)}" aria-label="${attribute(photo.Name)}">${source ? `<img src="${attribute(source)}" alt="" loading="lazy" decoding="async" width="480" height="320">` : `<span>${escapeHtml(photo.Name)}</span>`}<span class="photo-title">${escapeHtml(photo.Name)}</span></button>`;
  }).join('')}</div>`;
}

export async function renderPhotos(context: ScreenContext, route: Extract<Route, { name: 'library' }>): Promise<ScreenResult> {
  const data = context.demo ? demoPhotos() : await (async () => {
    if (!context.api) throw new Error('Client Jellyfin indisponible.');
    const [albums, photos] = await Promise.all([
      context.api.items({ parentId: route.parentId, includeItemTypes: 'PhotoAlbum', limit: 200, sortBy: 'SortName', signal: context.signal }),
      context.api.items({ parentId: route.parentId, includeItemTypes: 'Photo', limit: 1000, sortBy: 'DateCreated,SortName', sortOrder: 'Descending', signal: context.signal }),
    ]);
    return { albums: albums.Items, photos: photos.Items };
  })();
  for (const item of [...data.albums, ...data.photos]) context.items.set(item.Id, item);
  if (data.photos[0]) context.setBackdrop(data.photos[0]);
  return {
    title: route.title,
    html: `<div class="photo-header"><div><span class="eyebrow">Photothèque</span><h2>${escapeHtml(route.title)}</h2><p>${data.albums.length} albums • ${data.photos.length} photos</p></div>${data.photos.length ? '<button class="btn primary" data-start-slideshow data-focusable="true" data-focus-key="photos:start">▶ Lancer le diaporama</button>' : ''}</div>
      <div class="photo-tabs" role="tablist"><button class="chip active" data-photo-tab="photos" role="tab" aria-selected="true" data-focusable="true" data-focus-zone="photo-tabs" data-focus-row="photo-tabs" data-focus-key="photos:all">Photos</button><button class="chip" data-photo-tab="albums" role="tab" aria-selected="false" data-focusable="true" data-focus-zone="photo-tabs" data-focus-row="photo-tabs" data-focus-key="photos:albums">Albums</button></div>
      <section data-photo-panel="photos">${data.photos.length ? photoGrid(data.photos, context) : '<div class="empty"><p>Aucune photo disponible.</p></div>'}</section>
      <section data-photo-panel="albums" hidden><div class="media-grid">${data.albums.map((album) => mediaCard(album, { api: context.api, demo: context.demo, showTitles: true, rowKey: 'photo-albums', landscape: true })).join('')}</div></section>`,
    afterRender: () => {
      context.root.querySelectorAll<HTMLButtonElement>('[data-photo-tab]').forEach((tab) => tab.addEventListener('click', () => {
        const key = tab.dataset.photoTab;
        context.root.querySelectorAll<HTMLButtonElement>('[data-photo-tab]').forEach((candidate) => { const selected = candidate === tab; candidate.classList.toggle('active', selected); candidate.setAttribute('aria-selected', String(selected)); });
        context.root.querySelectorAll<HTMLElement>('[data-photo-panel]').forEach((panel) => { panel.hidden = panel.dataset.photoPanel !== key; });
        context.focus.invalidate();
      }));
      context.root.querySelectorAll<HTMLButtonElement>('[data-photo-index]').forEach((button) => button.addEventListener('click', () => slideshow.open(data.photos, Number(button.dataset.photoIndex), context.api, context.demo)));
      context.root.querySelector<HTMLButtonElement>('[data-start-slideshow]')?.addEventListener('click', () => slideshow.open(data.photos, 0, context.api, context.demo));
    },
  };
}
