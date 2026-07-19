const CACHE = 'wholphin-web-shell-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './assets/icon.svg'];
const STATIC_FILE = /(?:^|\/)(?:assets\/[^/]+|styles[^/]*\.css|manifest\.webmanifest|favicon\.(?:ico|png)|icon\.svg)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

function isSafeStaticRequest(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (request.headers.has('Authorization') || request.headers.has('X-Emby-Token')) return false;
  if (url.searchParams.has('api_key') || url.searchParams.has('X-Emby-Token')) return false;
  return STATIC_FILE.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && request.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put('./index.html', response.clone()));
          return response;
        })
        .catch(async () => (await caches.match('./index.html')) || Response.error()),
    );
    return;
  }

  if (!isSafeStaticRequest(request)) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      return cached || network;
    }),
  );
});
