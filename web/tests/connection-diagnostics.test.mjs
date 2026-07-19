import test from 'node:test';
import assert from 'node:assert/strict';
import { assertBrowserCanReachServer, describeConnectionError } from '../.test-dist/core/api/connectionDiagnostics.js';
import { JellyfinApiError } from '../.test-dist/core/api/client.js';

test('bloque un serveur HTTP distant depuis une interface HTTPS', () => {
  assert.throws(
    () => assertBrowserCanReachServer('http://jellyfin.example.test:8096', 'https:'),
    /navigateurs bloquent cette connexion/,
  );
});

test('autorise HTTP en boucle locale pour le développement', () => {
  assert.equal(assertBrowserCanReachServer('http://localhost:8096', 'https:'), 'http://localhost:8096');
});

test('explique les identifiants refusés sans afficher une erreur réseau générique', () => {
  const issue = describeConnectionError(new JellyfinApiError('Unauthorized', 401, '/Users/AuthenticateByName'), 'https://jellyfin.example.test');
  assert.equal(issue.kind, 'unauthorized');
  assert.match(issue.message, /mot de passe incorrect/);
});

test('explique une erreur fetch comme un problème réseau, certificat ou CORS', () => {
  const issue = describeConnectionError(new TypeError('Failed to fetch'), 'https://jellyfin.example.test');
  assert.equal(issue.kind, 'network-or-cors');
  assert.match(issue.message, /CORS/);
});
