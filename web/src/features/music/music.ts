import type { ScreenContext, ScreenResult } from '../../core/context';
import type { Route } from '../../core/router';
import { attribute, escapeHtml } from '../../core/html';
import { formatRuntime } from '../../core/time';
import { demoItems } from '../../demo/catalog';
import type { JellyfinItem } from '../../types/jellyfin';
import { imageUrl, mediaCard } from '../../ui/media';
import { AudioPlayer } from '../../core/audio/audioPlayer';

let persistentPlayer: AudioPlayer | null = null;

function player(context: ScreenContext): AudioPlayer {
  persistentPlayer ??= new AudioPlayer((message, tone) => context.toast(message, tone));
  return persistentPlayer;
}

interface MusicData {
  artists: JellyfinItem[];
  albums: JellyfinItem[];
  tracks: JellyfinItem[];
}

function demoMusic(): MusicData {
  const artists: JellyfinItem[] = Array.from({ length: 10 }, (_, index) => ({
    ...demoItems[index % demoItems.length]!,
    Id: `demo-artist-${index + 1}`,
    Name: `Artiste démo ${index + 1}`,
    Type: 'MusicArtist',
  }));
  const albums: JellyfinItem[] = Array.from({ length: 16 }, (_, index) => ({
    ...demoItems[(index + 3) % demoItems.length]!,
    Id: `demo-album-${index + 1}`,
    Name: `Album démo ${index + 1}`,
    Type: 'MusicAlbum',
    AlbumArtist: artists[index % artists.length]!.Name,
  }));
  const tracks: JellyfinItem[] = Array.from({ length: 42 }, (_, index) => ({
    Id: `demo-track-${index + 1}`,
    Name: `Titre ${index + 1}`,
    Type: 'Audio',
    IndexNumber: index + 1,
    RunTimeTicks: (170 + index % 80) * 10_000_000,
    Album: albums[Math.floor(index / 3) % albums.length]!.Name,
    AlbumId: albums[Math.floor(index / 3) % albums.length]!.Id,
    AlbumArtist: artists[index % artists.length]!.Name,
    Artists: [artists[index % artists.length]!.Name],
    ImageTags: albums[Math.floor(index / 3) % albums.length]!.ImageTags,
  }));
  return { artists, albums, tracks };
}

function trackRows(tracks: JellyfinItem[], context: ScreenContext): string {
  return `<div class="music-track-list">${tracks.map((track, index) => {
    const source = context.demo ? '' : imageUrl(track, context.api, false, 'Primary', 160);
    return `<button class="music-track" data-music-index="${index}" data-focusable="true" data-focus-zone="music-tracks" data-focus-row="music-track-list" data-focus-key="track:${attribute(track.Id)}">
      <span class="track-index">${track.IndexNumber ?? index + 1}</span>
      <span class="track-art">${source ? `<img src="${attribute(source)}" alt="" loading="lazy" width="48" height="48">` : '♫'}</span>
      <span class="track-copy"><strong>${escapeHtml(track.Name)}</strong><small>${escapeHtml([track.AlbumArtist ?? track.Artists?.join(', '), track.Album].filter(Boolean).join(' — '))}</small></span>
      <span class="track-duration">${escapeHtml(formatRuntime(track.RunTimeTicks))}</span>
      <span class="track-play">▶</span>
    </button>`;
  }).join('')}</div>`;
}

export async function renderMusic(context: ScreenContext, route: Extract<Route, { name: 'library' }>): Promise<ScreenResult> {
  let data: MusicData;
  if (context.demo) data = demoMusic();
  else {
    if (!context.api) throw new Error('Client Jellyfin indisponible.');
    const [artists, albums, tracks] = await Promise.all([
      context.api.items({ parentId: route.parentId, includeItemTypes: 'MusicArtist', limit: 160, sortBy: 'SortName', signal: context.signal }),
      context.api.items({ parentId: route.parentId, includeItemTypes: 'MusicAlbum', limit: 200, sortBy: 'AlbumArtist,SortName', signal: context.signal }),
      context.api.items({ parentId: route.parentId, includeItemTypes: 'Audio', limit: 500, sortBy: 'AlbumArtist,Album,ParentIndexNumber,IndexNumber,SortName', signal: context.signal }),
    ]);
    data = { artists: artists.Items, albums: albums.Items, tracks: tracks.Items };
  }
  for (const item of [...data.artists, ...data.albums, ...data.tracks]) context.items.set(item.Id, item);
  if (data.albums[0]) context.setBackdrop(data.albums[0]);
  return {
    title: route.title,
    html: `<div class="music-header"><div><span class="eyebrow">Bibliothèque musicale</span><h2>${escapeHtml(route.title)}</h2><p>${data.artists.length} artistes • ${data.albums.length} albums • ${data.tracks.length} titres</p></div><button class="btn primary" data-music-shuffle data-focusable="true" data-focus-key="music:shuffle">⤨ Lecture aléatoire</button></div>
      <div class="music-tabs" role="tablist"><button class="chip active" data-music-tab="artists" role="tab" aria-selected="true" data-focusable="true" data-focus-zone="music-tabs" data-focus-row="music-tabs" data-focus-key="music:artists">Artistes</button><button class="chip" data-music-tab="albums" role="tab" aria-selected="false" data-focusable="true" data-focus-zone="music-tabs" data-focus-row="music-tabs" data-focus-key="music:albums">Albums</button><button class="chip" data-music-tab="tracks" role="tab" aria-selected="false" data-focusable="true" data-focus-zone="music-tabs" data-focus-row="music-tabs" data-focus-key="music:tracks">Titres</button></div>
      <section data-music-panel="artists"><div class="media-grid">${data.artists.map((item) => mediaCard(item, { api: context.api, demo: context.demo, showTitles: true, rowKey: 'music-artists' })).join('')}</div></section>
      <section data-music-panel="albums" hidden><div class="media-grid">${data.albums.map((item) => mediaCard(item, { api: context.api, demo: context.demo, showTitles: true, rowKey: 'music-albums' })).join('')}</div></section>
      <section data-music-panel="tracks" hidden>${trackRows(data.tracks, context)}</section>`,
    afterRender: () => {
      context.root.querySelectorAll<HTMLButtonElement>('[data-music-tab]').forEach((tab) => tab.addEventListener('click', () => {
        const key = tab.dataset.musicTab;
        context.root.querySelectorAll<HTMLButtonElement>('[data-music-tab]').forEach((candidate) => { const selected = candidate === tab; candidate.classList.toggle('active', selected); candidate.setAttribute('aria-selected', String(selected)); });
        context.root.querySelectorAll<HTMLElement>('[data-music-panel]').forEach((panel) => { panel.hidden = panel.dataset.musicPanel !== key; });
        context.focus.invalidate();
        requestAnimationFrame(() => context.root.querySelector<HTMLElement>(`[data-music-panel="${key}"] [data-focusable="true"]`)?.focus());
      }));
      context.root.querySelectorAll<HTMLButtonElement>('[data-music-index]').forEach((button) => button.addEventListener('click', () => {
        void player(context).playQueue(data.tracks, Number(button.dataset.musicIndex), context.api, context.demo);
      }));
      context.root.querySelector<HTMLButtonElement>('[data-music-shuffle]')?.addEventListener('click', () => {
        const shuffled = [...data.tracks].sort(() => Math.random() - .5);
        void player(context).playQueue(shuffled, 0, context.api, context.demo);
      });
    },
  };
}
