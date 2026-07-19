import { secondsToTicks, ticksToSeconds } from './api.js';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`;
}

export async function openPlayer({ item, api, demo = false, onClose, seekSeconds = 10 }) {
  const shell = document.createElement('div');
  shell.className = 'player-shell';
  shell.innerHTML = `
    <video playsinline></video>
    <div class="player-controls">
      <div class="player-title"></div>
      <div class="progress-wrap">
        <span data-current>0:00</span>
        <input data-progress type="range" min="0" max="1000" value="0" aria-label="Position de lecture" />
        <span data-duration>0:00</span>
      </div>
      <div class="player-actions">
        <button class="btn icon" data-back aria-label="Fermer">←</button>
        <button class="btn icon" data-rewind aria-label="Reculer">↶</button>
        <button class="btn primary" data-toggle>Lire</button>
        <button class="btn icon" data-forward aria-label="Avancer">↷</button>
        <button class="btn" data-mute>Son</button>
        <button class="btn" data-pip>Image dans l’image</button>
        <button class="btn" data-full>⛶ Plein écran</button>
      </div>
    </div>
  `;
  document.body.appendChild(shell);

  const video = shell.querySelector('video');
  const title = shell.querySelector('.player-title');
  const toggle = shell.querySelector('[data-toggle]');
  const progress = shell.querySelector('[data-progress]');
  const current = shell.querySelector('[data-current]');
  const duration = shell.querySelector('[data-duration]');
  title.textContent = item.Name;

  let hlsInstance = null;
  let playSessionId = null;
  let mediaSourceId = item.MediaSources?.[0]?.Id;
  let reportTimer = null;
  let controlsTimer = null;
  let closed = false;

  const showControls = () => {
    shell.classList.remove('controls-hidden');
    clearTimeout(controlsTimer);
    if (!video.paused) controlsTimer = setTimeout(() => shell.classList.add('controls-hidden'), 3200);
  };

  const reportProgress = async (stopped = false) => {
    if (demo || !api || closed) return;
    const payload = {
      MediaSourceId: mediaSourceId,
      PlaySessionId: playSessionId,
      PositionTicks: secondsToTicks(video.currentTime),
      IsPaused: video.paused,
      IsMuted: video.muted,
      VolumeLevel: Math.round(video.volume * 100),
      PlayMethod: 'DirectPlay'
    };
    try {
      if (stopped) await api.reportStopped(item.Id, payload);
      else await api.reportProgress(item.Id, payload);
    } catch { /* progress reports should not interrupt playback */ }
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    clearInterval(reportTimer);
    clearTimeout(controlsTimer);
    await reportProgress(true);
    hlsInstance?.destroy?.();
    video.pause();
    shell.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };

  const setSource = async () => {
    if (demo) {
      shell.querySelector('.player-controls').insertAdjacentHTML('beforebegin', '<div class="player-error"><div><h2>Lecteur de démonstration</h2><p>Le mode démo ne fournit aucun fichier vidéo. Connecte un serveur Jellyfin pour lancer une lecture réelle.</p><button class="btn primary" data-demo-close>Retour</button></div></div>');
      shell.querySelector('[data-demo-close]').addEventListener('click', close);
      return;
    }

    try {
      const info = await api.playbackInfo(item.Id);
      const source = info.MediaSources?.[0] || item.MediaSources?.[0];
      playSessionId = info.PlaySessionId;
      mediaSourceId = source?.Id;
      const directUrl = api.streamUrl(item.Id, mediaSourceId);
      video.src = directUrl;

      const attempt = () => new Promise((resolve, reject) => {
        const ok = () => { cleanup(); resolve(); };
        const fail = () => { cleanup(); reject(new Error('Lecture directe non supportée')); };
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', ok);
          video.removeEventListener('error', fail);
        };
        video.addEventListener('loadedmetadata', ok, { once: true });
        video.addEventListener('error', fail, { once: true });
        video.load();
      });

      try {
        await Promise.race([attempt(), new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout direct play')), 6500))]);
      } catch {
        const hlsUrl = api.hlsUrl(item.Id, mediaSourceId, playSessionId);
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl;
          video.load();
        } else {
          const { default: Hls } = await import('https://cdn.jsdelivr.net/npm/hls.js@1.5.18/+esm');
          if (!Hls.isSupported()) throw new Error('Ce navigateur ne prend pas en charge HLS/MSE.');
          hlsInstance = new Hls({ enableWorker: true, backBufferLength: 90 });
          hlsInstance.loadSource(hlsUrl);
          hlsInstance.attachMedia(video);
        }
      }

      const resume = ticksToSeconds(item.UserData?.PlaybackPositionTicks);
      if (resume > 0) video.addEventListener('loadedmetadata', () => { video.currentTime = Math.max(0, resume - 5); }, { once: true });
      await api.reportPlaying(item.Id, { MediaSourceId: mediaSourceId, PlaySessionId: playSessionId });
      reportTimer = setInterval(() => reportProgress(false), 10_000);
      await video.play();
    } catch (error) {
      shell.querySelector('.player-controls').insertAdjacentHTML('beforebegin', `<div class="player-error"><div><h2>Lecture impossible</h2><p>${escapeHtml(error.message)}</p><button class="btn primary" data-error-close>Retour</button></div></div>`);
      shell.querySelector('[data-error-close]').addEventListener('click', close);
    }
  };

  const update = () => {
    current.textContent = formatTime(video.currentTime);
    duration.textContent = formatTime(video.duration);
    progress.value = video.duration ? String(Math.round(video.currentTime / video.duration * 1000)) : '0';
    toggle.textContent = video.paused ? 'Lire' : 'Pause';
  };

  const onKey = event => {
    showControls();
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault(); close();
    } else if (event.key === ' ' || event.key === 'Enter') {
      if (event.target.matches('button,input')) return;
      event.preventDefault(); video.paused ? video.play() : video.pause();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault(); video.currentTime = Math.max(0, video.currentTime - seekSeconds);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault(); video.currentTime = Math.min(video.duration || Infinity, video.currentTime + seekSeconds);
    }
  };

  shell.addEventListener('mousemove', showControls);
  shell.addEventListener('click', showControls);
  document.addEventListener('keydown', onKey);
  video.addEventListener('timeupdate', update);
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  video.addEventListener('ended', () => reportProgress(true));
  shell.querySelector('[data-back]').addEventListener('click', close);
  shell.querySelector('[data-toggle]').addEventListener('click', () => video.paused ? video.play() : video.pause());
  shell.querySelector('[data-rewind]').addEventListener('click', () => { video.currentTime = Math.max(0, video.currentTime - seekSeconds); });
  shell.querySelector('[data-forward]').addEventListener('click', () => { video.currentTime = Math.min(video.duration || Infinity, video.currentTime + seekSeconds); });
  shell.querySelector('[data-mute]').addEventListener('click', event => { video.muted = !video.muted; event.currentTarget.textContent = video.muted ? 'Muet' : 'Son'; });
  shell.querySelector('[data-full]').addEventListener('click', () => shell.requestFullscreen?.());
  shell.querySelector('[data-pip]').addEventListener('click', async () => {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else if (document.pictureInPictureEnabled) await video.requestPictureInPicture();
  });
  progress.addEventListener('input', () => { if (video.duration) video.currentTime = Number(progress.value) / 1000 * video.duration; });

  showControls();
  await setSource();
  return { close };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
