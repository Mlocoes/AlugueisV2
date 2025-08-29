/**
 * Service Worker - Sistema de Alquileres V2
 * Versão Móvil
 */

const CACHE_NAME = 'alquileres-mobile-v2.1.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/js/config.js',
    '/js/auth.js',
    '/js/api.js',
    '/js/app.js',
    '/js/views.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('📱 SW: Install event');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📱 SW: Cache opened');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('📱 SW: Error caching files:', error);
            })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and external APIs
    if (event.request.method !== 'GET' ||
        event.request.url.includes('192.168.0.7:8000')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('📱 SW: Activate event');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('📱 SW: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
