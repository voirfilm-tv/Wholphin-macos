import test from 'node:test';
import assert from 'node:assert/strict';
import { combineAbortSignals, timeoutSignal } from '../.test-dist/core/abortSignalPolyfills.js';

test('combine un signal déjà interrompu', () => {
  const source = new AbortController();
  source.abort('stopped');
  const result = combineAbortSignals([source.signal]);
  assert.equal(result.aborted, true);
  assert.equal(result.reason, 'stopped');
});

test('propage l’interruption du premier signal reçu', () => {
  const first = new AbortController();
  const second = new AbortController();
  const result = combineAbortSignals([first.signal, second.signal]);
  second.abort('second');
  assert.equal(result.aborted, true);
  assert.equal(result.reason, 'second');
});

test('crée un signal de délai compatible', async () => {
  const signal = timeoutSignal(5);
  await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
  assert.equal(signal.aborted, true);
  assert.equal(signal.reason?.name, 'TimeoutError');
});
