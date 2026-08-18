const SHELL = ['/', '/learn', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open('elmozza-shell-v1').then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;
	event.respondWith(
		caches.match(req).then((hit) => {
			if (hit) return hit;
			return fetch(req)
				.then((res) => {
					if (res.ok && (url.pathname.startsWith('/learn') || url.pathname.startsWith('/_app/'))) {
						const copy = res.clone();
						caches.open('elmozza-lessons-v1').then((cache) => cache.put(req, copy));
					}
					return res;
				})
				.catch(() => caches.match('/') || Response.error());
		})
	);
});

self.addEventListener('push', (event) => {
	let data = { title: 'Elmozza English', body: 'Your 5-minute lesson is ready. Keep the streak alive.', url: '/learn' };
	try {
		if (event.data) data = { ...data, ...event.data.json() };
	} catch {
		/* keep default */
	}
	event.waitUntil(self.registration.showNotification(data.title, { body: data.body, data: { url: data.url }, icon: '/icons/icon-192.png' }));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url || '/learn';
	event.waitUntil(self.clients.openWindow(url));
});
