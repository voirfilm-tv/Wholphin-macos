import type { JellyfinApi } from '../../core/api/client';
import { escapeHtml } from '../../core/html';
import { formatClock, secondsToTicks, ticksToSeconds } from '../../core/time';
import type { JellyfinChapter, JellyfinItem, JellyfinMediaSource, JellyfinMediaStream } from '../../types/jellyfin';

export interface PlayerOptions {
  item: JellyfinItem;
  api: JellyfinApi | null;
  demo: boolean;
  seekSeconds: number;
  nextItem?: JellyfinItem | null;
  stillWatchingAfter?: number;
  onPlayNext?: (item: JellyfinItem) => void | Promise<void>;
  onClose?: () => void;
}

interface PlayerChoice {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  action: () => void | Promise<void>;
}

interface MediaSegment {
  Type?: 'Intro' | 'Outro' | 'Recap' | 'Commercial' | 'Preview' | 'Unknown' | string;
  StartTicks?: number;
  EndTicks?: number;
}

interface MediaSegmentResult {
  Items?: MediaSegment[];
}

let bingeSeriesId = '';
let consecutiveEpisodes = 0;

function streamLabel(stream: JellyfinMediaStream): string {
  return stream.DisplayTitle ?? stream.Title ?? ([stream.Language, stream.Codec, stream.ChannelLayout].filter(Boolean).join(' • ') || `Piste ${stream.Index ?? '?'}`);
}

function sourceLabel(source: JellyfinMediaSource, index: number): string {
  const bitrate = source.Bitrate ? `${Math.round(source.Bitrate / 1_000_000)} Mb/s` : '';
  return source.Name ?? ([source.Container?.toUpperCase(), source.VideoType, bitrate].filter(Boolean).join(' • ') || `Version ${index + 1}`);
}

function segmentLabel(type: string | undefined): string {
  if (type === 'Intro') return 'Passer l’introduction';
  if (type === 'Outro') return 'Passer le générique';
  if (type === 'Recap') return 'Passer le résumé';
  if (type === 'Commercial') return 'Passer la publicité';
  if (type === 'Preview') return 'Passer l’aperçu';
  return 'Passer le segment';
}

