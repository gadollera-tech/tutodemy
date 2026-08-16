const CACHE_VERSION = "tutodemy-20260816-ui12";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./css/style.css?v=20260816-ui12",
  "./js/marketplace-api.js?v=20260809-finance3",
  "./js/captcha.js?v=20260816-ui10",
  "./js/home-auth.js?v=20260816-ui10",
  "./js/main.js?v=20260816-ui12",
  "./tutor-dashboard.html",
  "./tutor-onboarding.html",
  "./js/tutor-dashboard.js?v=20260809-tutorfix1",
  "./js/tutor-onboarding.js?v=20260809-tutorfix1",
  "./admin.html",
  "./dashboard.html",
  "./js/dashboard.js?v=20260810-progress4c",
  "./js/admin.js?v=20260809-finance3",
  "./js/notifications.js?v=20260809-live1",
  "./js/pwa.js?v=20260809-pwa1",
  "./assets/images/icon-192.png",
  "./assets/images/icon-512.png",
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
