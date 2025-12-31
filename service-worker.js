/**
 * SERVICE WORKER - Offline Support & Push Notificationss
 * Handles caching, offline functionality, and background notifications
 */

const CACHE_NAME = 'trip-manager-v1.0.0';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/app.js',
    '/config.js',
    '/manifest.json'
];

// ============================================================================
// INSTALL EVENT - Cache files
// ============================================================================

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(URLS_TO_CACHE).catch(err => {
                console.log('Cache addAll error:', err);
                // Continue even if some files fail to cache
                return Promise.resolve();
            });
        })
    );
    self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// ============================================================================
// FETCH EVENT - Network first, fallback to cache
// ============================================================================

self.addEventListener('fetch', event => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // API calls - Network first with cache fallback
    if (request.url.includes('script.google.com')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone and cache successful responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached version if available
                    return caches.match(request).then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return offline page or error
                        return new Response('Offline - No cached data available', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
                })
        );
        return;
    }

    // Static assets - Cache first
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(request).then(response => {
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseClone);
                });
                return response;
            });
        })
    );
});

// ============================================================================
// PUSH NOTIFICATION EVENT
// ============================================================================

self.addEventListener('push', event => {
    let notificationData = {
        title: 'Trip Update',
        body: 'You have a new notification',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%232563eb" width="180" height="180"/><text x="50%" y="50%" font-size="90" fill="white" text-anchor="middle" dy=".3em" font-weight="bold">T</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%232563eb" width="180" height="180"/><text x="50%" y="50%" font-size="90" fill="white" text-anchor="middle" dy=".3em" font-weight="bold">T</text></svg>'
    };

    if (event.data) {
        try {
            notificationData = event.data.json();
        } catch (e) {
            notificationData.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: 'trip-notification',
            requireInteraction: true,
            actions: [
                { action: 'open', title: 'Open App' },
                { action: 'close', title: 'Dismiss' }
            ]
        })
    );
});

// ============================================================================
// NOTIFICATION CLICK EVENT
// ============================================================================

self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // Check if app is already open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open app if not already open
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// ============================================================================
// MESSAGE HANDLER - Communicate with app
// ============================================================================

self.addEventListener('message', event => {
    const { type, data } = event.data;

    if (type === 'NOTIFY') {
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%232563eb" width="180" height="180"/></svg>',
            tag: data.tag || 'notification'
        });
    } else if (type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ============================================================================
// HELPER - Send notification to all clients
// ============================================================================

function notifyClients(message) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'NOTIFICATION_RECEIVED',
                data: message
            });
        });
    });
}
