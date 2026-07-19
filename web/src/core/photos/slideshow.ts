import type { JellyfinApi } from '../api/client';
import { escapeHtml } from '../html';
import { demoGradient } from '../../demo/catalog';
import type { JellyfinItem } from '../../types/jellyfin';

export class PhotoSlideshow {
  private shell: HTMLElement | null = null;
  private photos: JellyfinItem[] = [];
  private index = 0;
  private api: JellyfinApi | null = null;
  private demo = false;
  private timer = 0;
  private playing = false;
  private intervalSeconds = 8;

  constructor() {
    new MutationObserver(() => {
      if (document.querySelector('.auth-page')) this.close();
    }).observe(document.body, { childList: true, subtree: true });
  }

  open(photos: JellyfinItem[], startIndex: number, api: JellyfinApi | null, demo: boolean): void {
    this.close();
    this.photos = photos;
    this.index = Math.max(0, Math.min(startIndex, photos.length - 1));
    this.api = api;
    this.demo = demo;
    this.shell = document.createElement('div');
    this.shell.className = 'slideshow-shell';
    document.body.append(this.shell);
    document.addEventListener('keydown', this.onKey, true);
    this.render();
  }

  close(): void {
    window.clearInterval(this.timer);
    this.playing = false;
    document.removeEventListener('keydown', this.onKey, true);
    this.shell?.remove();
    this.shell = null;
  }

  private source(item: JellyfinItem): string {
    if (this.demo) return demoGradient(item, true);
    const tag = item.ImageTags?.Primary;
    return this.api && tag ? this.api.imageUrl(item.Id, { type: 'Primary', maxWidth: 3840, quality: 94, tag }) : '';
  }

  private render(): void {
    const item = this.photos[this.index];
    if (!this.shell || !item) return;
    const source = this.source(item);
    const next = this.photos[(this.index + 1) % this.photos.length];
    if (next) { const preload = new Image(); preload.src = this.source(next); }
    this.shell.innerHTML = `<div class="slideshow-image-wrap">${source ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(item.Name)}">` : '<div class="slideshow-empty">Image indisponible</div>'}</div>
      <div class="slideshow-overlay">
        <div class="slideshow-copy"><strong>${escapeHtml(item.Name)}</strong><span>${this.index + 1} / ${this.photos.length}</span></div>
        <div class="slideshow-actions">
          <button data-slide-action="close" data-focusable="true" data-focus-zone="slideshow" data-focus-row="slideshow-controls" data-focus-key="slide:close" aria-label="Fermer">×</button>
          <button data-slide-action="previous" data-focusable="true" data-focus-zone="slideshow" data-focus-row="slideshow-controls" data-focus-key="slide:previous" aria-label="Photo précédente">←</button>
          <button data-slide-action="toggle" data-focusable="true" data-focus-zone="slideshow" data-focus-row="slideshow-controls" data-focus-key="slide:toggle">${this.playing ? 'Pause' : 'Diaporama'}</button>
          <button data-slide-action="next" data-focusable="true" data-focus-zone="slideshow" data-focus-row="slideshow-controls" data-focus-key="slide:next" aria-label="Photo suivante">→</button>
          <label>Intervalle <select data-slide-interval data-focusable="true" data-focus-zone="slideshow" data-focus-row="slideshow-controls" data-focus-key="slide:interval"><option value="5" ${this.intervalSeconds === 5 ? 'selected' : ''}>5 s</option><option value="8" ${this.intervalSeconds === 8 ? 'selected' : ''}>8 s</option><option value="15" ${this.intervalSeconds === 15 ? 'selected' : ''}>15 s</option></select></label>
        </div>
      </div>`;
    this.shell.querySelector('[data-slide-action="close"]')?.addEventListener('click', () => this.close());
    this.shell.querySelector('[data-slide-action="previous"]')?.addEventListener('click', () => this.previous());
    this.shell.querySelector('[data-slide-action="toggle"]')?.addEventListener('click', () => this.toggle());
    this.shell.querySelector('[data-slide-action="next"]')?.addEventListener('click', () => this.next());
    this.shell.querySelector<HTMLSelectElement>('[data-slide-interval]')?.addEventListener('change', (event) => {
      this.intervalSeconds = Number((event.currentTarget as HTMLSelectElement).value);
      if (this.playing) this.startTimer();
    });
  }

  private next(): void {
    if (!this.photos.length) return;
    this.index = (this.index + 1) % this.photos.length;
    this.render();
  }

  private previous(): void {
    if (!this.photos.length) return;
    this.index = (this.index - 1 + this.photos.length) % this.photos.length;
    this.render();
  }

  private toggle(): void {
    this.playing = !this.playing;
    if (this.playing) this.startTimer();
    else window.clearInterval(this.timer);
    this.render();
  }

  private startTimer(): void {
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.next(), this.intervalSeconds * 1000);
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (!this.shell) return;
    if (event.key === 'Escape' || event.key === 'Backspace' || event.key === 'BrowserBack') { event.preventDefault(); event.stopPropagation(); this.close(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); this.next(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); this.previous(); }
    else if (event.key === ' ' && !(event.target instanceof HTMLSelectElement)) { event.preventDefault(); this.toggle(); }
  };
}
