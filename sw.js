const CACHE_NAME = 'nc-web-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/reset.css',
  '/css/variables.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/editor.css',
  '/css/mobile.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/core/events.js',
  '/js/core/state.js',
  '/js/core/format.js',
  '/js/core/sort.js',
  '/js/core/keyboard.js',
  '/js/core/touch.js',
  '/js/core/clipboard.js',
  '/js/core/operations.js',
  '/js/fs/interface.js',
  '/js/fs/opfs.js',
  '/js/fs/native-fs.js',
  '/js/fs/factory.js',
  '/js/ui/panel.js',
  '/js/ui/file-list.js',
  '/js/ui/breadcrumb.js',
  '/js/ui/toolbar.js',
  '/js/ui/status-bar.js',
  '/js/ui/dialog.js',
  '/js/ui/editor.js',
  '/js/ui/context-menu.js',
  '/js/pwa/register.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
