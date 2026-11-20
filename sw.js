const VERSION = "braises-8f76766cb6";
const LISTE = ["./", "art.js", "donnees.js", "icones/apple-touch-icon.png", "icones/icone-180.png", "icones/icone-192.png", "icones/icone-512.png", "icones/icone-masquable-512.png", "index.html", "jeu.js", "manifest.webmanifest", "moteur.js", "pix/atlas-cartes.png", "pix/atlas-reliques.png", "pix/bg-caves.png", "pix/bg-crypte.png", "pix/bg-foyer.png", "pix/bg-givre.png", "pix/bg-marais.png", "pix/f-bastion.png", "pix/f-blizzardin.png", "pix/f-brumelin.png", "pix/f-cendrot.png", "pix/f-chaton.png", "pix/f-colossin.png", "pix/f-dracendre.png", "pix/f-flammeche.png", "pix/f-fournaisev.png", "pix/f-givraile.png", "pix/f-givrelin.png", "pix/f-golemet.png", "pix/f-herisfer.png", "pix/f-lampion.png", "pix/f-lanternemere.png", "pix/f-libelune.png", "pix/f-loupguide.png", "pix/f-lucet.png", "pix/f-oursroc.png", "pix/f-phalene.png", "pix/f-pisteur.png", "pix/f-renardeau.png", "pix/f-scribe.png", "pix/f-serpenflamme.png", "pix/f-spectregel.png", "pix/fx-flamme-bleu.png", "pix/fx-flamme-orange.png", "pix/fx-flamme-rouge.png", "pix/fx-flamme-vert.png", "pix/h-bram.png", "pix/h-fumee.png", "pix/h-grenat.png", "pix/h-ivra.png", "pix/h-lierre.png", "pix/h-nacre.png", "pix/h-ossian.png", "pix/h-silex.png", "pix/h-solen.png", "pix/h-vesper.png", "pix/i-boss.png", "pix/i-bouclier.png", "pix/i-coeur.png", "pix/i-coffre-ouvert.png", "pix/i-coffre.png", "pix/i-couronne.png", "pix/i-crane.png", "pix/i-eclat.png", "pix/i-elite.png", "pix/i-epee.png", "pix/i-feu.png", "pix/i-fiole-bleue.png", "pix/i-fiole-verte.png", "pix/i-fiole.png", "pix/i-intention-atk.png", "pix/i-or.png", "pix/i-question.png", "pix/i-sac.png", "pix/m-boueux.png", "pix/m-brule.png", "pix/m-chaman.png", "pix/m-chapardeur.png", "pix/m-coffre.png", "pix/m-colosse.png", "pix/m-cornard.png", "pix/m-cornu.png", "pix/m-courge.png", "pix/m-creux.png", "pix/m-dechu.png", "pix/m-devoreur.png", "pix/m-diabfeu.png", "pix/m-diabgivre.png", "pix/m-diablotin.png", "pix/m-eteigneur.png", "pix/m-fige.png", "pix/m-gele.png", "pix/m-grincant.png", "pix/m-grinfeu.png", "pix/m-grinvre.png", "pix/m-gueule.png", "pix/m-limace.png", "pix/m-limacon.png", "pix/m-limgivre.png", "pix/m-machefer.png", "pix/m-masgivre.png", "pix/m-masque.png", "pix/m-necromant.png", "pix/m-noye.png", "pix/m-ogre.png", "pix/m-osancien.png", "pix/m-osselet.png", "pix/m-petitmort.png", "pix/m-soudard.png", "pix/m-vaseux.png", "pix.js", "polices/OFL.txt", "polices/PixelifySans.ttf", "son.js", "style.css"];
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    if (LISTE.length && typeof LISTE[0] === 'string') await c.addAll(LISTE);
    else await c.addAll(['./', 'index.html', 'style.css', 'jeu.js', 'son.js', 'moteur.js', 'donnees.js', 'pix.js', 'art.js', 'pix/atlas-cartes.png', 'pix/atlas-reliques.png', 'pix/bg-caves.png', 'pix/bg-marais.png', 'pix/bg-crypte.png', 'pix/bg-givre.png', 'pix/bg-foyer.png', 'manifest.webmanifest']);
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
