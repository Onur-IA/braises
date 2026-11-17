const VERSION = "braises-355d6f0b38";
const LISTE = ["./", "art/chien.png", "art/fumee.png", "art/matrone.png", "art/rampant.png", "art/relique-anneau.png", "art/relique-bol.png", "art/relique-cendrex.png", "art/relique-coeur.png", "art/relique-linceul.png", "art/relique-meche.png", "art/relique-pierre.png", "art/relique-souffletcuivre.png", "art/solen.png", "art/souffleur.png", "art/statue.png", "icones/apple-touch-icon.png", "icones/icone-180.png", "icones/icone-192.png", "icones/icone-512.png", "icones/icone-masquable-512.png", "index.html", "jeu.js", "manifest.webmanifest", "moteur.js", "son.js", "style.css"];
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    if (LISTE.length && typeof LISTE[0] === 'string') await c.addAll(LISTE);
    else await c.addAll(['./', 'index.html', 'style.css', 'jeu.js', 'son.js', 'manifest.webmanifest']);
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
    self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const r = await fetch(e.request);
      cache.put(e.request, r.clone());
      return r;
    } catch (err) {
      const hit = await cache.match(e.request);
      return hit || cache.match('./') || Response.error();
    }
  })());
});
