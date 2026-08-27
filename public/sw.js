const CACHE_NAME = 'moodkin-v4';

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons-pwa/icon-192.png',
  '/icons-pwa/icon-512.png',
  '/logo.png',
  '/darklogo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[SW] precache failed for', asset, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests and auth
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // Only cache successful responses
          if (response.status === 200) {
            cache.put(event.request, responseClone);
          }
        });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'New message',
      icon: '/icons-pwa/icon-192.png',
      badge: '/icons-pwa/icon-72.png',
      data: {
        conversationId: data.conversationId,
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Moodkin', options)
    );
  } catch (err) {
    console.error('Push event error:', err);
  }
});

// Notification click - open the conversation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const conversationId = event.notification.data?.conversationId;
  const url = conversationId
    ? `/dashboard/projects/${conversationId}?tab=conversation`
    : '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(conversationId) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
