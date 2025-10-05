// Create this file as frontend/sw.js

// Use global debugLogger (service workers can't use ES6 imports)
const debug = self.debugLogger || { log: () => {}, info: () => {} };

self.addEventListener('install', (event) => {
    debug.log('NeoSynth service worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    debug.log('NeoSynth service worker activating...');
    event.waitUntil(clients.claim());
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