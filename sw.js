/* Service worker · Londres 26 · Navidad 2026
   Guarda la app en el móvil para que se abra sin cobertura (también los dos expedientes).
   - Las páginas (index, jack, magia) y la ruta (ruta.json): primero red; si no hay, la copia guardada.
   - Iconos y tipografías: copia guardada, y se refresca en segundo plano.
   - GitHub (publicar o leer la ruta en directo) nunca pasa por aquí. */
const CACHE = "ldn26-v7";
const CORE = ["./", "index.html", "jack.html", "magia.html", "manifest.webmanifest", "favicon.svg", "fonts/fonts.css", "app.css",
  "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png",
  "img/bigben.jpg", "img/leech_marley.jpg", "img/leech_fezziwig.jpg", "img/borough.jpg", "img/cable.jpg", "img/carnaby.jpg", "img/covent.jpg", "img/dickens.jpg", "img/excel.jpg", "img/eye.jpg", "img/greenwich.jpg", "img/hamleys.jpg", "img/hero.jpg", "img/kings.jpg", "img/leaden.jpg", "img/regent.jpg", "img/selhurst.jpg", "img/somerset.jpg", "img/stpancras.jpg", "img/stpauls.jpg", "img/tbridge.jpg", "img/tower.jpg", "img/trafalgar.jpg", "img/whitechapel.jpg", "img/winterw.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function withTimeout(p, ms) {
  return new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error("timeout")), ms);
    p.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ko(e); }); });
}

async function networkFirst(req, key, ms) {
  const c = await caches.open(CACHE);
  try {
    const res = await withTimeout(fetch(req), ms);
    if (res && res.ok) c.put(key || req, res.clone());
    return res;
  } catch (e) {
    const hit = await c.match(key || req, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // GitHub y la previsión del tiempo: siempre en directo
  if (/(^|\.)github(usercontent)?\.com$/.test(url.hostname) || url.hostname === "api.open-meteo.com") return;

  // Tipografías de Google
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(staleWhileRevalidate(req)); return;
  }

  if (url.origin !== self.location.origin) return;

  // Calendario (.ics): siempre en directo y nunca en la caché de la app
  if (url.pathname.endsWith(".ics")) return;
  // Iconos de la app: siempre del servidor (si no, el iPhone puede añadir a inicio un icono antiguo guardado)
  if (/(apple-touch-icon|icon-\d+|icon-maskable-\d+)\.png$|favicon\.svg$/.test(url.pathname)) { e.respondWith(networkFirst(req, null, 4000)); return; }

  // Los expedientes: cada uno con su propia copia (el de Jack pesa: más margen)
  const page = (url.pathname.match(/\/(jack|magia)\.html$/) || [])[1];
  if (page) { e.respondWith(networkFirst(req, page + ".html", page === "jack" ? 15000 : 6000)); return; }
  // La app
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    e.respondWith(networkFirst(req, "index.html", 4000)); return;
  }
  // La ruta común
  if (url.pathname.endsWith("/ruta.json")) {
    e.respondWith(networkFirst(req, "ruta.json", 5000)); return;
  }
  // Iconos y demás
  e.respondWith(staleWhileRevalidate(req));
});
