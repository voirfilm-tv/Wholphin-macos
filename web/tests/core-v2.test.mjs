import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeServerUrl, authorizationHeader } from '../.test-dist/core/api/client.js';
import { parseRoute, serializeRoute } from '../.test-dist/core/router.js';
import { formatRuntime, secondsToTicks, ticksToSeconds } from '../.test-dist/core/time.js';

test('normalise les URL serveur de la couche TypeScript', () => {
  assert.equal(normalizeServerUrl(' jellyfin.example.com/base/ '), 'https://jellyfin.example.com/base');
  assert.equal(normalizeServerUrl('http://localhost:8096/'), 'http://localhost:8096');
});

test('construit un en-tête MediaBrowser sans données parasites', () => {
  const header = authorizationHeader('secret', 'device-1');
  assert.match(header, /^MediaBrowser /);
  assert.match(header, /Client="Wholphin Web"/);
  assert.match(header, /Token="secret"/);
});

test('sérialise et relit les routes typées', () => {
  const route = { name: 'library', parentId: 'abc', title: 'Films & séries', collectionType: 'movies' };
  assert.deepEqual(parseRoute(serializeRoute(route)), route);
  assert.deepEqual(parseRoute('#/item?id=42'), { name: 'item', id: '42' });
});

test('convertit les durées Jellyfin', () => {
  assert.equal(secondsToTicks(90), 900000000);
  assert.equal(ticksToSeconds(900000000), 90);
  assert.equal(formatRuntime(90 * 60 * 10_000_000), '1 h 30');
});