export async function openPlayer(options: PlayerOptions): Promise<void> {
  const {
    item,
    api,
    demo,
    seekSeconds,
    nextItem = null,
    stillWatchingAfter = 3,
    onPlayNext,
    onClose,
  } = options;

  const shell = document.createElement('div');
  shell.className = 'player-shell';
  shell.innerHTML = `<video playsinline></video>
    <div class="player-scrim"></div>
    <button class="btn accent player-skip-segment" data-skip-segment hidden></button>
    <div class="player-controls">
      <div class="player-title">${escapeHtml(item.SeriesName ? `${item.SeriesName} — ${item.Name}` : item.Name)}</div>
      <div class="progress-wrap"><span data-current>0:00</span><input data-progress type="range" min="0" max="1000" value="0" aria-label="Position de lecture"><span data-duration>0:00</span></div>
      <div class="player-actions">
        <button class="btn icon" data-back aria-label="Fermer">←</button>
        <button class="btn icon" data-rewind aria-label="Reculer">↶</button>
        <button class="btn primary" data-toggle>Lire</button>
        <button class="btn icon" data-forward aria-label="Avancer">↷</button>
        <button class="btn" data-next ${nextItem ? '' : 'hidden'}>Épisode suivant</button>
        <button class="btn" data-tracks>Pistes</button>
        <button class="btn" data-chapters>Chapitres</button>
        <button class="btn" data-sources>Versions</button>
        <button class="btn" data-stats>Stats</button>
        <button class="btn" data-mute>Son</button>
        <button class="btn" data-pip>Image dans l’image</button>
        <button class="btn" data-full>⛶ Plein écran</button>
      </div>
      <div class="player-stats" data-stats-panel hidden></div>
    </div>`;
  document.body.append(shell);
  shell.querySelectorAll<HTMLButtonElement>('button').forEach((button, index) => {
    button.dataset.focusable = 'true';
    button.dataset.focusZone = 'player';
    button.dataset.focusRow = 'player-actions';
    button.dataset.focusKey = `player:${index}`;
  });

  const video = shell.querySelector('video')!;
  const progress = shell.querySelector<HTMLInputElement>('[data-progress]')!;
  const current = shell.querySelector<HTMLElement>('[data-current]')!;
  const duration = shell.querySelector<HTMLElement>('[data-duration]')!;
  const toggle = shell.querySelector<HTMLButtonElement>('[data-toggle]')!;
  const statsPanel = shell.querySelector<HTMLElement>('[data-stats-panel]')!;
  const skipSegmentButton = shell.querySelector<HTMLButtonElement>('[data-skip-segment]')!;

  let hls: { destroy(): void } | null = null;
  let sources: JellyfinMediaSource[] = item.MediaSources ?? [];
  let sourceIndex = 0;
  let audioStreamIndex: number | undefined;
  let subtitleStreamIndex: number | undefined;
  let playSessionId: string | undefined;
  let playMethod: 'DirectPlay' | 'Transcode' = 'DirectPlay';
  let reportTimer = 0;
  let controlsTimer = 0;
  let countdownTimer = 0;
  let closed = false;
  let closing = false;
  let stoppedReported = false;
  let loadVersion = 0;
  let segments: MediaSegment[] = [];
  let activeSegment: MediaSegment | null = null;

  const showControls = () => {
    shell.classList.remove('controls-hidden');
    window.clearTimeout(controlsTimer);
    if (!video.paused) controlsTimer = window.setTimeout(() => shell.classList.add('controls-hidden'), 3_200);
  };

  const payload = () => ({
    MediaSourceId: sources[sourceIndex]?.Id,
    PlaySessionId: playSessionId,
    PositionTicks: secondsToTicks(video.currentTime),
    IsPaused: video.paused,
    IsMuted: video.muted,
    VolumeLevel: Math.round(video.volume * 100),
    PlayMethod: playMethod,
    AudioStreamIndex: audioStreamIndex,
    SubtitleStreamIndex: subtitleStreamIndex,
  });

  const report = async (stopped = false) => {
    if (!api || demo || closed || (stopped && stoppedReported)) return;
    try {
      if (stopped) {
        await api.reportStopped(item.Id, payload());
        stoppedReported = true;
      } else {
        await api.reportProgress(item.Id, payload());
      }
    } catch {
      // Session reporting must never interrupt playback.
    }
  };

  const closeMenu = () => shell.querySelector('.player-menu')?.remove();
  const closeNextOverlay = () => {
    window.clearInterval(countdownTimer);
    shell.querySelector('.next-episode-overlay')?.remove();
  };

  const showMenu = (title: string, choices: PlayerChoice[]) => {
    closeMenu();
    const menu = document.createElement('div');
    menu.className = 'player-menu';
    menu.innerHTML = `<section class="panel"><h2>${escapeHtml(title)}</h2><div class="player-menu-list">${choices.map((choice, index) => `<button data-choice="${index}" ${choice.disabled ? 'disabled' : ''} class="${choice.selected ? 'selected' : ''}">${choice.selected ? '✓ ' : ''}${escapeHtml(choice.label)}</button>`).join('')}</div><button class="btn" data-close-menu>Fermer</button></section>`;
    shell.append(menu);
    menu.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.dataset.focusable = 'true';
      button.dataset.focusZone = 'player-menu';
    });
    menu.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => button.addEventListener('click', async () => {
      const choice = choices[Number(button.dataset.choice)];
      if (!choice || choice.disabled) return;
      await choice.action();
      closeMenu();
    }));
    menu.querySelector<HTMLButtonElement>('[data-close-menu]')?.addEventListener('click', closeMenu);
    menu.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  };

  const clearTracks = () => video.querySelectorAll('track').forEach((track) => track.remove());

  const attachExternalSubtitle = (source: JellyfinMediaSource) => {
    clearTracks();
    if (subtitleStreamIndex === undefined || !api || !source.Id) return;
    const stream = source.MediaStreams?.find((candidate) => candidate.Type === 'Subtitle' && candidate.Index === subtitleStreamIndex);
    if (!stream) return;
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = streamLabel(stream);
    track.srclang = stream.Language ?? 'und';
    track.src = stream.DeliveryUrl
      ? api.url(stream.DeliveryUrl, { api_key: api.token })
      : api.url(`/Videos/${item.Id}/${source.Id}/Subtitles/${subtitleStreamIndex}/Stream.vtt`, { api_key: api.token });
    track.default = true;
    video.append(track);
    track.addEventListener('load', () => { track.track.mode = 'showing'; });
  };

  const updateStats = () => {
    const source = sources[sourceIndex];
    statsPanel.innerHTML = `<span>${playMethod}</span><span>${escapeHtml(sourceLabel(source ?? {}, sourceIndex))}</span><span>${escapeHtml(streamLabel(source?.MediaStreams?.find((stream) => stream.Type === 'Audio' && stream.Index === audioStreamIndex) ?? {}))}</span><span>${subtitleStreamIndex === undefined ? 'Sous-titres désactivés' : `Sous-titres #${subtitleStreamIndex}`}</span>`;
  };

  const attemptDirect = (url: string, version: number) => new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', loaded);
      video.removeEventListener('error', failed);
      window.clearTimeout(timer);
    };
    const loaded = () => {
      cleanup();
      if (version === loadVersion) resolve();
      else reject(new DOMException('Obsolete', 'AbortError'));
    };
    const failed = () => { cleanup(); reject(new Error('Lecture directe non supportée.')); };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error('Timeout direct play')); }, 6_500);
    video.addEventListener('loadedmetadata', loaded, { once: true });
    video.addEventListener('error', failed, { once: true });
    video.src = url;
    video.load();
  });

  const loadSource = async (position = 0, autoPlay = true) => {
    if (!api) return;
    const version = ++loadVersion;
    const source = sources[sourceIndex];
    if (!source) throw new Error('Aucune source média disponible.');
    hls?.destroy();
    hls = null;
    clearTracks();
    video.pause();
    const selectedSubtitle = source.MediaStreams?.find((stream) => stream.Type === 'Subtitle' && stream.Index === subtitleStreamIndex);
    const forceTranscode = subtitleStreamIndex !== undefined && !selectedSubtitle?.SupportsExternalStream;
    playMethod = 'DirectPlay';
    try {
      if (forceTranscode) throw new Error('Sous-titre intégré : transcodage requis.');
      const directUrl = source.DirectStreamUrl
        ? api.url(source.DirectStreamUrl, { api_key: api.token, audioStreamIndex, subtitleStreamIndex })
        : api.url(`/Videos/${item.Id}/stream`, { static: true, mediaSourceId: source.Id, audioStreamIndex, subtitleStreamIndex, api_key: api.token });
      await attemptDirect(directUrl, version);
      attachExternalSubtitle(source);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      playMethod = 'Transcode';
      const hlsUrl = source.TranscodingUrl
        ? api.url(source.TranscodingUrl, { api_key: api.token, AudioStreamIndex: audioStreamIndex, SubtitleStreamIndex: subtitleStreamIndex })
        : api.url(`/Videos/${item.Id}/master.m3u8`, {
            UserId: api.userId,
            MediaSourceId: source.Id,
            PlaySessionId: playSessionId,
            MaxStreamingBitrate: 20_000_000,
            AudioStreamIndex: audioStreamIndex,
            SubtitleStreamIndex: subtitleStreamIndex,
            VideoCodec: 'h264',
            AudioCodec: 'aac',
            TranscodingContainer: 'ts',
            api_key: api.token,
          });
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
    if (version !== loadVersion) return;
    if (position > 0) video.addEventListener('loadedmetadata', () => { video.currentTime = Math.max(0, position); }, { once: true });
    updateStats();
    if (autoPlay) await video.play();
  };

  const cleanup = () => {
    window.clearInterval(reportTimer);
    window.clearTimeout(controlsTimer);
    window.clearInterval(countdownTimer);
    hls?.destroy();
    hls = null;
    video.pause();
    document.removeEventListener('keydown', onKey, true);
    shell.remove();
  };

  const close = async () => {
    if (closed || closing) return;
    closing = true;
    await report(true);
    closed = true;
    cleanup();
    onClose?.();
  };

  const playNext = async () => {
    if (!nextItem || !onPlayNext || closing || closed) return;
    closing = true;
    await report(true);
    closed = true;
    cleanup();
    await onPlayNext(nextItem);
  };

  const showNextEpisode = (requireConfirmation: boolean) => {
    if (!nextItem || !onPlayNext || shell.querySelector('.next-episode-overlay')) return;
    showControls();
    const overlay = document.createElement('div');
    overlay.className = 'next-episode-overlay';
    if (requireConfirmation) {
      overlay.innerHTML = `<section class="panel"><span class="eyebrow">Lecture continue</span><h2>Toujours là ?</h2><p>L’épisode suivant est « ${escapeHtml(nextItem.Name)} ».</p><div class="actions"><button class="btn primary" data-continue>Continuer</button><button class="btn" data-stop>Arrêter</button></div></section>`;
    } else {
      overlay.innerHTML = `<section class="panel"><span class="eyebrow">À suivre</span><h2>${escapeHtml(nextItem.Name)}</h2><p>Lecture dans <strong data-countdown>10</strong> secondes.</p><div class="actions"><button class="btn primary" data-continue>Lire maintenant</button><button class="btn" data-stop>Annuler</button></div></section>`;
    }
    shell.append(overlay);
    overlay.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.dataset.focusable = 'true'; button.dataset.focusZone = 'next-episode'; });
    overlay.querySelector<HTMLButtonElement>('[data-continue]')?.addEventListener('click', () => {
      if (requireConfirmation) consecutiveEpisodes = 0;
      void playNext();
    });
    overlay.querySelector<HTMLButtonElement>('[data-stop]')?.addEventListener('click', () => {
      closeNextOverlay();
      showControls();
      toggle.focus();
    });
    overlay.querySelector<HTMLButtonElement>('[data-continue]')?.focus();
    if (!requireConfirmation) {
      let remaining = 10;
      const output = overlay.querySelector<HTMLElement>('[data-countdown]');
      countdownTimer = window.setInterval(() => {
        remaining -= 1;
        if (output) output.textContent = String(Math.max(0, remaining));
        if (remaining <= 0) {
          window.clearInterval(countdownTimer);
          void playNext();
        }
      }, 1_000);
    }
  };

  const handleEnded = async () => {
    await report(true);
    if (!nextItem || !onPlayNext || item.Type !== 'Episode') return;
    if (item.SeriesId && item.SeriesId === bingeSeriesId) consecutiveEpisodes += 1;
    else {
      bingeSeriesId = item.SeriesId ?? '';
      consecutiveEpisodes = 1;
    }
    showNextEpisode(consecutiveEpisodes >= stillWatchingAfter);
  };

  const updateSegmentButton = () => {
    const ticks = secondsToTicks(video.currentTime);
    activeSegment = segments.find((segment) => {
      const start = segment.StartTicks ?? Number.POSITIVE_INFINITY;
      const end = segment.EndTicks ?? Number.NEGATIVE_INFINITY;
      return ticks >= start && ticks < end;
    }) ?? null;
    skipSegmentButton.hidden = !activeSegment;
    if (activeSegment) skipSegmentButton.textContent = segmentLabel(activeSegment.Type);
  };

  const update = () => {
    current.textContent = formatClock(video.currentTime);
    duration.textContent = formatClock(video.duration);
    progress.value = video.duration ? String(Math.round(video.currentTime / video.duration * 1000)) : '0';
    toggle.textContent = video.paused ? 'Lire' : 'Pause';
    updateSegmentButton();
  };

  const onKey = (event: KeyboardEvent) => {
    showControls();
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      if (shell.querySelector('.player-menu')) closeMenu();
      else if (shell.querySelector('.next-episode-overlay')) closeNextOverlay();
      else void close();
    } else if ((event.key === ' ' || event.key === 'Enter') && !(event.target instanceof HTMLButtonElement) && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement)) {
      event.preventDefault();
      if (video.paused) void video.play();
      else video.pause();
    } else if (event.key === 'ArrowLeft' && !shell.querySelector('.player-menu')) {
      event.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - seekSeconds);
    } else if (event.key === 'ArrowRight' && !shell.querySelector('.player-menu')) {
      event.preventDefault();
      video.currentTime = Math.min(video.duration || Number.POSITIVE_INFINITY, video.currentTime + seekSeconds);
    }
  };

  shell.addEventListener('mousemove', showControls, { passive: true });
  shell.addEventListener('click', showControls);
  document.addEventListener('keydown', onKey, true);
  video.addEventListener('timeupdate', update);
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  video.addEventListener('ended', () => void handleEnded());
  shell.querySelector<HTMLElement>('[data-back]')!.addEventListener('click', () => void close());
  shell.querySelector<HTMLElement>('[data-toggle]')!.addEventListener('click', () => {
    if (video.paused) void video.play();
    else video.pause();
  });
  shell.querySelector<HTMLElement>('[data-rewind]')!.addEventListener('click', () => { video.currentTime = Math.max(0, video.currentTime - seekSeconds); });
  shell.querySelector<HTMLElement>('[data-forward]')!.addEventListener('click', () => { video.currentTime = Math.min(video.duration || Number.POSITIVE_INFINITY, video.currentTime + seekSeconds); });
  shell.querySelector<HTMLElement>('[data-next]')!.addEventListener('click', () => showNextEpisode(false));
  skipSegmentButton.addEventListener('click', () => {
    if (activeSegment?.EndTicks !== undefined) video.currentTime = ticksToSeconds(activeSegment.EndTicks);
  });
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
  shell.querySelector<HTMLElement>('[data-stats]')!.addEventListener('click', () => { updateStats(); statsPanel.hidden = !statsPanel.hidden; });
  shell.querySelector<HTMLElement>('[data-tracks]')!.addEventListener('click', () => {
    const source = sources[sourceIndex];
    const audio = source?.MediaStreams?.filter((stream) => stream.Type === 'Audio') ?? [];
    const subtitles = source?.MediaStreams?.filter((stream) => stream.Type === 'Subtitle') ?? [];
    showMenu('Pistes audio et sous-titres', [
      ...audio.map((stream) => ({ label: `Audio — ${streamLabel(stream)}`, selected: stream.Index === audioStreamIndex, action: async () => { audioStreamIndex = stream.Index; await loadSource(video.currentTime); } })),
      { label: 'Sous-titres désactivés', selected: subtitleStreamIndex === undefined, action: async () => { subtitleStreamIndex = undefined; await loadSource(video.currentTime); } },
      ...subtitles.map((stream) => ({ label: `Sous-titres — ${streamLabel(stream)}`, selected: stream.Index === subtitleStreamIndex, action: async () => { subtitleStreamIndex = stream.Index; await loadSource(video.currentTime); } })),
    ]);
  });
  shell.querySelector<HTMLElement>('[data-sources]')!.addEventListener('click', () => showMenu('Versions', sources.map((source, index) => ({
    label: sourceLabel(source, index),
    selected: index === sourceIndex,
    action: async () => {
      sourceIndex = index;
      const audio = source.MediaStreams?.find((stream) => stream.Type === 'Audio' && stream.IsDefault) ?? source.MediaStreams?.find((stream) => stream.Type === 'Audio');
      audioStreamIndex = audio?.Index;
      subtitleStreamIndex = undefined;
      await loadSource(video.currentTime);
    },
  }))));
  shell.querySelector<HTMLElement>('[data-chapters]')!.addEventListener('click', () => {
    const chapters = item.Chapters ?? [];
    showMenu('Chapitres', chapters.length
      ? chapters.map((chapter: JellyfinChapter, index) => ({ label: `${formatClock(ticksToSeconds(chapter.StartPositionTicks))} — ${chapter.Name ?? `Chapitre ${index + 1}`}`, action: () => { video.currentTime = ticksToSeconds(chapter.StartPositionTicks); } }))
      : [{ label: 'Aucun chapitre disponible', disabled: true, action: () => undefined }]);
  });

  showControls();
  toggle.focus();
  if (demo || !api) {
    shell.insertAdjacentHTML('beforeend', '<div class="player-error"><div><h2>Lecteur de démonstration</h2><p>Connecte un serveur Jellyfin pour lancer une lecture réelle.</p><button class="btn primary" data-demo-close>Retour</button></div></div>');
    shell.querySelector<HTMLElement>('[data-demo-close]')!.addEventListener('click', () => void close());
    return;
  }

  try {
    const [info, segmentResult] = await Promise.all([
      api.playbackInfo(item.Id),
      api.request<MediaSegmentResult>(`/MediaSegments/${item.Id}`, {
        params: { IncludeSegmentTypes: 'Intro,Outro,Recap,Commercial,Preview' },
      }).catch(() => ({ Items: [] })),
    ]);
    sources = info.MediaSources?.length ? info.MediaSources : item.MediaSources ?? [];
    segments = segmentResult.Items ?? [];
    playSessionId = info.PlaySessionId;
    const defaultAudio = sources[0]?.MediaStreams?.find((stream) => stream.Type === 'Audio' && stream.IsDefault) ?? sources[0]?.MediaStreams?.find((stream) => stream.Type === 'Audio');
    const defaultSubtitle = sources[0]?.MediaStreams?.find((stream) => stream.Type === 'Subtitle' && stream.IsDefault);
    audioStreamIndex = defaultAudio?.Index;
    subtitleStreamIndex = defaultSubtitle?.Index;
    const resume = ticksToSeconds(item.UserData?.PlaybackPositionTicks);
    await loadSource(resume > 0 ? Math.max(0, resume - 5) : 0, false);
    await api.reportPlaying(item.Id, {
      MediaSourceId: sources[sourceIndex]?.Id,
      PlaySessionId: playSessionId,
      PlayMethod: playMethod,
      AudioStreamIndex: audioStreamIndex,
      SubtitleStreamIndex: subtitleStreamIndex,
    });
    reportTimer = window.setInterval(() => void report(false), 10_000);
    await video.play();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lecture impossible.';
    shell.insertAdjacentHTML('beforeend', `<div class="player-error"><div><h2>Lecture impossible</h2><p>${escapeHtml(message)}</p><button class="btn primary" data-error-close>Retour</button></div></div>`);
    shell.querySelector<HTMLElement>('[data-error-close]')!.addEventListener('click', () => void close());
  }
}
