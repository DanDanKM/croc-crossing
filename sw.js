// Offline support: app files are network-first (so updates arrive), voice clips and icons are cache-first.
const SHELL = 'croc-shell-v5', MEDIA = 'croc-media-v1';
const FILES = ['./', 'index.html', 'content.js', 'lines.js', 'core.js', 'questions.js', 'hop.js', 'map.js', 'fish.js', 'surf.js', 'car.js', 'safari.js', 'sanct.js', 'boat.js', 'skate.js', 'hacky.js', 'judo.js', 'clap.js', 'code.js', 'check.js', 'design.js', 'eggs.js', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'voice/index.json', 'music/map.mp3', 'music/game.mp3'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (/\/(voice\/.+\.mp3|music\/.+\.mp3|icons\/)/.test(u.pathname)) {
    e.respondWith(caches.open(MEDIA).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }))));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { if (r.ok) caches.open(SHELL).then(c => c.put(e.request, r.clone())); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
