export type Direction = 'left' | 'right' | 'up' | 'down';

interface FocusCandidate {
  element: HTMLElement;
  rect: DOMRect;
  zone: string;
  row: string;
  key: string;
}

interface SpatialNavigationOptions {
  root?: HTMLElement;
  onBoundary?: (direction: Direction, active: HTMLElement | null) => boolean | void;
  onLongPress?: (element: HTMLElement) => void;
  longPressMs?: number;
}

const KEY_TO_DIRECTION: Record<string, Direction | undefined> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

function isEditable(element: Element | null): boolean {
  return Boolean(element?.matches('input, textarea, select, [contenteditable="true"]'));
}

function visible(element: HTMLElement): boolean {
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none' && element.getClientRects().length > 0;
}

function center(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function directionalScore(from: FocusCandidate, to: FocusCandidate, direction: Direction): number | null {
  const a = center(from.rect);
  const b = center(to.rect);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const primary = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
  if (primary <= 0) return null;
  const cross = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
  const sameZoneBonus = from.zone && to.zone === from.zone ? -24 : 0;
  const sameRowBonus = from.row && to.row === from.row ? -36 : 0;
  const anglePenalty = cross / Math.max(primary, 1);
  return primary + cross * 2.25 + anglePenalty * 80 + sameZoneBonus + sameRowBonus;
}

export class SpatialNavigation {
  private readonly root: HTMLElement;
  private readonly options: Required<Pick<SpatialNavigationOptions, 'longPressMs'>> & SpatialNavigationOptions;
  private candidates: FocusCandidate[] = [];
  private candidateByElement = new Map<HTMLElement, FocusCandidate>();
  private dirty = true;
  private mutationObserver: MutationObserver;
  private resizeObserver: ResizeObserver;
  private pressTimer: number | null = null;
  private pressTarget: HTMLElement | null = null;
  private routeKey = 'global';
  private readonly restoredFocus = new Map<string, string>();

  constructor(options: SpatialNavigationOptions = {}) {
    this.root = options.root ?? document.body;
    this.options = { longPressMs: 650, ...options };
    this.mutationObserver = new MutationObserver(() => this.invalidate());
    this.resizeObserver = new ResizeObserver(() => this.invalidate());
  }

  start(): void {
    this.mutationObserver.observe(this.root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'tabindex', 'class', 'style'] });
    this.resizeObserver.observe(this.root);
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('keyup', this.onKeyUp, true);
    window.addEventListener('resize', this.invalidate, { passive: true });
    this.invalidate();
  }

  stop(): void {
    this.mutationObserver.disconnect();
    this.resizeObserver.disconnect();
    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('keyup', this.onKeyUp, true);
    window.removeEventListener('resize', this.invalidate);
    this.cancelLongPress();
  }

  setRouteKey(routeKey: string): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      const key = active.dataset.focusKey;
      if (key) this.restoredFocus.set(this.routeKey, key);
    }
    this.routeKey = routeKey;
  }

  focusInitial(preferredKey?: string): void {
    this.refresh();
    const restoreKey = preferredKey ?? this.restoredFocus.get(this.routeKey);
    const preferred = restoreKey ? this.candidates.find((candidate) => candidate.key === restoreKey) : undefined;
    const fallback = preferred ?? this.candidates.find((candidate) => candidate.element.dataset.focusInitial === 'true') ?? this.candidates[0];
    fallback?.element.focus({ preventScroll: true });
    fallback?.element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  invalidate = (): void => {
    this.dirty = true;
  };

  private refresh(): void {
    if (!this.dirty) return;
    const elements = Array.from(this.root.querySelectorAll<HTMLElement>('[data-focusable="true"], button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    this.candidates = elements.filter(visible).map((element, index) => ({
      element,
      rect: element.getBoundingClientRect(),
      zone: element.dataset.focusZone ?? '',
      row: element.dataset.focusRow ?? '',
      key: element.dataset.focusKey ?? element.id ?? `${this.routeKey}:${index}`,
    }));
    this.candidateByElement = new Map(this.candidates.map((candidate) => [candidate.element, candidate]));
    this.dirty = false;
  }

  private move(direction: Direction): void {
    const startedAt = performance.now();
    this.refresh();
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const from = activeElement ? this.candidateByElement.get(activeElement) : undefined;
    if (!from) {
      this.focusInitial();
      return;
    }
    let best: FocusCandidate | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of this.candidates) {
      if (candidate === from) continue;
      const score = directionalScore(from, candidate, direction);
      if (score !== null && score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    if (!best && this.options.onBoundary?.(direction, activeElement)) return;
    if (!best) return;
    best.element.focus({ preventScroll: true });
    best.element.scrollIntoView({ behavior: document.documentElement.dataset.reducedMotion === 'true' ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
    const elapsed = performance.now() - startedAt;
    document.dispatchEvent(new CustomEvent('wholphin:focus-metric', { detail: { elapsed, direction } }));
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const direction = KEY_TO_DIRECTION[event.key];
    if (direction && !isEditable(document.activeElement)) {
      event.preventDefault();
      if (!event.repeat || performance.now() % 2 < 1) this.move(direction);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && document.activeElement instanceof HTMLElement && !isEditable(document.activeElement)) {
      if (!event.repeat) this.startLongPress(document.activeElement);
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') this.cancelLongPress();
  };

  private startLongPress(element: HTMLElement): void {
    this.cancelLongPress();
    this.pressTarget = element;
    this.pressTimer = window.setTimeout(() => {
      if (this.pressTarget === element) this.options.onLongPress?.(element);
      this.pressTimer = null;
    }, this.options.longPressMs);
  }

  private cancelLongPress(): void {
    if (this.pressTimer !== null) window.clearTimeout(this.pressTimer);
    this.pressTimer = null;
    this.pressTarget = null;
  }
}
