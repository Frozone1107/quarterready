// QuarterReady service worker: lets the app open offline and be installed.
// Pages are fetched fresh from the network first (so updates show at once) and
// fall back to the saved copy only when offline. Other sites (licence checks,
// fonts, payment) are never touched.
const CACHE = "qr-v3";
const SHELL = ["./", "index.html", "app.html", "help.html", "rules.js", "favicon.svg", "manifest.webmanifest", "icon-192-v3.png", "icon-512-v3.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" ? caches.match("app.html") : Response.error())))
  );
});
