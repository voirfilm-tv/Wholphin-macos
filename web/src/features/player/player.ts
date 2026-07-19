import type { JellyfinApi } from '../../core/api/client';
import { formatClock, secondsToTicks, ticksToSeconds } from '../../core/time';
import { escapeHtml } from '../../core/html';
import type { JellyfinItem } from '../../types/jellyfin';

export interface PlayerOptions {
  item: JellyfinItem;
  api: JellyfinApi | null;
  demo: boolean;
  seekSeconds: number;
  onClose?: () => void;
}

export async function openPlayer(options: PlayerOptions): Promise<void> {
  const { item, api, demo, seekSeconds, onClose } = options;
  const shell = document.createElement('div');
  shell.className = 'player-shell';
  shell.innerHTML = `<video playsinline></video>
    <div class="player-scrim"></div>
    <div class="player-controls">
      <div class="player-title">${escapeHtml(item.SeriesName ? `${item.SeriesName} — ${item.Name}` : item.Name)}</div>
      <div class="progress-wrap"><span data-current>0:00</span><input data-progress type="range" min="0" max="1000" value="0" aria-label="Position de lecture"><span data-duration>0:00</span></div>
      <div class="player-actions">
        <button class="btn icon" data-focusable="true" data-focus-key="player:back" data-back aria-label="Fermer">←</button>
        <button class="btn icon" data-focusable="true" data-focus-key="player:rewind" data-rewind aria-label="Reculer">↶</button>
        <button class="btn primary" data-focusable="true" data-focus-key="player:toggle" data-toggle>Lire</button>
        <button class="btn icon" data-focusable="true" data-focus-key="player:forward" data-forward aria-label="Avancer">↷</button>
        <button class="btn" data-focusable="true" data-focus-key="player:mute" data-mute>Son</button>
        <button class="btn" data-focusable="true" data-focus-key="player:pip" data-pip>Image dans l’image</button>
        <button class="btn" data-focusable="true" data-focus-key="player:full" data-full>⛶ Plein écran</button>
      </div>
    </div>`;
  document.body.append(shell);

  const video = shell.querySelector('video')!;
  const progress = shell.querySelector<HTMLInputElement>('[data-progress]')!;
  const current = shell.querySelector<HTMLElement>('[data-current]')!;
  const duration = shell.querySelector<HTMLElement>('[data-duration]')!;
  const toggle = shell.querySelector<HTMLButtonElement>('[data-toggle]')!;
  let hls: { destroy(): void } | null = null;
  let playSessionId: string | undefined;
  let mediaSourceId: string | undefined;
  let playMethod: 'DirectPlay' | 'Transcode' = 'DirectPlay';
  let reportTimer = 0;
  let controlsTimer = 0;
  let closed = false;

  const showControls = () => {
    shell.classList.remove('controls-hidden');
    window.clearTimeout(controlsTimer);
    if (!video.paused) controlsTimer = window.setTimeout(() => shell.classList.add('controls-hidden'), 3_200);
  };

  const payload = () => ({
    MediaSourceId: mediaSourceId,
    PlaySessionId: playSessionId,
    PositionTicks: secondsToTicks(video.currentTime),
    IsPaused: video.paused,
    IsMuted: video.muted,
    VolumeLevel: Math.round(video.volume * 100),
    PlayMethod: playMethod,
  });

  const report = async (stopped = false) => {
    if (!api || demo || closed) return;
    try {
      if (stopped) await api.reportStopped(item.Id, payload());
      else await api.reportProgress(item.Id, payload());
    } catch { /* reporting must not interrupt playback */ }
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    window.clearInterval(reportTimer);
    window.clearTimeout(controlsTimer);
    await report(true);
    hls?.destroy();
    video.pause();
    document.removeEventListener('keydown', onKey, true);
    shell.remove();
    onClose?.();
  };

  const update = () => {
    current.textContent = formatClock(video.currentTime);
    duration.textContent = formatClock(video.duration);
    progress.value = video.duration ? String(Math.round(video.currentTime / video.duration * 1000)) : '0';
    toggle.textContent = video.paused ? 'Lire' : 'Pause';
  };

  const onKey = (event: KeyboardEvent) => {
    showControls();
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      void close();
    } else if ((event.key === ' ' || event.key === 'Enter') && !(event.target instanceof HTMLButtonElement) && !(event.target instanceof HTMLInputElement)) {
      event.preventDefault();
      void (video.paused ? video.play() : Promise.resolve(video.pause()));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - seekSeconds);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      video.currentTime = Math.min(video.duration || Infinity, video.currentTime + seekSeconds);
    }
  };

  shell.addEventListener('mousemove', showControls, { passive: true });
  shell.addEventListener('click', showControls);
  document.addEventListener('keydown', onKey, true);
  video.addEventListener('timeupdate', update);
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  video.addEventListener('ended', () => void report(true));
  shell.querySelector<HTMLElement>('[data-back]')!.addEventListener('click', () => void close());
  shell.querySelector<HTMLElement>('[data-toggle]')!.addEventListener('click', () => void (video.paused ? video.play() : Promise.resolve(video.pause())));
  shell.querySelector<HTMLElement>('[data-rewind]')!.addEventListener('click', () => { video.currentTime = Math.max(0, video.currentTime - seekSeconds); });
  shell.querySelector<HTMLElement>('[data-forward]')!.addEventListener('click', () => { video.currentTime = Math.min(video.duration || Infinity, video.currentTime + seekSeconds); });
  shell.querySelector<HTMLElement>('[data-mute]')!.addEventListener('click', (event) => {
    video.muted = !video.muted;
    (event.currentTarget as HTMLElement).textContent = video.muted ? 'Muet' : 'Son';
  });
  shell.querySelector<HTMLElement>('[data-full]')!.addEventListener('click', () => void shell.requestFullscreen?.());
  shell.querySelector<HTMLElement>('[data-pip]')!.addEventListener('click', async () => {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else if (document.pictureInPictureEnabled) await video.requestPictureInPicture();
  });
  progress.addEventListener('input', () => { if (video.duration) video.currentTime = Number(progress.value) / 1000 * video.duration; });

  showControls();
  shell.querySelector<HTMLButtonElement>('[data-toggle]')?.focus();
  if (demo || !api) {
    shell.insertAdjacentHTML('beforeend', '<div class="player-error"><div><h2>Lecteur de démonstration</h2><p>Connecte un serveur Jellyfin pour lancer une lecture réelle.</p><button class="btn primary" data-demo-close>Retour</button></div></div>');
    shell.querySelector<HTMLElement>('[data-demo-close]')!.addEventListener('click', () => void close());
    return;
  }

  try {
    const info = await api.playbackInfo(item.Id);
    const source = info.MediaSources?.[0] ?? item.MediaSources?.[0];
    playSessionId = info.PlaySessionId;
    mediaSourceId = source?.Id;
    const directUrl = source?.DirectStreamUrl ? api.url(source.DirectStreamUrl, { api_key: api.token }) : api.directStreamUrl(item.Id, mediaSourceId);
    const attemptDirect = new Promise<void>((resolve, reject) => {
      const cleanup = () => { video.removeEventListener('loadedmetadata', loaded); video.removeEventListener('error', failed); };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error('Lecture directe non supportée.')); };
      video.addEventListener('loadedmetadata', loaded, { once: true });
      video.addEventListener('error', failed, { once: true });
      video.src = directUrl;
      video.load();
    });
    try {
      await Promise.race([attemptDirect, new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Timeout direct play')), 6_500))]);
    } catch {
      playMethod = 'Transcode';
      const hlsUrl = source?.TranscodingUrl ? api.url(source.TranscodingUrl, { api_key: api.token }) : api.hlsUrl(item.Id, mediaSourceId, playSessionId);
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
        video.load();
      } else {
        const { default: Hls } = await import('hls.js');
        if (!Hls.isSupported()) throw new Error('Ce navigateur ne prend pas en charge HLS/MSE.');
        const instance = new Hls({ enableWorker: true, backBufferLength: 90, maxBufferLength: 30 });
        instance.loadSource(hlsUrl);
        instance.attachMedia(video);
        hls = instance;
      }
    }
    const resume = ticksToSeconds(item.UserData?.PlaybackPositionTicks);
    if (resume > 0) video.addEventListener('loadedmetadata', () => { video.currentTime = Math.max(0, resume - 5); }, { once: true });
    await api.reportPlaying(item.Id, { MediaSourceId: mediaSourceId, PlaySessionId: playSessionId, PlayMethod: playMethod });
    reportTimer = window.setInterval(() => void report(false), 10_000);
    await video.play();
  } catch (error) {
    shell.insertAdjacentHTML('beforeend', `<div class="player-error"><div><h2>Lecture impossible</h2><p>${escapeHtml(error instanceof Error ? error.message : 'Erreur inconnue.')}</p><button class="btn primary" data-error-close>Retour</button></div></div>`);
    shell.querySelector<HTMLElement>('[data-error-close]')!.addEventListener('click', () => void close());
  }
}
