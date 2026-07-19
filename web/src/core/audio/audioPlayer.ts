import type { JellyfinApi } from '../api/client';
import { escapeHtml } from '../html';
import { formatClock, secondsToTicks } from '../time';
import type { JellyfinItem } from '../../types/jellyfin';

type RepeatMode = 'off' | 'all' | 'one';

export class AudioPlayer {
  private readonly audio = new Audio();
  private readonly element: HTMLElement;
  private queue: JellyfinItem[] = [];
  private index = -1;
  private api: JellyfinApi | null = null;
  private demo = false;
  private repeat: RepeatMode = 'off';
  private reportTimer = 0;
  private activeItem: JellyfinItem | null = null;
  private playSessionId: string | undefined;

  constructor(private readonly toast: (message: string, tone?: 'neutral' | 'success' | 'error') => void) {
    this.element = document.createElement('aside');
    this.element.className = 'audio-player';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', 'Lecteur audio');
    document.body.append(this.element);
    this.bindAudio();
    this.bindMediaKeys();
  }

  async playQueue(queue: JellyfinItem[], startIndex: number, api: JellyfinApi | null, demo: boolean): Promise<void> {
    const playable = queue.filter((item) => item.Type === 'Audio');
    if (!playable.length) throw new Error('La file audio ne contient aucun titre lisible.');
    this.queue = playable;
    this.index = Math.max(0, Math.min(startIndex, playable.length - 1));
    this.api = api;
    this.demo = demo;
    this.render();
    if (demo || !api) {
      this.element.hidden = false;
      this.toast('Le mode démo ne contient aucun fichier audio.', 'neutral');
      return;
    }
    await this.playCurrent();
  }

  async close(): Promise<void> {
    await this.stopReporting(true);
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.activeItem = null;
    this.queue = [];
    this.index = -1;
    this.element.hidden = true;
  }

  private bindAudio(): void {
    this.audio.preload = 'metadata';
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('durationchange', () => this.updateProgress());
    this.audio.addEventListener('play', () => { this.render(); void this.startReporting(); });
    this.audio.addEventListener('pause', () => { this.render(); void this.reportProgress(); });
    this.audio.addEventListener('ended', () => void this.onEnded());
    this.audio.addEventListener('error', () => {
      this.toast('Lecture audio impossible pour ce titre.', 'error');
      this.render('Erreur de lecture');
    });
  }

  private bindMediaKeys(): void {
    document.addEventListener('keydown', (event) => {
      if (this.element.hidden) return;
      if (event.key === 'MediaPlayPause') { event.preventDefault(); void this.toggle(); }
      else if (event.key === 'MediaTrackNext') { event.preventDefault(); void this.next(); }
      else if (event.key === 'MediaTrackPrevious') { event.preventDefault(); void this.previous(); }
    });
  }

  private async playCurrent(): Promise<void> {
    const item = this.queue[this.index];
    if (!item || !this.api) return;
    await this.stopReporting(true);
    this.activeItem = item;
    this.playSessionId = crypto.randomUUID();
    const source = item.MediaSources?.[0];
    const url = this.api.url(`/Audio/${item.Id}/universal`, {
      UserId: this.api.userId,
      DeviceId: this.api.deviceId,
      MediaSourceId: source?.Id,
      MaxStreamingBitrate: 20_000_000,
      Container: 'mp3,aac,m4a,flac,ogg,opus,wav',
      AudioCodec: 'mp3',
      MaxAudioChannels: 2,
      TranscodingContainer: 'mp3',
      TranscodingProtocol: 'http',
      PlaySessionId: this.playSessionId,
      api_key: this.api.token,
    });
    this.audio.src = url;
    this.audio.load();
    this.element.hidden = false;
    this.render('Chargement…');
    try {
      await this.audio.play();
    } catch (error) {
      this.render('Lecture bloquée');
      this.toast(error instanceof Error ? error.message : 'Lecture audio bloquée.', 'error');
    }
  }

  private async toggle(): Promise<void> {
    if (this.demo || !this.activeItem) return;
    if (this.audio.paused) await this.audio.play();
    else this.audio.pause();
  }

  private async next(): Promise<void> {
    if (!this.queue.length) return;
    if (this.index >= this.queue.length - 1) {
      if (this.repeat !== 'all') { this.audio.pause(); this.audio.currentTime = 0; this.render(); return; }
      this.index = 0;
    } else this.index += 1;
    await this.playCurrent();
  }

  private async previous(): Promise<void> {
    if (this.audio.currentTime > 5) { this.audio.currentTime = 0; return; }
    if (!this.queue.length) return;
    this.index = this.index <= 0 ? (this.repeat === 'all' ? this.queue.length - 1 : 0) : this.index - 1;
    await this.playCurrent();
  }

  private async onEnded(): Promise<void> {
    if (this.repeat === 'one') { this.audio.currentTime = 0; await this.audio.play(); return; }
    await this.next();
  }

  private async startReporting(): Promise<void> {
    if (!this.api || !this.activeItem) return;
    window.clearInterval(this.reportTimer);
    try {
      await this.api.reportPlaying(this.activeItem.Id, {
        MediaSourceId: this.activeItem.MediaSources?.[0]?.Id,
        PlaySessionId: this.playSessionId,
        PositionTicks: secondsToTicks(this.audio.currentTime),
        IsPaused: false,
        PlayMethod: 'Transcode',
      });
    } catch { /* session reporting must not interrupt music */ }
    this.reportTimer = window.setInterval(() => void this.reportProgress(), 10_000);
  }

