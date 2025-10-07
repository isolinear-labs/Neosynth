// NeoSynth Service Worker - DEPRECATED AND REMOVED
// This SW immediately unregisters itself - cache busting now uses query strings
const SW_VERSION = 'DEPRECATED';

// Use global debugLogger (service workers can't use ES6 imports)
const debug = self.debugLogger || { log: () => {}, info: () => {} };

self.addEventListener('install', () => {
    // Immediately skip waiting to activate
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        // Delete all caches
        caches.keys()
            .then(cacheNames => Promise.all(cacheNames.map(c => caches.delete(c))))
            // Unregister this service worker
            .then(() => self.registration.unregister())
            // Notify all clients to reload
            .then(() => self.clients.matchAll())
            .then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_REMOVED', message: 'Service worker unregistered, please reload' });
                });
            })
    );
});

// No fetch handler - let browser handle all requests normally

// No message or sync handlers needed