const CACHE_VERSION = "tutodemy-20260819-performance2";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./css/style.css?v=20260816-landinghero1",
  "./js/main.js?v=20260819-performance2",
  "./js/home-runtime-loader.js?v=20260819-performance1",
  "./js/pwa.js?v=20260809-pwa1",
  "./assets/images/icon-192.png",
  "./assets/images/apple-touch-icon.png",
  "./assets/images/wordmark.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CORE_CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("tutodemy-") && ![CORE_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("./offline.html"));
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then(async response => {
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  const destination = request.destination;
  if (["style", "script", "image", "font"].includes(destination) || /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|json)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});



self.addEventListener("push", event => {
  let item = {};

  try {
    item = event.data ? event.data.json() : {};
  } catch {
    item = {
      title: "TutoDemy update",
      body: event.data ? event.data.text() : "You have a new TutoDemy notification."
    };
  }

  const title = item.title || "TutoDemy update";
  const link = item.link || item.url || "dashboard.html";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: item.body || "Open TutoDemy to view the update.",
      icon: "./assets/images/icon-192.png",
      badge: "./assets/images/icon-192.png",
      tag: item.tag || `tutodemy-push-${item.notificationId || item.bookingId || Date.now()}`,
      renotify: true,
      data: {
        link,
        notificationId: item.notificationId || null,
        bookingId: item.bookingId || null,
        notificationType: item.notificationType || null
      }
    })
  );
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type !== "TUTODEMY_SHOW_NOTIFICATION") return;
  const item = data.notification || {};
  if (!item.title) return;

  event.waitUntil(
    self.registration.showNotification(item.title, {
      body: item.body || "Open TutoDemy to view the update.",
      icon: "./assets/images/icon-192.png",
      badge: "./assets/images/icon-192.png",
      tag: item.tag || "tutodemy-update",
      renotify: true,
      data: { link: item.link || "dashboard.html" }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const link = event.notification?.data?.link || "dashboard.html";
  const target = new URL(link, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});
