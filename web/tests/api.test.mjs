import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeServerUrl, authorizationHeader, formatRuntime, secondsToTicks, ticksToSeconds } from '../js/api.js';

test('normalise une adresse Jellyfin', () => {
  assert.equal(normalizeServerUrl(' jellyfin.example.com/ '), 'https://jellyfin.example.com');
  assert.equal(normalizeServerUrl('http://localhost:8096/'), 'http://localhost:8096');
});

test('refuse une adresse vide', () => {
  assert.throws(() => normalizeServerUrl(''), /requise/);
});

test('génère un en-tête MediaBrowser sans exposer autre chose que le jeton fourni', () => {
  const header = authorizationHeader({ token: 'secret-token', deviceId: 'device-1' });
  assert.match(header, /^MediaBrowser /);
  assert.match(header, /Client="Wholphin Web"/);
  assert.match(header, /DeviceId="device-1"/);
  assert.match(header, /Token="secret-token"/);
});

test('convertit les ticks Jellyfin', () => {
  assert.equal(secondsToTicks(90), 900000000);
  assert.equal(ticksToSeconds(900000000), 90);
  assert.equal(formatRuntime(90 * 60 * 10_000_000), '1 h 30');
});
