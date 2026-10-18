/* Service worker de Mi Tracker: permite abrir la app sin conexión.
   Si cambias algún archivo, sube también este y cambia VERSION para que los móviles descarguen lo nuevo. */
const VERSION = 'mi-tracker-v4';
const FILES = ['./', './index.html', './css/styles.css', './js/core.js', './js/i18n.js', './js/extra.js', './js/ui.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
});
