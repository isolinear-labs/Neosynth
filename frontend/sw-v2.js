// NeoSynth Service Worker v2 - Optimized for cache busting
// Migrated from sw.js to sw-v2.js to force clients to update to new version
// Service Worker Version - injected at runtime from asset hash
const SW_VERSION = '{{SW_HASH}}';

// Use global debugLogger (service workers can't use ES6 imports)
const debug = self.debugLogger || { log: () => {}, info: () => {} };

self.addEventListener('install', (event) => {
    debug.log(`NeoSynth service worker v${SW_VERSION} installing...`);
    self.skipWaiting(); // Immediately activate new service worker
});

self.addEventListener('activate', (event) => {
    debug.log(`NeoSynth service worker v${SW_VERSION} activating...`);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            // Delete all old caches on activation
            return Promise.all(
                cacheNames.map(cacheName => {
                    debug.log(`Deleting old cache: ${cacheName}`);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => clients.claim())
    );
});

// Fetch event handler - ensure cache busting works
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // For CSS/JS files with version parameter, always fetch fresh
    if ((url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) && url.searchParams.has('v')) {
        debug.log(`Fetching fresh asset: ${url.pathname}?v=${url.searchParams.get('v')}`);
        event.respondWith(
            fetch(event.request, { cache: 'reload' })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(event.request);
                })
        );
        return;
    }

    // For all other requests, use default browser behavior
    event.respondWith(fetch(event.request));
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'KEEP_ALIVE') {
        // Respond to keep-alive messages to maintain connection
        event.ports[0].postMessage({ status: 'alive' });
    }
});

// Optional: Add background sync for saving state
self.addEventListener('sync', (event) => {
    if (event.tag === 'save-state') {
        debug.log('Background sync: save-state');
        // This could be used to save state even when the page is unloaded
    }
});