  private async reportProgress(): Promise<void> {
    if (!this.api || !this.activeItem) return;
    try {
      await this.api.reportProgress(this.activeItem.Id, {
        MediaSourceId: this.activeItem.MediaSources?.[0]?.Id,
        PlaySessionId: this.playSessionId,
        PositionTicks: secondsToTicks(this.audio.currentTime),
        IsPaused: this.audio.paused,
        IsMuted: this.audio.muted,
        VolumeLevel: Math.round(this.audio.volume * 100),
        PlayMethod: 'Transcode',
      });
    } catch { /* ignored */ }
  }

  private async stopReporting(stopped: boolean): Promise<void> {
    window.clearInterval(this.reportTimer);
    if (!stopped || !this.api || !this.activeItem) return;
    try {
      await this.api.reportStopped(this.activeItem.Id, {
        MediaSourceId: this.activeItem.MediaSources?.[0]?.Id,
        PlaySessionId: this.playSessionId,
        PositionTicks: secondsToTicks(this.audio.currentTime),
        PlayMethod: 'Transcode',
      });
    } catch { /* ignored */ }
  }

  private imageUrl(item: JellyfinItem): string {
    if (!this.api || this.demo) return '';
    const imageId = item.AlbumId ?? item.ParentId ?? item.Id;
    const tag = item.AlbumPrimaryImageTag ?? item.ImageTags?.Primary;
    return tag ? this.api.imageUrl(imageId, { type: 'Primary', maxWidth: 240, tag }) : '';
  }

  private render(status = ''): void {
    const item = this.queue[this.index];
    if (!item) { this.element.hidden = true; return; }
    const image = this.imageUrl(item);
    const subtitle = [item.AlbumArtist ?? item.Artists?.join(', '), item.Album].filter(Boolean).join(' — ');
    this.element.hidden = false;
    this.element.innerHTML = `<div class="audio-art">${image ? `<img src="${escapeHtml(image)}" alt="" width="72" height="72">` : '<span>♫</span>'}</div>
      <div class="audio-copy"><strong>${escapeHtml(item.Name)}</strong><span>${escapeHtml(status || subtitle || 'Musique')}</span></div>
      <div class="audio-controls">
        <button data-audio-action="previous" data-focusable="true" data-focus-zone="audio-player" data-focus-row="audio-controls" data-focus-key="audio:previous" aria-label="Titre précédent">⏮</button>
        <button data-audio-action="toggle" data-focusable="true" data-focus-zone="audio-player" data-focus-row="audio-controls" data-focus-key="audio:toggle" aria-label="${this.audio.paused ? 'Lire' : 'Pause'}">${this.audio.paused ? '▶' : 'Ⅱ'}</button>
        <button data-audio-action="next" data-focusable="true" data-focus-zone="audio-player" data-focus-row="audio-controls" data-focus-key="audio:next" aria-label="Titre suivant">⏭</button>
        <button data-audio-action="repeat" class="${this.repeat !== 'off' ? 'active' : ''}" data-focusable="true" data-focus-zone="audio-player" data-focus-row="audio-controls" data-focus-key="audio:repeat" aria-label="Répétition">${this.repeat === 'one' ? '↻1' : '↻'}</button>
        <button data-audio-action="close" data-focusable="true" data-focus-zone="audio-player" data-focus-row="audio-controls" data-focus-key="audio:close" aria-label="Fermer">×</button>
      </div>
      <div class="audio-progress"><span data-audio-current>${formatClock(this.audio.currentTime)}</span><input type="range" min="0" max="1000" value="${this.audio.duration ? Math.round(this.audio.currentTime / this.audio.duration * 1000) : 0}" data-audio-progress aria-label="Position audio"><span data-audio-duration>${formatClock(this.audio.duration)}</span></div>`;
    this.element.querySelector('[data-audio-action="previous"]')?.addEventListener('click', () => void this.previous());
    this.element.querySelector('[data-audio-action="toggle"]')?.addEventListener('click', () => void this.toggle());
    this.element.querySelector('[data-audio-action="next"]')?.addEventListener('click', () => void this.next());
    this.element.querySelector('[data-audio-action="repeat"]')?.addEventListener('click', () => {
      this.repeat = this.repeat === 'off' ? 'all' : this.repeat === 'all' ? 'one' : 'off';
      this.render();
    });
    this.element.querySelector('[data-audio-action="close"]')?.addEventListener('click', () => void this.close());
    this.element.querySelector<HTMLInputElement>('[data-audio-progress]')?.addEventListener('input', (event) => {
      const target = event.currentTarget as HTMLInputElement;
      if (this.audio.duration) this.audio.currentTime = Number(target.value) / 1000 * this.audio.duration;
    });
  }

  private updateProgress(): void {
    const current = this.element.querySelector<HTMLElement>('[data-audio-current]');
    const duration = this.element.querySelector<HTMLElement>('[data-audio-duration]');
    const progress = this.element.querySelector<HTMLInputElement>('[data-audio-progress]');
    if (current) current.textContent = formatClock(this.audio.currentTime);
    if (duration) duration.textContent = formatClock(this.audio.duration);
    if (progress) progress.value = this.audio.duration ? String(Math.round(this.audio.currentTime / this.audio.duration * 1000)) : '0';
  }
}
