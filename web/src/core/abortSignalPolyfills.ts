type AbortSignalConstructorCompat = typeof AbortSignal & {
  any?: (signals: AbortSignal[]) => AbortSignal;
  timeout?: (milliseconds: number) => AbortSignal;
};

export function timeoutSignal(milliseconds: number): AbortSignal {
  const controller = new AbortController();
  const delay = Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0);
  const timer = globalThis.setTimeout(() => {
    const reason = typeof DOMException === 'function'
      ? new DOMException('The operation timed out.', 'TimeoutError')
      : new Error('The operation timed out.');
    controller.abort(reason);
  }, delay);
  controller.signal.addEventListener('abort', () => globalThis.clearTimeout(timer), { once: true });
  return controller.signal;
}

export function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const active = signals.filter(Boolean);
  if (!active.length) return new AbortController().signal;
  const alreadyAborted = active.find((signal) => signal.aborted);
  if (alreadyAborted) {
    const controller = new AbortController();
    controller.abort(alreadyAborted.reason);
    return controller.signal;
  }

  const controller = new AbortController();
  const listeners = new Map<AbortSignal, () => void>();
  const cleanup = () => {
    for (const [signal, listener] of listeners) signal.removeEventListener('abort', listener);
    listeners.clear();
  };
  for (const signal of active) {
    const listener = () => {
      cleanup();
      controller.abort(signal.reason);
    };
    listeners.set(signal, listener);
    signal.addEventListener('abort', listener, { once: true });
  }
  controller.signal.addEventListener('abort', cleanup, { once: true });
  return controller.signal;
}

export function installAbortSignalPolyfills(): void {
  const constructor = AbortSignal as AbortSignalConstructorCompat;
  if (typeof constructor.timeout !== 'function') {
    Object.defineProperty(AbortSignal, 'timeout', { configurable: true, writable: true, value: timeoutSignal });
  }
  if (typeof constructor.any !== 'function') {
    Object.defineProperty(AbortSignal, 'any', { configurable: true, writable: true, value: combineAbortSignals });
  }
}
