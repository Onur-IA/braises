/* Braises V9 : interface (pixel art, tactile iPhone : on sélectionne une carte, on voit l'aperçu exact, puis on confirme). */
(function () {
  const M = window.BraisesMoteur, D = M.D, PIX = window.PIX || {}, ART = window.ART || { cartes: {}, reliques: {} };
  const CLE_META = 'braises9-meta', CLE_PARTIE = 'braises9-partie';
  const app = document.getElementById('app');
  const $ecran = document.getElementById('ecran');
  const lire = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  let meta = Object.assign({ renom: 0, courses: 0, victoires: 0, parClasse: {}, toutDebloque: false, mentor: true, conseiller: true, volMusique: 0.8, volEffets: 0.9 }, lire(CLE_META, null) || lire('braises8-meta', null) || lire('braises7-meta', null) || lire('braises6-meta', {}));
  let run = lire(CLE_PARTIE, null);
  if (run && run.v !== 9) run = null;
  const ui = { ecran: 'titre', sel: null, selCible: null, selNoeud: null, classe: null, heritage: 0, brasier: 0, serments: [], voile: null, info: null, choix: null, verrou: false, abandon: false, banniere: null, evoSel: null, evoAnim: null, element: 'impact' };

  function sauver() {
    if (run && !run.fini) localStorage.setItem(CLE_PARTIE, JSON.stringify(run)); else localStorage.removeItem(CLE_PARTIE);
    localStorage.setItem(CLE_META, JSON.stringify(meta));
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- sprites ----------
  function spr(cle, s, o) {
    o = o || {}; const p = PIX[cle]; if (!p) return '';
    const w = Math.round(p.w * s), h = Math.round(p.h * s);
    return `<div class="spr ${p.n > 1 && !o.fixe ? 'anim' : ''} ${o.flip ? 'flip' : ''} ${o.cls || ''}" style="width:${w}px;height:${h}px;background-image:url(pix/${cle}.png);background-size:${w * p.n}px ${h}px;--n:${p.n};--fw:${w}px;--dur:${o.dur || (0.75 + (cle.length % 4) * 0.08).toFixed(2)}s"></div>`;
  }
  function ico(cle, s) { s = s || 1; const p = PIX[cle]; if (!p) return ''; return `<span class="img" style="width:${p.w * s}px;height:${p.h * s}px;background:url(pix/${cle}.png) 0 0/${p.w * p.n * s}px ${p.h * s}px no-repeat"></span>`; }

  // ---------- cartes ----------
  function instDeck(u) { return run && run.deck.find((x) => x.u === u); }
  function artHTML(id) {
    const k = ART.cartes[id]; if (k == null) return '<span class="art"></span>';
    const x = (k % ART.cols) * ART.w, y = Math.floor(k / ART.cols) * ART.h, n = Math.ceil(Object.keys(ART.cartes).length / ART.cols);
    return `<span class="art" style="--ax:${k % ART.cols};--ay:${Math.floor(k / ART.cols)};--ac:${ART.cols};--ar:${n}"></span>`;
  }
  function relIco(id, s) {
    s = s || 2; const k = ART.reliques[id]; const n = Object.keys(ART.reliques).length;
    return `<span class="img rel" style="width:${ART.rs * s}px;height:${ART.rs * s}px;background:url(pix/atlas-reliques.png) ${-k * ART.rs * s}px 0/${n * ART.rs * s}px ${ART.rs * s}px no-repeat"></span>`;
  }
  function carteHTML(inst, o) {
    o = o || {};
    const d = M.def(inst), v = M.vals(inst);
    const cl = d.cl ? D.CLASSES[d.cl] : null, tr = d.tr ? D.TRIBUS[d.tr] : null;
    const q = d.q ? (instDeck(inst.u) || inst) : null;
    const quete = d.q && (q.niv || 0) < d.v.length - 1 ? `<span class="quete">Quête : ${esc(d.q.txt)} <b class="num">${q.q || 0}/${d.q.s[q.niv || 0]}</b></span>` : (d.q ? '<span class="quete">Quête accomplie</span>' : '');
    const k = d.coutV ? d.coutV(v) : d.c;
    const coutOr = d.or && run ? M.coutOr(run, inst) : d.or;
    const rar = D.RARETES[d.r] || {};
    const nom = M.nomCarte(inst);
    return `<button class="carte r-${d.r} ${d.t === 'S' ? 'sort' : 'lame'} ${cl ? 'cl cl-' + d.cl : tr ? 'trb' : 'neutre'} ${nom.length > 12 ? 'nom-long' : nom.length > 9 ? 'nom-moyen' : ''} ${o.cls || ''}" ${o.attrs || ''} style="${cl ? '--clc:' + cl.couleur : tr ? '--clc:' + tr.couleur : ''}" title="${esc(rar.nom || '')}">
      <span class="tete"><span class="cout num ${inst.gratuit ? 'gratuit' : ''}">${inst.gratuit ? 0 : k}</span><span class="nom">${esc(nom)}</span></span>
      <span class="art-cadre">${artHTML(d.id)}<span class="gemme" aria-label="${esc(rar.nom || '')}"></span></span>
      <span class="type">${d.t === 'L' ? 'Lame' : 'Sort'}${coutOr ? ` <span class="cout-or num">${coutOr} or</span>` : ''}${tr ? ` <span class="tribu" style="background:${tr.couleur}">${tr.nom}</span>` : ''}${cl ? ` <span class="tribu cls">${esc(cl.nom)}</span>` : ''}</span>
      <span class="texte">${esc(d.txt(v))}</span>${quete}</button>`;
  }

  // ---------- statuts ----------
  const COURT = { cadence: 'Cad', echo: 'Écho', ardeur: 'Ard', vol: 'Vol', force: 'For', robustesse: 'Rob', faible: 'Faib', expose: 'Exp', brulure: 'Brûl', poison: 'Pois', gel: 'Gel', epines: 'Épi', brume: 'Brume', esquive: 'Esq', chaleur: 'Chal', fleches: 'Flè', seve: 'Sève', rage: 'Rage', ames: 'Âmes', rouages: 'Roua', sauvage: 'Sauvage', fragile: 'Frag', marque: 'Marq', contre: 'Contre', arcane: 'Arc', harmonie: 'Harm', torpeur: 'Torp', nuitrouge: 'Nuit', montagne: 'Mont', singularite: 'Sing', opera: 'Opéra', soleil: 'Soleil', brouillard: 'Brouil', carquoisSans: 'Carq', grandeforge: 'Forge', arbremonde: 'Arbre', sansLimite: 'Rage∞', tempo: 'Tempo', manaPlus: 'Mana+' };
  const RESS = ['chaleur', 'fleches', 'seve', 'rage', 'ames', 'rouages', 'cadence', 'echo', 'contre', 'arcane', 'harmonie'];
  function statutsHTML(st) {
    return Object.entries(st).filter(([, n]) => n).map(([k, n]) => {
      const def = D.STATUTS[k] || {};
      const cls = RESS.includes(k) ? 'res' : def.bon ? 'bon' : 'mal';
      return `<span class="st ${cls}">${COURT[k] || k}${k === 'sauvage' ? '' : ' ' + n}</span>`;
    }).join('');
  }
  function statutsTexte(st) {
    return Object.entries(st).filter(([, n]) => n).map(([k, n]) => `<b>${(D.STATUTS[k] || {}).nom || k}${k === 'sauvage' ? '' : ' ' + n}</b> : ${(D.STATUTS[k] || {}).txt || ''}`).join('<br>');
  }

  // ---------- effets visuels ----------
  function flotter(el, texte, cls) {
    if (!el) return;
    const a = app.getBoundingClientRect(), r = el.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'flottant ' + cls; f.textContent = texte;
    f.style.left = (r.left - a.left + r.width / 2 + (Math.random() * 16 - 8)) + 'px';
    f.style.top = (r.top - a.top + r.height * 0.25) + 'px';
    app.appendChild(f); setTimeout(() => f.remove(), 1000);
  }
  function anim(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 400); }
  // V8 : ressenti des coups (arrêt sur image, secousse, éclats élémentaires, carte qui vole)
  function secouer(n) {
    const sc = $ecran.querySelector('.scene'); if (!sc) return;
    sc.style.setProperty('--amp', Math.min(10, 1.5 + n / 2.5).toFixed(1) + 'px');
    sc.classList.remove('secousse'); void sc.offsetWidth; sc.classList.add('secousse');
    setTimeout(() => sc.classList.remove('secousse'), 320);
  }
  function arretImage(ms) { app.classList.add('arret'); setTimeout(() => app.classList.remove('arret'), ms || 55); }
  function eclats(el, elem, n) {
    if (!el) return;
    const a = app.getBoundingClientRect(), r = el.getBoundingClientRect();
    const x = r.left - a.left + r.width / 2, y = r.top - a.top + r.height * 0.45;
    for (let k = 0; k < n; k++) {
      const p = document.createElement('i');
      const ang = Math.random() * Math.PI * 2, dist = 18 + Math.random() * 46;
      p.className = 'part p-' + elem;
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * dist - (elem === 'feu' ? 30 : 0)).toFixed(0) + 'px');
      p.style.animationDelay = (Math.random() * 60) + 'ms';
      app.appendChild(p); setTimeout(() => p.remove(), 760);
    }
    if (elem === 'cadence') { const f = document.createElement('div'); f.className = 'flash-cadence'; app.appendChild(f); setTimeout(() => f.remove(), 420); }
  }
  function elementCarte(d) {
    let t = ''; try { t = d.txt(M.vals({ id: d.id, niv: 0 })); } catch (e) {}
    if (/Brûlure/.test(t) || d.cl === 'solen' || d.tr === 'cendre') return 'feu';
    if (/Gel/.test(t) || d.cl === 'silex' || d.tr === 'givre') return 'givre';
    if (/Poison/.test(t)) return 'poison';
    if (d.cl === 'vesper' || /Cadence|Écho/.test(t)) return 'cadence';
    if (d.cl === 'nacre' || d.or) return 'or';
    if (d.cl === 'grenat') return 'sang';
    if (d.cl === 'ossian') return 'ame';
    if (d.cl === 'fumee') return 'ombre';
    if (d.cl === 'lierre' || d.tr === 'bete') return 'nature';
    return 'impact';
  }
  function voler(html, de, vers) {
    if (!de || !vers) return;
    const a = app.getBoundingClientRect();
    const g = document.createElement('div'); g.className = 'carte-vol'; g.innerHTML = html;
    g.style.left = (de.left - a.left) + 'px'; g.style.top = (de.top - a.top) + 'px'; g.style.width = de.width + 'px';
    app.appendChild(g);
    const dx = vers.left + vers.width / 2 - (de.left + de.width / 2), dy = vers.top + vers.height / 2 - (de.top + de.height / 2);
    if (g.animate) g.animate([{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 }, { transform: `translate(${dx * 0.6}px,${dy * 0.6 - 30}px) scale(.75) rotate(8deg)`, opacity: 1, offset: 0.6 }, { transform: `translate(${dx}px,${dy}px) scale(.35) rotate(18deg)`, opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.3,.1,.4,1)' });
    setTimeout(() => g.remove(), 270);
  }
  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; app.appendChild(d); setTimeout(() => d.remove(), 1800); }
  const elE = (u) => $ecran.querySelector(`.ennemi[data-p="${u}"] .spr`);
  const elH = () => $ecran.querySelector('.heros-zone .heros-spr');
  function jouerEvenements(evs, pas) {
    return new Promise((res) => {
      let t = 0;
      evs.forEach((e) => {
        let dt = (e.k === 'agit' ? pas : e.k === 'touche' || e.k === 'deg' ? 90 : 40);
        if ((e.k === 'deg' && e.n >= 10) || e.k === 'mort') dt += 55; // arrêt sur image
        setTimeout(() => montrerEv(e), t);
        t += dt;
      });
      setTimeout(res, t + 120);
    });
  }
  function montrerEv(e) {
    if (e.k === 'deg') {
      const el = elE(e.u);
      if (e.n > 0) {
        flotter(el, '-' + e.n, e.n >= 10 ? 'deg gros' : 'deg'); anim(el, 'coup');
        Son.impact(e.n, false); secouer(e.n); eclats(el, ui.element || 'impact', Math.min(16, 5 + Math.round(e.n / 2)));
        if (e.n >= 10) arretImage(55);
      } else if (e.bloque) flotter(el, 'bloqué', 'garde');
    }
    else if (e.k === 'touche') { const el = elH(); if (e.n > 0) { flotter(el, '-' + e.n, 'touche'); anim(el, 'coup'); Son.bip('degat', e.n); secouer(e.n * 0.8); } else if (e.bloque) { flotter(el, 'bloqué', 'garde'); Son.bip('bloc'); } }
    else if (e.k === 'garde') { flotter(elH(), '+' + e.n + ' garde', 'garde'); Son.bip('bloc'); }
    else if (e.k === 'soin') { if (e.n) { flotter(elH(), '+' + e.n, 'soin'); Son.bip('soin'); } }
    else if (e.k === 'agit') { anim(elE(e.u), 'elan-e'); }
    else if (e.k === 'esquive') flotter(elH(), 'esquive', 'info');
    else if (e.k === 'rivet') flotter(elH(), 'Rivet forgé', 'info');
    else if (e.k === 'sauvage') { flotter(elH(), 'Forme sauvage', 'info'); Son.bip('chaleur'); }
    else if (e.k === 'surcharge') { flotter(elH(), 'Surcharge : +1 Force', 'info'); Son.bip('surcharge'); }
    else if (e.k === 'suie') flotter(elH(), '+' + e.n + ' Suie', 'touche');
    else if (e.k === 'quete') { toast(D.CARTES[e.id].nom + ' évolue ' + '★'.repeat(e.niv + 1)); Son.bip('niveau'); }
    else if (e.k === 'fleches') flotter(elH(), e.n + ' flèche' + (e.n > 1 ? 's' : ''), 'info');
    else if (e.k === 'mort') { Son.bip('mort'); Son.impact(14, true); arretImage(60); secouer(16); const el = elE(e.u); eclats(el, ui.element || 'impact', 18); }
    else if (e.k === 'esquiveE') { flotter(elE(e.u), 'esquive', 'info'); Son.bip('esquive'); }
    else if (e.k === 'mue') flotter(elE(e.u), '+' + e.n + ' garde', 'garde');
    else if (e.k === 'rage') { flotter(elE(e.u), 'Rage !', 'touche'); Son.bip('rage'); }
    else if (e.k === 'releve') { flotter(elE(e.u), 'Se relève !', 'touche'); Son.bip('rage'); }
    else if (e.k === 'divise') flotter(elE(e.u), 'Division', 'info');
    else if (e.k === 'vol') { flotter(elH(), '-' + e.n + ' or', 'touche'); Son.bip('vol'); }
    else if (e.k === 'fuite') { toast('Il s\'enfuit' + (e.n ? ' avec ' + e.n + ' or' : '')); }
    else if (e.k === 'renonce') flotter(elE(e.u), 'Soudoyé', 'info');
    else if (e.k === 'vampire') flotter(elE(e.u), '+' + e.n, 'soin');
    else if (e.k === 'faux') flotter(elE(e.u), 'Fauché', 'touche');
    else if (e.k === 'echo') { flotter(elH(), 'Écho prêt', 'info'); Son.bip('echo'); }
    else if (e.k === 'echoJoue') { flotter(elH(), 'Écho !', 'info'); Son.bip('echo'); eclats(elH(), 'cadence', 8); }
    else if (e.k === 'phenix') { toast('La plume de phénix te relève !'); Son.stinger('relique'); }
    else if (e.k === 'relique') flotter(elH(), e.nom, 'info');
    else if (e.k === 'famAgit') { const f = $ecran.querySelector(`.fam[data-f="${e.id}"]`); if (f) { f.classList.remove('agit'); void f.offsetWidth; f.classList.add('agit'); setTimeout(() => f.classList.remove('agit'), 700); flotter(f, e.nom || 'Familier', 'info'); eclats(f, 'familier', 8); Son.bip('echo'); } }
    else if (e.k === 'paie') { flotter(elH(), '-' + e.n + ' or', 'info'); Son.bip('piece'); }
    else if (e.k === 'or') { flotter(elH(), '+' + e.n + ' or', 'soin'); Son.bip('piece'); }
  }

  // ---------- musique ----------
  function scene() {
    if (ui.ecran !== 'jeu' || !run) return 'titre';
    if (run.ecran === 'combat') return run.combat && run.combat.type === 'boss' ? 'boss' : run.combat && run.combat.type === 'elite' ? 'elite' : 'combat';
    if (run.ecran === 'fin') return run.gagne ? 'victoire' : 'defaite';
    return run.ecran === 'carte' ? 'carte' : run.ecran;
  }

  // ---------- rendu ----------
  function rendre() {
    let h = '';
    if (ui.ecran === 'titre') h = rendreTitre();
    else if (ui.ecran === 'classe') h = rendreClasse();
    else if (!run) { ui.ecran = 'titre'; h = rendreTitre(); }
    else {
      const f = { carte: rendreCarte, combat: rendreCombat, recompense: rendreRecompense, niveau: rendreNiveau, tresor: rendreTresor, marchand: rendreMarchand, brasero: rendreBrasero, evenement: rendreEvenement, selection: rendreSelection, fin: rendreFin }[run.ecran];
      h = f ? f() : rendreCarte();
    }
    const evo = (ui.ecran === 'jeu' && run && run.ecran !== 'combat' && !run.fini) ? rendreEvolution() : '';
    $ecran.innerHTML = h + (ui.voile ? rendreVoile() : '') + evo;
    if (ui.ecran === 'jeu' && run && run.ecran === 'carte') {
      const z = $ecran.querySelector('.carte-zone'), n = $ecran.querySelector('.noeud.sel') || $ecran.querySelector('.noeud.ouvert');
      if (z && n) z.scrollTop = Math.max(0, n.offsetTop - z.clientHeight * 0.62);
    }
    if (Son && Son.musique && window.__sonPret) Son.musique(scene());
    // V8 : on mesure la scène réelle pour dimensionner héros, familiers, ennemis et boss (un seul rendu de plus si besoin)
    const sc = $ecran.querySelector('.scene');
    if (sc && !ui.mesure) {
      const h = sc.clientHeight, w = sc.clientWidth;
      if (Math.abs(h - (ui.sceneH || 0)) > 16 || Math.abs(w - (ui.sceneW || 0)) > 16) { ui.sceneH = h; ui.sceneW = w; ui.mesure = true; rendre(); ui.mesure = false; }
    }
  }

  function hud() {
    const cl = D.CLASSES[run.classe];
    const xa = M.SEUILS_XP[run.niveau - 1] || 0, xb = M.SEUILS_XP[run.niveau] || xa + 1;
    const pct = run.niveau >= M.SEUILS_XP.length ? 100 : Math.round(100 * (run.xp - xa) / (xb - xa));
    return `<div class="hud">
      ${spr(cl.sprite, 0.9, { fixe: true })}
      <span class="stat pv">${ico('i-coeur')} <b class="num">${run.pv}/${run.pvMax}</b></span>
      <span class="stat orv">${ico('i-or')} <b class="num">${run.or}</b></span>
      <span class="stat ecl">${ico('i-eclat')} <b class="num">${run.eclats}</b></span>
      <span class="niv">Niv. <b class="num">${run.niveau}</b><span class="barre"><i style="width:${pct}%"></i></span></span>
      ${fortuneHTML(true)}
      <span class="vide"></span>
      <button class="btn" data-a="voile" data-p="deck">Paquet <b class="num">${run.deck.length}</b></button>
      <button class="btn" data-a="voile" data-p="sac">Sac</button>
      <button class="btn" data-a="titre" aria-label="Menu">≡</button>
    </div>`;
  }

  // V9 : jauge de fortune, discrète : chaque récompense commune ou passée la fait monter, une rare la remet à zéro.
  function fortuneHTML(mini) {
    const p = Math.min(10, run.pity || 0);
    if (mini) return `<span class="fortune-mini" title="Jauge de fortune ${p}/10" aria-label="Jauge de fortune ${p} sur 10"><i style="height:${p * 10}%"></i></span>`;
    return `<div class="fortune"><span>Fortune</span><span class="fortune-barre">${Array.from({ length: 10 }, (_, i) => `<i class="${i < p ? 'on' : ''}"></i>`).join('')}</span><span class="muet">${p ? '+' + p * 4 + ' % de chances hors communes' : 'rares remises à zéro'}</span></div>`;
  }
  function conseillerBouton(ctx) { return meta.conseiller ? `<button class="btn petit conseiller-btn" data-a="conseiller" data-p="${ctx}">Comparer</button>` : ''; }

  // ----- titre -----
  function rendreTitre() {
    const deb = M.classesDebloquees(meta);
    const niv = M.niveauRenom(meta.renom || 0);
    const a = M.RENOM_NIVEAUX[niv - 1] || 0, b = M.RENOM_NIVEAUX[niv] || a + 1;
    const pct = niv >= M.RENOM_NIVEAUX.length ? 100 : Math.round(100 * ((meta.renom || 0) - a) / (b - a));
    const heros = Object.entries(D.CLASSES).map(([k, c]) => `<div class="h ${deb.includes(k) ? '' : 'verrou'}">${spr(c.sprite, 2.6)}<span>${deb.includes(k) ? c.nom : '?'}</span></div>`).join('');
    return `<div class="titre">
      <div class="centre"><div class="logo">BRAISES</div><div class="sous-logo">V9 · deckbuilder roguelike en pixel art</div></div>
      <div class="col" style="align-items:center">
        <div class="parade-heros">${heros}</div>
        <div class="feu-titre">${ico('i-feu', 3)}</div>
        <div class="renom">Renom niveau ${niv} · ${meta.renom || 0} pts</div>
        <div class="barre" style="width:200px"><i style="width:${pct}%"></i></div>
      </div>
      <div class="menu-titre">
        ${run && !run.fini ? `<button class="btn prim" data-a="continuer">Continuer (${D.CLASSES[run.classe].nom}, acte ${run.acte + 1})</button>` : ''}
        <button class="btn ${run && !run.fini ? '' : 'prim'}" data-a="nouvelle">Nouvelle course</button>
        ${run && !run.fini ? `<button class="btn petit" data-a="abandon">${ui.abandon ? 'Toucher encore pour abandonner' : 'Abandonner la course'}</button>` : ''}
        <div class="bascules">
          <button class="bascule ${meta.mentor ? 'on' : ''}" data-a="mentor">Mentor ${meta.mentor ? 'oui' : 'non'}</button>
          <button class="bascule ${meta.conseiller ? 'on' : ''}" data-a="conseillerBascule">Conseiller ${meta.conseiller ? 'oui' : 'non'}</button>
          <button class="bascule ${meta.toutDebloque ? 'on' : ''}" data-a="tout">Tout débloqué ${meta.toutDebloque ? 'oui' : 'non'}</button>
          <button class="bascule" data-a="voile" data-p="options">Son et options</button>
        </div>
        <div class="bascules">
          <button class="bascule" data-a="voile" data-p="aide">Comment jouer</button>
          <button class="bascule" data-a="voile" data-p="nouveautes">Nouveautés</button>
          <button class="bascule" data-a="voile" data-p="credits">Crédits</button>
        </div>
      </div>
    </div>`;
  }

  // ----- choix de classe -----
  function rendreClasse() {
    const deb = M.classesDebloquees(meta);
    if (!ui.classe || !deb.includes(ui.classe)) ui.classe = deb[0];
    const k = ui.classe, cl = D.CLASSES[k];
    const herDeb = M.heritagesDebloques(meta, k);
    if (!herDeb.includes(ui.heritage)) ui.heritage = 0;
    const bmax = M.brasierMax(meta, k);
    if (ui.brasier > bmax) ui.brasier = bmax;
    const tuiles = Object.entries(D.CLASSES).map(([id, c]) => {
      const ok = deb.includes(id);
      return `<button class="tuile ${id === k ? 'sel' : ''} ${ok ? '' : 'verrou'}" data-a="classe" data-p="${id}">${spr(c.sprite, 2.2, { fixe: !ok || id !== k })}<span>${ok ? c.nom : 'Renom ' + c.renom}</span><small class="arch">${esc(c.archetype || '')}</small></button>`;
    }).join('');
    const conds = ['Disponible', 'Atteindre l\'acte 2 avec ' + cl.nom, 'Gagner une course avec ' + cl.nom];
    const her = cl.heritages.map((h, i) => `<button class="${i === ui.heritage ? 'sel' : ''} ${herDeb.includes(i) ? '' : 'verrou'}" data-a="heritage" data-p="${i}"><b>${esc(h.nom)}</b>${herDeb.includes(i) ? esc(h.txt) : esc(conds[i])}</button>`).join('');
    const bra = Array.from({ length: 11 }, (_, i) => `<button class="${i === ui.brasier ? 'sel' : ''} ${i <= bmax ? '' : 'verrou'}" data-a="brasier" data-p="${i}">${i}</button>`).join('');
    const depart = {}; cl.depart.forEach((id) => { depart[id] = (depart[id] || 0) + 1; });
    return `<div class="entete"><button class="btn petit" data-a="titre">‹</button><h2>Choisis ta classe</h2></div>
      <div class="defile grand">
        <div class="grille-classes">${tuiles}</div>
        <div class="fiche-classe">
          <div class="ligne">${spr(cl.sprite, 4)}<div class="col" style="gap:3px"><h2 style="color:${cl.couleur}">${cl.nom}</h2><span class="muet">${esc(cl.titre)} · ${cl.pv} PV · ${esc(cl.archetype || '')}</span><span style="font-size:13px">${esc(cl.resume)}</span></div></div>
          <div class="panneau col" style="gap:5px"><h3>Compétence : ${esc(cl.comp.nom)}</h3>${cl.comp.rangs.map((r, i) => `<div class="rang"><b>Rang ${i + 1}</b><span>${esc(r)}</span></div>`).join('')}<span class="muet">Les rangs 2 et 3 s'achètent chez le marchand.</span></div>
          <div class="muet">Départ : ${Object.entries(depart).map(([id, n]) => n + '× ' + D.CARTES[id].nom).join(', ')}</div>
          <h3>Héritage</h3><div class="choix-ligne">${her}</div>
          <h3>Brasier ${ui.brasier}</h3><div class="brasier-sel">${bra}</div>
          <div class="muet">${esc(M.BRASIER.slice(1, ui.brasier + 1).join(' ') || M.BRASIER[0])}</div>
          <h3>Serments (défis facultatifs)</h3><div class="choix-ligne serments">${Object.entries(D.SERMENTS).map(([id, s]) => `<button class="${ui.serments.includes(id) ? 'sel' : ''}" data-a="serment" data-p="${id}"><b>${esc(s.nom)}</b>${esc(s.txt)} <span class="num">+${s.renom} renom</span></button>`).join('')}</div>
        </div>
      </div>
      <div class="pied"><button class="btn prim" data-a="partir">Partir avec ${cl.nom}</button></div>`;
  }

  // ----- carte -----
  const NOEUDS = {
    combat: ['i-crane', 'Combat', 'Des créatures du coin. Or, expérience et une carte au choix.'],
    elite: ['i-elite', 'Élite', 'Un adversaire coriace. Plus d\'or, des éclats et une relique au choix.'],
    tresor: ['i-coffre', 'Trésor', 'Un coffre : or, un éclat et une carte au choix.'],
    marchand: ['i-sac', 'Marchand', 'Cartes, talismans, soins, retrait de carte et rangs de compétence.'],
    evenement: ['i-question', 'Inconnu', 'Une rencontre, un choix.'],
    brasero: ['i-feu', 'Brasero', 'Se soigner, affûter une carte ou méditer.'],
    boss: ['i-boss', 'Boss', '']
  };
  function rendreCarte() {
    const c = run.carte, choix = M.choixCarte(run), chemin = run.chemin || [];
    const LIG = 84, H = (c.rangs + 1) * LIG + 40;
    const y = (n) => (c.rangs - n.r) * LIG + 50;
    const x = (n) => n.id === 'boss' ? 50 : (n.c + 0.5) * 25;
    let lignes = '';
    Object.values(c.noeuds).forEach((n) => n.liens.forEach((l) => {
      const m = c.noeuds[l]; if (!m) return;
      const fait = chemin.includes(n.id) && (chemin.includes(l));
      const ouvert = (run.pos === n.id && choix.includes(l));
      lignes += `<line x1="${x(n)}" y1="${y(n)}" x2="${x(m)}" y2="${y(m)}" stroke="${fait ? '#ffcf5a' : ouvert ? '#c98a4a' : '#4a3038'}" stroke-width="${ouvert || fait ? 3 : 2}" stroke-dasharray="${fait ? '' : '5 5'}" vector-effect="non-scaling-stroke"/>`;
    }));
    const boss = D.ENNEMIS[run.bossId];
    const noeuds = Object.values(c.noeuds).map((n) => {
      const t = NOEUDS[n.type];
      const st = [chemin.includes(n.id) ? 'passe' : '', choix.includes(n.id) ? 'ouvert' : '', ui.selNoeud === n.id ? 'sel' : '', run.pos === n.id ? 'ici' : '', n.type === 'boss' ? 'boss' : '', n.enflamme ? 'enflamme' : '', n.type].join(' ');
      const inner = n.type === 'boss' ? spr(boss.sprite, 1.6, { fixe: true }) : ico(t[0]);
      return `<button class="noeud ${st}" style="left:${x(n)}%;top:${y(n)}px" data-a="noeud" data-p="${n.id}" aria-label="${t[1]}">${inner}</button>`;
    }).join('');
    let fiche;
    if (ui.selNoeud && choix.includes(ui.selNoeud)) {
      const n = c.noeuds[ui.selNoeud], t = NOEUDS[n.type];
      fiche = `<div class="txt"><b>${n.type === 'boss' ? esc(boss.nom) : n.enflamme ? 'Élite enflammée' : t[1]}${n.voie ? ` <span class="voie v-${n.c}">${n.voie}</span>` : ''}</b>${n.type === 'boss' ? 'Le gardien de ' + esc(D.MONDES[run.monde].nom) + '. Trois cartes légendaires et une relique de boss au choix.' : n.enflamme ? 'Plus forte (+25 % PV, +1 Force), mais trois reliques au choix et des cartes bien plus rares.' : t[2]}</div><button class="btn prim" data-a="aller">Y aller</button>`;
    } else fiche = `<div class="txt"><b>Où aller ?</b>Gauche : Sécurité. Centre : Équilibre. Droite : Audace (élites, butin).</div>`;
    const etape = run.pos && c.noeuds[run.pos] ? Math.min(c.rangs + 1, c.noeuds[run.pos].r + 2) : 1;
    const mc = meta.mentor ? M.conseilChemin(run) : null;
    const leg = ['combat', 'elite', 'tresor', 'marchand', 'evenement', 'brasero'].map((k) => `<span>${ico(NOEUDS[k][0])} ${NOEUDS[k][1]}</span>`).join('');
    return `${hud()}
      ${relBarre()}<div class="carte-titre"><h2>${esc(D.MONDES[run.monde].nom)}</h2><span class="muet">Acte ${run.acte + 1}/3 · étape ${etape}/${c.rangs + 1} · Brasier ${run.brasier}</span></div>
      <div class="boss-annonce">${spr(boss.sprite, 1, { fixe: true })}<span>Boss de l'acte : <b>${esc(boss.nom)}</b></span>${fortuneHTML(false)}</div>
      ${mc ? `<div class="ligne-conseils">${mentorLigne(mc.txt)}${conseillerBouton('chemin')}</div>` : meta.conseiller ? `<div class="ligne-conseils">${conseillerBouton('chemin')}</div>` : ''}
      <div class="legende">${leg}</div>
      <div class="carte-zone"><div class="carte-int" style="height:${H}px"><svg viewBox="0 0 100 ${H}" preserveAspectRatio="none">${lignes}</svg>${noeuds}</div></div>
      <div class="fiche-bas">${fiche}</div>`;
  }

  function relBarre() {
    const r = run.reliques || [], f = run.familiers || [];
    if (!r.length && !f.length) return '';
    return `<button class="rel-barre" data-a="voile" data-p="sac">${r.map((id) => relIco(id, 1)).join('')}${f.map((x) => spr(M.famStade(x).sprite, 1, { fixe: true })).join('')}</button>`;
  }
  // ----- combat -----
  function intentHTML(e) {
    const o = M.intentAffiche(run, run.combat, e); if (!o) return '<span class="intent" style="visibility:hidden">·</span>';
    const nomSt = (s) => s === 'suie' ? 'Suie' : (D.STATUTS[s] || {}).nom || s;
    switch (o.t) {
      case 'atk': return `<span class="intent atk">${ico('i-intention-atk')} ${o.deg}${o.n > 1 ? '×' + o.n : ''}</span>`;
      case 'atkdeb': return `<span class="intent atk">${ico('i-intention-atk')} ${o.deg}${o.n > 1 ? '×' + o.n : ''} <small style="color:#c9a0ff">+${nomSt(o.s)}</small></span>`;
      case 'atkdef': return `<span class="intent atk">${ico('i-intention-atk')} ${o.deg} ${ico('i-bouclier')}</span>`;
      case 'def': return `<span class="intent def">${ico('i-bouclier')} ${o.garde}</span>`;
      case 'buf': return `<span class="intent buf">▲ ${nomSt(o.s)} +${o.v}</span>`;
      case 'deb': return `<span class="intent deb">✶ ${nomSt(o.s)} ${o.v}</span>`;
      case 'soin': return `<span class="intent soin">+ soin ${o.v}</span>`;
      case 'inv': return `<span class="intent inv">Appel</span>`;
      case 'fuite': return `<span class="intent deb">Fuite</span>`;
      case 'renonce': return `<span class="intent buf">Soudoyé</span>`;
    }
    return '';
  }
  function intentTexte(e) {
    const o = M.intentAffiche(run, run.combat, e); if (!o) return '';
    const nomSt = (s) => s === 'suie' ? 'des Suies (cartes mortes) dans ta défausse' : (D.STATUTS[s] || {}).nom || s;
    return { atk: `Va attaquer : ${o.deg} dégâts${o.n > 1 ? ', ' + o.n + ' fois' : ''}.`, atkdeb: `Va attaquer (${o.deg}) et t'infliger ${nomSt(o.s)} ${o.v}.`, atkdef: `Va attaquer (${o.deg}) et se protéger.`, def: `Va se protéger (${o.garde} garde).`, buf: `Va se renforcer (${nomSt(o.s)} +${o.v}).`, deb: `Va t'infliger ${nomSt(o.s)} ${o.v}.`, soin: `Va soigner un allié de ${o.v} PV.`, inv: 'Va appeler du renfort.', fuite: 'Va s\'enfuir avec ton or !', renonce: 'Soudoyé : ne fera rien ce tour.' }[o.t] || '';
  }
  function arenaHTML(monde) {
    const p = PIX[monde.bg] || {}, fl = p.flamme || 'orange', lc = p.lum || '#ffa040';
    const torches = (p.torches || []).map(([x, y]) => `<span class="torche" style="left:${x}%;top:${y}%"><i class="lueur" style="--lc:${lc}"></i>${spr('fx-flamme-' + fl, 2.2, { dur: '.55s' })}</span>`).join('');
    const braises = Array.from({ length: 10 }, (_, k) => `<i class="braise-p" style="--x:${(k * 37 + 11) % 100}%;--d:${(3.2 + (k % 4) * 0.9).toFixed(1)}s;--t:${(-k * 0.73).toFixed(2)}s;--c:${lc}"></i>`).join('');
    return `<div class="arene" style="background-image:url(pix/${monde.bg}.png)">${torches}</div><div class="brume-scene"></div><div class="braises-scene">${braises}</div>`;
  }
  // Taille des sprites : le boss est ~1,8 à 2 fois plus grand, dans la limite de la scène.
  function dimScene() {
    const larg = Math.min(560, window.innerWidth || 430), haut = window.innerHeight || 844, paysage = larg > haut;
    return { h: ui.sceneH || (paysage ? haut - 60 : Math.max(240, haut - 480)), w: ui.sceneW || (paysage ? larg * 0.52 : larg) };
  }
  function echelleHeros(cle) {
    const p = PIX[cle] || { h: 24 }, sc = dimScene();
    return Math.max(3, Math.min(7, (sc.h * 0.27) / p.h, (sc.w * 0.24) / (p.w || 16)));
  }
  function echelleEnnemi(e, nE) {
    const d = D.ENNEMIS[e.id], p = PIX[e.sprite] || { w: 16, h: 16 }, sc = dimScene();
    const zoneW = sc.w * 0.6 / Math.max(1, nE);
    // boss : 1,8 à 2 fois la taille de la V7 (4,6), dans la limite de la scène
    if (d.boss) return Math.max(4.6, Math.min(9, (sc.h * 0.56) / p.h, (sc.w * (nE > 1 ? 0.6 / nE : 0.66)) / p.w));
    const cible = d.elite ? 0.3 : 0.24;
    return Math.max(2.6, Math.min(nE >= 3 ? 4.6 : 6.4, (sc.h * cible) / p.h, (zoneW * 0.8) / p.w));
  }
  function apercuEnnemi(ap, u) {
    if (!ap) return null;
    if (ap.tous) return ap.tous.ennemis[u] || null;
    return ap[u] ? ap[u].ennemis[u] : null;
  }
  function famTerrainHTML(f) {
    const st = M.famStade(f), stade = f.stade || 0;
    const seuil = [3, 7][stade], pct = stade >= 2 ? 100 : Math.min(100, Math.round(100 * (f.combats || 0) / seuil));
    const fe = Math.max(2, Math.min(3.4, dimScene().h * 0.075 / 19 * 1.0 + 1.2));
    return `<span class="fam" data-f="${f.id}" title="${esc(st.nom)}">${spr(st.sprite, fe)}<span class="fam-jauge ${stade >= 2 ? 'max' : ''}"><i style="width:${pct}%"></i></span></span>`;
  }
  function rendreCombat() {
    const c = run.combat, cl = D.CLASSES[run.classe], monde = D.MONDES[run.monde];
    const viv = M.vivants(c);
    const selInst = ui.sel != null ? c.main[ui.sel] : null;
    const cibler = selInst && M.besoinCible(selInst) && viv.length > 1;
    const nE = c.ennemis.filter((e) => e.pv > 0).length;
    const valides = cibler ? M.ciblesValides(c).map((e) => e.u) : null;
    const ap = selInst && M.peutJouer(run, c, ui.sel) ? M.apercuCibles(run, c, ui.sel) : null;
    const ennemis = c.ennemis.map((e) => {
      const d = D.ENNEMIS[e.id];
      const s = echelleEnnemi(e, nE);
      const prov = M.P(e, 'provocation') && e.pv > 0;
      const a = e.pv > 0 ? apercuEnnemi(ap, e.u) : null;
      const pct0 = Math.max(0, 100 * e.pv / e.pvMax), pct1 = a ? Math.max(0, 100 * a.pv1 / e.pvMax) : pct0;
      const touche = a && (a.deg > 0 || a.gardePerdue > 0);
      const badge = a ? (a.mort ? `<span class="ap-badge letal">${a.releve ? 'Tombe, se relèvera' : '☠ Létal'}</span>` : touche ? `<span class="ap-badge num">-${a.deg}${a.gardePerdue ? ` <small>⛨-${a.gardePerdue}</small>` : ''}</span>` : '') : '';
      const stAp = a ? Object.entries(a.st).filter(([, n]) => n > 0).map(([k, n]) => `<span class="st mal">+${n} ${COURT[k] || k}</span>`).join('') : '';
      return `<button class="ennemi ${d.boss ? 'boss' : d.elite ? 'elite' : ''} ${e.pv <= 0 ? 'mort' : ''} ${cibler && e.pv > 0 && (!valides || valides.includes(e.u)) ? 'ciblable' : ''} ${prov ? 'prov' : ''} ${a && a.mort ? 'ap-letal' : ''}" data-a="ennemi" data-p="${e.u}">
        ${intentHTML(e)}
        ${badge}
        ${spr(e.sprite, s, { flip: true })}
        <span class="jauge ${a ? 'ap' : ''}"><i style="width:${pct1}%"></i>${a && pct0 > pct1 ? `<b class="chute" style="left:${pct1}%;width:${pct0 - pct1}%"></b>` : ''}<span class="num">${e.garde ? '⛨' + (a ? a.garde1 : e.garde) + ' ' : ''}${a ? a.pv1 : e.pv}/${e.pvMax}</span></span>
        <span class="statuts">${statutsHTML(e.st)}${stAp}</span>
      </button>`;
    }).join('');
    const inc = M.degatsEntrants(run, c);
    let bilan = '';
    if (ap) {
      const h = (ap.tous || ap[ui.selCible] || Object.values(ap)[0] || {}).heros;
      if (h) {
        const reste = Math.max(0, h.entrants1 - h.garde1);
        bilan = `<span class="bilan ${reste ? 'risque' : 'sur'}"><b class="num">⛨ ${h.garde1}</b>${h.garde1 !== h.garde0 ? ` <small class="num">(${h.garde1 > h.garde0 ? '+' : ''}${h.garde1 - h.garde0})</small>` : ''} / <b class="num">${h.entrants1}</b> entrants${reste ? ` · <b class="num">-${reste} PV</b>` : ' · bloqué'}${h.pv1 !== h.pv0 ? ` · PV <b class="num">${h.pv1}</b>` : ''}</span>`;
      }
    } else if (inc || c.j.garde) {
      const reste = Math.max(0, inc - c.j.garde);
      bilan = `<span class="bilan ${reste ? 'risque' : 'sur'}"><b class="num">⛨ ${c.j.garde}</b> / <b class="num">${inc}</b> entrants${reste ? ` · <b class="num">-${reste} PV</b>` : ''}</span>`;
    }
    const fams = (run.familiers || []).map(famTerrainHTML).join('');
    const heros = `<div class="heros-zone" data-a="heros">
      ${bilan}
      <div class="heros-pied">${spr(cl.sprite, echelleHeros(cl.sprite), { cls: 'heros-spr' })}${fams ? `<span class="fams-terrain">${fams}</span>` : ''}</div>
      <span class="jauge heros"><i style="width:${100 * run.pv / run.pvMax}%"></i><span class="num">${c.j.garde ? '⛨' + c.j.garde + ' ' : ''}${run.pv}/${run.pvMax}</span></span>
      <span class="statuts">${statutsHTML(c.j.st)}</span>
    </div>`;
    let info = '';
    if (ui.info) {
      const e = c.ennemis.find((x) => x.u === ui.info && x.pv > 0);
      if (e) { const d = D.ENNEMIS[e.id]; info = `<div class="info-ennemi"><b>${esc(e.nom)}</b> ${d.boss ? '(boss)' : d.elite ? '(élite)' : ''}<br>${intentTexte(e)}${(d.pas || []).map((p) => '<br>• ' + esc(D.PASSIFS[p[0]] ? D.PASSIFS[p[0]](p[1]) : p[0])).join('')}${e.vol ? '<br>Or volé : ' + e.vol : ''}${Object.keys(e.st).length ? '<br>' + statutsTexte(e.st) : ''}</div>`; }
    }
    const mana = Array.from({ length: Math.max(3, c.j.mana) }, (_, i) => `<i class="${i < c.j.mana ? '' : 'vide'}"></i>`).join('');
    const liens = M.liens(run).filter((l) => l.palier >= 0).map((l) => `<span style="color:${l.couleur}">${l.nom} <b class="num">${l.n}</b></span>`).join('');
    let m = null;
    if (meta.mentor && !ui.verrou) m = M.conseilCombat(run);
    const conseil = m ? m.i : null;
    const main = c.main.map((inst, i) => carteHTML(inst, { cls: [ui.sel === i ? 'sel' : '', M.peutJouer(run, c, i) ? '' : 'injouable', conseil === i ? 'conseil' : ''].join(' '), attrs: `data-a="carte" data-p="${i}"` })).join('');
    let detail;
    if (selInst) {
      const d = M.def(selInst);
      const pourquoi = m && m.i === ui.sel && m.txt;
      detail = pourquoi
        ? `<div class="detail sel deux"><span class="l1"><b>${esc(M.nomCarte(selInst))}</b> <span class="num muet">${M.cout(selInst, c)} mana</span> · ${esc(M.texte(selInst))}</span><span class="l2"><span class="mentor-tag">Mentor</span>${esc(m.txt)}</span></div>`
        : `<div class="detail sel"><b>${esc(M.nomCarte(selInst))}</b> <span class="num muet">${M.cout(selInst, c)} mana</span> · ${esc(M.texte(selInst))}${cibler ? ' <em>Touche un ennemi.</em>' : ''}</div>`;
    } else if (ui.detailHeros) detail = `<div class="detail sel"><b>${cl.nom}</b> · ${esc(cl.comp.nom)} rang ${run.rang} : ${esc(cl.comp.rangs.slice(0, run.rang).join(' '))} ${statutsTexte(c.j.st)}</div>`;
    else if (m) detail = `<div class="detail mentor-ligne"><span class="mentor-tag">Mentor</span>${m.i >= 0 ? `<b>${esc(M.nomCarte(c.main[m.i]))}</b> : ` : ''}${esc(m.txt)}</div>`;
    else detail = c.tour <= 1 ? '<div class="detail aide">Touche une carte pour voir son effet exact, puis confirme. Touche un ennemi pour ses intentions.</div>' : '<div class="detail vide"></div>';
    const titreCombat = c.type === 'boss' ? 'boss' : c.type === 'elite' ? 'élite' : '';
    return `<div class="ecran-combat col grand" style="gap:0">
      <div class="gauche">${hud()}
        <div class="scene monde-${run.monde} ${c.type} ${ui.banniere ? 'entree' : ''}">
          ${arenaHTML(monde)}
          <span class="monde-nom">${esc(monde.nom)}${titreCombat ? ' · ' + titreCombat : ''}</span><span class="tour-nom">Tour <b class="num">${c.tour}</b></span>
          ${heros}<div class="ennemis-zone">${ennemis}</div>${info}
          ${ui.banniere ? `<div class="banniere-boss ${ui.banniere.elite ? 'elite' : ''}"><small>${esc(ui.banniere.titre)}</small><b>${esc(ui.banniere.nom)}</b></div>` : ''}
        </div>
      </div>
      <div class="droite">
        <div class="barre-combat"><span class="mana">${mana}<b class="num">${c.j.mana}</b></span><span class="liens-mini">${liens}</span>
          <span class="piles"><button data-a="voile" data-p="pioche">Pioche <b class="num">${c.pioche.length}</b></button><button data-a="voile" data-p="defausse">Déf. <b class="num">${c.defausse.length}</b></button>${c.exil.length ? `<button data-a="voile" data-p="exil">Cons. <b class="num">${c.exil.length}</b></button>` : ''}</span></div>
        ${detail}
        <div class="main">${main}</div>
        <div class="actions">
          <button class="btn bleu" data-a="conseil">Conseil</button>${meta.conseiller ? '<button class="btn violet" data-a="conseiller" data-p="combat">Comparer</button>' : ''}
          <button class="btn ${selInst ? 'prim' : 'off'}" data-a="jouer">Jouer</button>
          <button class="btn ${conseil === -1 ? 'conseil-fin' : ''}" data-a="fin">Fin du tour</button>
        </div>
      </div>
    </div>`;
  }

  // ----- récompense -----
  function reliqueHTML(id, o) {
    o = o || {}; const t = D.RELIQUES[id];
    return `<button class="talisman relique ${t.src === 'B' ? 'boss' : ''} ${o.sel ? 'sel' : ''}" ${o.attrs || ''}><span class="ic">${relIco(id, 2)}</span><span><b>${esc(t.nom)}</b><small>${esc(t.txt)}</small></span><span class="rel-tag">${t.src === 'B' ? 'Boss' : 'Élite'}</span></button>`;
  }
  function familierHTML(f, o) {
    o = o || {}; const l = D.FAMILIERS[f.id], st = M.famStade(f), tr = D.TRIBUS[l.tribu];
    const voies = (f.voie || []).map((v) => l.voies[v === 'B' ? 1 : 0]).join(' puis ');
    const prochain = f.evo ? ' · prêt à évoluer' : (f.stade || 0) < 2 ? ` · évolue après ${[3, 7][f.stade || 0]} combats (${f.combats || 0}), voie au choix` : ' · stade final';
    const vtxt = voies ? ` · voie ${voies}` : '';
    return `<button class="talisman familier ${o.sel ? 'sel' : ''}" ${o.attrs || ''}><span class="ic">${spr(st.sprite, 2.4)}</span><span><b>${esc(st.nom)}</b> <span class="tribu" style="background:${tr.couleur}">${tr.nom}</span><small>${esc(st.txt)}${o.offre ? ' · évolue en 2 voies au choix' : vtxt + prochain}</small></span></button>`;
  }
  function mentorLigne(txt) { return meta.mentor && txt ? `<div class="mentor-ligne"><span class="mentor-tag">Mentor</span>${esc(txt)}</div>` : ''; }
  function rendreRecompense() {
    const r = run.recompense;
    let rel = '';
    if (r.reliquesChoix && r.reliquesChoix.length) {
      const cr = !r.reliquePrise ? M.conseilRelique(run, r.reliquesChoix) : null;
      rel = `<div class="section"><h3>${r.reliquePrise ? 'Relique gagnée' : 'Choisis une relique'}</h3>${cr ? mentorLigne(cr.txt) : ''}<div class="col">${(r.reliquePrise ? r.reliquesChoix.filter((t) => run.reliques.includes(t)) : r.reliquesChoix).map((t) => reliqueHTML(t, { attrs: r.reliquePrise ? '' : `data-a="choixRel" data-p="${t}"`, sel: ui.choix === 'R' + t })).join('')}</div>
        ${!r.reliquePrise && ui.choix && ui.choix[0] === 'R' ? `<button class="btn or" style="margin-top:8px;width:100%" data-a="prendreRel">Prendre ${esc(D.RELIQUES[ui.choix.slice(1)].nom)}</button>` : ''}</div>`;
    }
    let fam = '';
    if (r.familier && !r.familierPris) {
      const plein = run.familiers.length >= M.equipeMax(run);
      fam = `<div class="section"><h3>Un familier s'approche</h3>${familierHTML({ id: r.familier, stade: 0, combats: 0 }, { offre: true })}
        ${plein ? `<div class="muet">Ton équipe est complète (${M.equipeMax(run)}). Touche un familier à renvoyer pour l'accueillir :</div><div class="col">${run.familiers.map((f, i) => familierHTML(f, { attrs: `data-a="remplFam" data-p="${i}"` })).join('')}</div>`
          : `<button class="btn prim" style="width:100%;margin-top:6px" data-a="prendreFam">Accueillir ${esc(D.FAMILIERS[r.familier].stades[0].nom)}</button>`}</div>`;
    } else if (r.familier && r.familierPris) fam = '<div class="muet centre">Un nouveau familier te suit.</div>';
    const evos = '';
    const cc = !r.cartePrise ? M.conseilCartes(run, r.cartes) : null;
    const leg = r.type === 'boss';
    const cartes = r.cartePrise ? `<div class="muet centre">${r.passee ? 'Carte passée : +8 or.' : 'Carte ajoutée à ton paquet.'}</div>` : `${cc ? mentorLigne(cc.txt) : ''}<div class="cartes-choix">${r.cartes.map((id) => carteHTML({ id, niv: 0, u: 'r' + id }, { cls: [ui.choix === id ? 'sel' : '', cc && cc.id === id && meta.mentor ? 'conseil' : ''].join(' '), attrs: `data-a="choixCarte" data-p="${id}"` })).join('')}</div>
      ${ui.choix && D.CARTES[ui.choix] ? `<button class="btn prim" style="width:100%" data-a="prendre">Prendre ${esc(D.CARTES[ui.choix].nom)}</button>` : `<div class="ligne" style="justify-content:center"><span class="muet">Touche une carte, puis confirme.</span>${conseillerBouton('cartes')}<button class="btn petit" data-a="passerCarte">Passer (+8 or)</button></div>`}`;
    const t = M.tauxTirage(run, r.type);
    const taux = leg ? '<div class="taux"><span class="r-L">Récompense de boss : 3 légendaires garanties</span></div>' : `${fortuneHTML(false)}<div class="taux">${['C', 'P', 'R', 'E', 'L'].filter((k) => t[k] > 0).map((k) => `<span class="r-${k}">${D.RARETES[k].nom} ${Math.round(t[k] * 10) / 10} %</span>`).join('')}</div>`;
    return `${hud()}<div class="ecran-centre recompense ${r.type}">
      <div class="fin-titre petit-titre">${r.type === 'boss' ? 'Boss vaincu !' : r.type === 'elite' ? 'Élite vaincue !' : 'Victoire'}</div>
      <div class="butin num"><span>${ico('i-or', 2)} +${r.or}</span>${r.eclats ? `<span>${ico('i-eclat', 2)} +${r.eclats}</span>` : ''}${r.xp ? `<span style="color:var(--vert)">+${r.xp} XP</span>` : ''}${r.soin ? `<span style="color:var(--vert)">${ico('i-coeur')} +${r.soin}</span>` : ''}</div>
      ${r.niveaux ? `<div class="niveau-titre" style="font-size:22px">Niveau ${run.niveau} atteint !</div>` : ''}
      ${evos}<div class="section ${leg ? 'section-leg' : ''}"><h3>${leg ? 'Une légendaire pour ton paquet' : 'Une carte pour ton paquet'}</h3>${cartes}${r.cartePrise ? '' : taux}</div>
      ${rel}${fam}
    </div><div class="pied"><button class="btn ${r.cartePrise ? 'prim' : ''}" data-a="quitterRecompense">Continuer</button></div>`;
  }
  function talismanHTML(id, o) {
    o = o || {}; const t = D.TALISMANS[id] || o.def;
    return `<button class="talisman ${o.sel ? 'sel' : ''}" ${o.attrs || ''}><span class="ic">${ico(o.ico || icoTalisman(id), 2)}</span><span><b>${esc(t.nom)}</b><small>${esc(t.txt)}</small></span>${o.prix != null ? `<span class="prix prix-tag ${o.cher ? 'cher' : ''}">${ico('i-eclat')} ${o.prix}</span>` : ''}</button>`;
  }
  function icoTalisman(id) { const l = ['i-fiole', 'i-fiole-bleue', 'i-fiole-verte', 'i-couronne', 'i-eclat', 'i-bouclier', 'i-coeur', 'i-epee']; let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return l[h % l.length]; }

  function rendreNiveau() {
    const ch = run.talentChoix || [];
    return `${hud()}<div class="ecran-centre">
      <div class="niveau-titre">Niveau ${run.niveau - run.niveauxEnAttente + 1} !</div>
      <div class="muet">+4 PV max. Choisis un talent.</div>
      <div class="talents">${ch.map((id) => { const t = M.talentDef(id); return talismanHTML(id, { def: t, ico: id.startsWith('t-' + run.classe) ? 'i-couronne' : 'i-epee', sel: ui.choix === id, attrs: `data-a="choixTalent" data-p="${id}"` }); }).join('')}</div>
    </div><div class="pied"><button class="btn prim ${ui.choix ? '' : 'off'}" data-a="prendreTalent">Choisir</button></div>`;
  }

  function rendreTresor() {
    const t = run.tresor;
    if (!t.ouvert) return `${hud()}<div class="ecran-centre" style="justify-content:center"><h2>Un coffre</h2><button data-a="ouvrir">${ico('i-coffre', 7)}</button><button class="btn prim" data-a="ouvrir">Ouvrir</button></div>`;
    return `${hud()}<div class="ecran-centre"><div>${ico('i-coffre-ouvert', 5)}</div>
      <div class="butin"><span>${ico('i-or', 2)} +${t.or}</span><span>${ico('i-eclat', 2)} +${t.eclats}</span></div>
      ${t.cartePrise ? '<div class="muet">Carte ajoutée à ton paquet.</div>' : `<div class="cartes-choix">${t.cartes.map((id) => carteHTML({ id, niv: 0, u: 't' + id }, { cls: ui.choix === id ? 'sel' : '', attrs: `data-a="choixCarte" data-p="${id}"` })).join('')}</div>
      ${ui.choix ? `<button class="btn prim" style="width:100%" data-a="prendre">Prendre ${esc(D.CARTES[ui.choix].nom)}</button>` : ''}${fortuneHTML(false)}`}
    </div><div class="pied"><button class="btn" data-a="quitter">Repartir</button></div>`;
  }

  function rendreMarchand() {
    const m = run.marchand;
    const ck = meta.mentor ? (M.conseilMarchand(run) || {}).k : null;
    const cartes = m.cartes.map((o, i) => `<div class="item ${o.vendu ? 'vendu' : ''}">${carteHTML({ id: o.id, niv: 0, u: 'm' + i }, { cls: [ui.choix === 'c' + i ? 'sel' : '', ck === 'c' + i ? 'conseil' : ''].join(' '), attrs: o.vendu ? '' : `data-a="etal" data-p="c${i}"` })}<span class="prix-tag ${run.or < o.prix ? 'cher' : ''}">${ico('i-or')} ${o.prix}</span></div>`).join('');
    const tals = m.talismans.map((o, i) => o.vendu ? '' : talismanHTML(o.id, { prix: o.prix, cher: run.eclats < o.prix, sel: ui.choix === 't' + i, attrs: `data-a="etal" data-p="t${i}"` })).join('');
    const SV = { soin: ['Soins', '+30 % de tes PV max'], retirer: ['Retrait', 'Retire une carte du paquet'], transformer: ['Métamorphose', 'Change une carte en une autre'], dupliquer: ['Copie', 'Duplique une carte'], pvmax: ['Fortifiant', '+4 PV max'], rang: ['Compétence', run.rang >= 3 ? 'Rang maximum atteint' : 'Rang ' + (run.rang + 1) + ' : ' + D.CLASSES[run.classe].comp.rangs[run.rang]], relance: ['Nouvel étal', 'Renouvelle les cartes'] };
    const services = Object.keys(SV).map((k) => {
      const p = M.prixService(run, k), off = m.services[k] || (k === 'rang' && run.rang >= 3);
      return `<button class="service ${off ? 'off' : ''} ${ui.choix === 's' + k ? 'sel' : ''} ${ck === 's' + k ? 'conseil' : ''}" ${off ? '' : `data-a="etal" data-p="s${k}"`}><b>${SV[k][0]} <span class="prix-tag ${k === 'relance' ? (run.eclats < p ? 'cher' : '') : (run.or < p ? 'cher' : '')}">${ico(k === 'relance' ? 'i-eclat' : 'i-or')} ${p}</span></b>${esc(SV[k][1])}</button>`;
    }).join('');
    let pied = '<div class="grand muet" style="font-size:12px">Touche un article, puis achète.</div>';
    if (ui.choix) {
      const k = ui.choix[0], r = ui.choix.slice(1);
      let nom, prix, mon;
      if (k === 'c') { const o = m.cartes[+r]; nom = D.CARTES[o.id].nom; prix = o.prix; mon = 'or'; }
      if (k === 't') { const o = m.talismans[+r]; nom = D.TALISMANS[o.id].nom; prix = o.prix; mon = 'éclats'; }
      if (k === 's') { nom = SV[r][0]; prix = M.prixService(run, r); mon = r === 'relance' ? 'éclat' : 'or'; }
      pied = `<button class="btn or grand" data-a="acheter">Acheter ${esc(nom)} (${prix} ${mon})</button>`;
    }
    const cm = M.conseilMarchand(run);
    return `${hud()}<div class="ecran-centre marchand" style="align-items:stretch">
      <div class="ligne"><span>${ico('i-sac', 3)}</span><div><h2>Le marchand</h2><div class="muet">« Tout se paie, même la lumière. »</div></div></div>
      <div class="ligne-conseils">${cm ? mentorLigne(cm.txt) : ''}${conseillerBouton('marchand')}</div>
      <div class="section"><h3>Cartes</h3><div class="etal">${cartes}</div></div>
      <div class="section"><h3>Talismans</h3><div class="col">${tals || '<span class="muet">Plus rien.</span>'}</div></div>
      <div class="section"><h3>Services</h3><div class="services">${services}</div></div>
    </div><div class="pied">${pied}<button class="btn" data-a="quitter">Partir</button></div>`;
  }

  function rendreBrasero() {
    const b = run.brasero;
    const opts = [['soin', 'Se soigner', '+' + M.soinBrasero(run) + ' PV'], ['affuter', 'Affûter', 'Améliore une carte (ou fait avancer sa quête d\'un cran)'], ['mediter', 'Méditer', '+20 XP']].filter((o) => !(b.faits || []).includes(o[0]));
    return `${hud()}<div class="ecran-centre" style="justify-content:center">
      <h2>Le brasero</h2><div>${ico('i-feu', 6)}</div>
      ${b.fait ? `<div class="muet">${b.fait === 'soin' ? 'Tu te sens mieux.' : b.fait === 'mediter' ? 'Ton esprit s\'éclaircit.' : 'La lame chante.'}</div>` : `<div class="services" style="width:100%">${opts.map(([k, n, t]) => `<button class="service ${ui.choix === k ? 'sel' : ''}" data-a="brasero" data-p="${k}"><b>${n}</b>${t}</button>`).join('')}</div>`}
    </div><div class="pied">${!b.fait ? `<button class="btn prim ${ui.choix ? '' : 'off'}" data-a="faireBrasero">Confirmer</button>` : ''}<button class="btn" data-a="quitter">Repartir</button></div>`;
  }

  function rendreEvenement() {
    const ev = M.evenementDef(run), st = run.evenement;
    let bas;
    if (st.fait == null) {
      const ke = M.iaEvenement(run, ev);
      bas = `${mentorLigne('Le choix le plus sûr pour ta course : « ' + ev.choix[ke].txt.replace(/\s*\(.*\)$/, '') + ' ».')}<div class="choix-ev">${ev.choix.map((ch, i) => `<button class="${M.choixPossible(run, ch) ? '' : 'off'} ${ui.choix === i ? 'sel' : ''}" data-a="choixEv" data-p="${i}">${esc(ch.txt)}</button>`).join('')}</div>`;
    }
    else {
      bas = `<div class="panneau" style="width:100%">${esc(ev.choix[st.fait].txt)}${(st.resultat || []).length ? '<br><b class="px" style="color:var(--or)">' + esc(st.resultat.join(' · ')) + '</b>' : ''}</div>`;
      if (st.cartes && !st.cartePrise) bas += `<div class="cartes-choix">${st.cartes.map((id) => carteHTML({ id, niv: 0, u: 'e' + id }, { cls: ui.choix === id ? 'sel' : '', attrs: `data-a="choixCarte" data-p="${id}"` })).join('')}</div>${typeof ui.choix === 'string' ? `<button class="btn prim" style="width:100%" data-a="prendre">Prendre ${esc(D.CARTES[ui.choix].nom)}</button>` : ''}`;
    }
    return `${hud()}<div class="ecran-centre evenement"><div class="vignette-ev" style="background-image:url(pix/${D.MONDES[run.monde].bg}.png)">${ico('i-question', 4)}</div><h2>${esc(ev.titre)}</h2><div class="recit">${esc(ev.txt)}</div>${bas}</div>
      <div class="pied">${st.fait == null ? `<button class="btn prim ${ui.choix != null ? '' : 'off'}" data-a="faireEv">Confirmer</button>` : '<button class="btn prim" data-a="quitter">Continuer</button>'}</div>`;
  }

  function rendreSelection() {
    const s = run.selection;
    const T = { affuter: 'Affûter une carte', retirer: 'Retirer une carte', transformer: 'Métamorphoser une carte', dupliquer: 'Dupliquer une carte' };
    const liste = run.deck.filter((x) => s.mode !== 'affuter' || M.affutable(x));
    const sel = liste.find((x) => x.u === ui.choix);
    let apercu = '';
    if (sel && s.mode === 'affuter') apercu = `<div class="ligne" style="justify-content:center;padding:8px">${carteHTML(sel, { cls: 'moyenne' })}<span class="px" style="font-size:22px">→</span>${carteHTML(Object.assign({}, sel, { niv: (sel.niv || 0) + 1, u: 'apercu' }), { cls: 'moyenne' })}</div>`;
    return `<div class="entete"><h2>${T[s.mode]}</h2></div>${apercu}
      <div class="defile grand"><div class="grille-deck">${liste.map((x) => carteHTML(x, { cls: ui.choix === x.u ? 'sel' : '', attrs: `data-a="choixDeck" data-p="${x.u}"` })).join('')}</div></div>
      <div class="pied"><button class="btn" data-a="annulerSel">Annuler</button><button class="btn prim ${sel ? '' : 'off'}" data-a="faireSel">Confirmer</button></div>`;
  }

  function rendreFin() {
    if (!run.metaFait) {
      const avant = M.classesDebloquees(meta), nivAvant = M.niveauRenom(meta.renom || 0);
      M.enregistrerFin(meta, run); run.metaFait = true;
      run.finInfo = { renom: M.renomGagne(run), nivAvant, niv: M.niveauRenom(meta.renom), nouvelles: M.classesDebloquees(meta).filter((k) => !avant.includes(k)) };
      sauver();
    }
    const f = run.finInfo, cl = D.CLASSES[run.classe];
    return `<div class="ecran-centre" style="justify-content:center">
      <div class="fin-titre" style="color:${run.gagne ? 'var(--or)' : 'var(--rouge)'}">${run.gagne ? 'La braise tient !' : 'La flamme s\'éteint'}</div>
      ${spr(cl.sprite, 5, { fixe: !run.gagne, cls: run.gagne ? '' : 'mort-heros' })}
      <div class="stats-fin">
        <span>Classe</span><b>${cl.nom} · Brasier ${run.brasier}</b>
        <span>Acte atteint</span><b>${run.acte + 1}/3</b>
        <span>Lieux traversés</span><b>${run.etageTotal}</b>
        <span>Ennemis vaincus</span><b>${run.stats.tues}</b>
        <span>Niveau</span><b>${run.niveau}</b>
        <span>Renom gagné</span><b style="color:var(--or)">+${f.renom}</b>
      </div>
      ${f.niv > f.nivAvant ? `<div class="niveau-titre" style="font-size:22px">Renom niveau ${f.niv} !</div>` : ''}
      ${f.nouvelles.length ? `<div class="panneau centre">Nouvelle classe : <b class="px">${f.nouvelles.map((k) => D.CLASSES[k].nom).join(', ')}</b></div>` : ''}
      ${run.gagne && run.brasier < 10 ? `<div class="muet">Brasier ${run.brasier + 1} débloqué pour ${cl.nom}.</div>` : ''}
      <button class="btn prim" data-a="finTitre">Retour au titre</button>
    </div>`;
  }

  // ----- V8 : évolution embranchée des familiers -----
  function rendreEvolution() {
    if (ui.evoAnim) {
      const a = ui.evoAnim;
      return `<div class="voile evolution anim"><div class="evo-boite"><div class="evo-eclair"></div><div class="evo-sprite nouveau">${spr(a.sprite, 5)}</div><h2 class="evo-nom">${esc(a.nom)}</h2><div class="muet">${esc(a.txt)}</div></div></div>`;
    }
    const f = M.evolutionsEnAttente(run)[0]; if (!f) return '';
    const l = D.FAMILIERS[f.id], cur = M.famStade(f), tr = D.TRIBUS[l.tribu];
    const conseil = M.iaVoie(run, f);
    const opts = ['A', 'B'].map((v, k) => {
      const st = l.stades[f.evo][v];
      return `<button class="evo-opt ${ui.evoSel === v ? 'sel' : ''} ${meta.mentor && conseil === v ? 'conseil' : ''}" data-a="evoSel" data-p="${v}">
        <span class="evo-sp">${spr(st.sprite, 3.2)}</span><span class="voie">Voie ${esc(l.voies[k])}</span><b>${esc(st.nom)}</b><small>${esc(st.txt)}</small></button>`;
    }).join('');
    const vc = l.stades[f.evo][conseil];
    return `<div class="voile evolution"><div class="evo-boite">
      <div class="evo-titre">Évolution <span class="tribu" style="background:${tr.couleur}">${tr.nom}</span></div>
      <div class="evo-sprite">${spr(cur.sprite, 4)}</div>
      <div class="muet centre">${esc(cur.nom)} a assez combattu (stade ${f.evo + 1}/3). Choisis sa voie : elle est définitive.</div>
      <div class="evo-choix">${opts}</div>
      ${mentorLigne(`Voie ${l.voies[conseil === 'B' ? 1 : 0]} (${vc.nom}) : ${conseil === 'A' ? 'plus de pression offensive pour ton paquet' : 'plus de tempo et de protection pour ton paquet'}.`)}
      <button class="btn prim ${ui.evoSel ? '' : 'off'}" data-a="evoOk">Évoluer${ui.evoSel ? ' en ' + esc(l.stades[f.evo][ui.evoSel].nom) : ''}</button>
    </div></div>`;
  }

  // ----- superpositions -----
  function rendreVoile() {
    const v = ui.voile;
    let titre = '', corps = '';
    if (v === 'deck' || v === 'pioche' || v === 'defausse' || v === 'exil') {
      let liste;
      if (v === 'deck') { liste = run.deck; titre = 'Ton paquet (' + liste.length + ')'; }
      else { const c = run.combat; liste = v === 'pioche' ? c.pioche.slice().sort((a, b) => a.id.localeCompare(b.id)) : v === 'defausse' ? c.defausse : c.exil; titre = { pioche: 'Pioche (ordre masqué)', defausse: 'Défausse', exil: 'Cartes consumées' }[v] + ' (' + liste.length + ')'; }
      const liens = v === 'deck' ? `<div class="liens-liste">${M.liens(run).map((l) => `<div class="l ${l.palier >= 0 ? 'actif' : ''}"><b style="color:${l.couleur}">${l.nom} ${l.n}</b><span>${l.txt ? esc(l.txt) : 'Inactif'}${l.prochain ? ' · prochain palier à ' + l.prochain : ''}</span></div>`).join('')}</div>` : '';
      corps = liens + `<div class="grille-deck">${liste.map((x) => carteHTML(x)).join('') || '<span class="muet">Vide.</span>'}</div>`;
    } else if (v === 'sac') {
      const cl = D.CLASSES[run.classe], her = cl.heritages[run.heritage];
      titre = 'Sac : reliques, familiers, talents';
      corps = `<div class="col" style="padding:12px">
        <h3>Compétence : ${esc(cl.comp.nom)} (rang ${run.rang})</h3>${cl.comp.rangs.map((r, i) => `<div class="muet" style="${i < run.rang ? 'color:var(--clair)' : ''}">Rang ${i + 1} : ${esc(r)}</div>`).join('')}
        <h3>Héritage</h3>${talismanHTML('her', { def: her, ico: 'i-couronne' })}
        <h3>Reliques (${(run.reliques || []).length})</h3>${(run.reliques || []).map((t) => reliqueHTML(t)).join('') || '<span class="muet">Les élites et les boss en donnent.</span>'}
        <h3>Familiers (${(run.familiers || []).length}/${M.equipeMax(run)})</h3>${(run.familiers || []).map((f) => familierHTML(f)).join('') || '<span class="muet">Après certains combats, un familier peut s\'approcher. Il agit au début de chaque tour, évolue, et compte pour sa tribu.</span>'}
        <h3>Talismans (${run.talismans.length})</h3>${run.talismans.map((t) => talismanHTML(t)).join('') || '<span class="muet">Le marchand en vend contre des éclats.</span>'}
        <h3>Talents (${run.talents.length})</h3>${run.talents.map((id) => talismanHTML(id, { def: M.talentDef(id), ico: 'i-epee' })).join('') || '<span class="muet">Monte de niveau pour en choisir.</span>'}
        <h3>Liens de tribus</h3>${M.liens(run).map((l) => `<div class="muet"><b class="px" style="color:${l.couleur}">${l.nom} ${l.n}</b> : ${l.txt ? esc(l.txt) : 'inactif'} (paliers ${D.TRIBUS[l.tribu].paliers.join(', ')})</div>`).join('')}
      </div>`;
    } else if (v === 'conseiller') {
      const ctx = ui.conseillerCtx;
      const r = ctx === 'chemin' ? M.conseillerChemin(run) : ctx === 'marchand' ? M.conseillerMarchand(run) : ctx === 'combat' ? M.conseillerCombat(run) : M.conseillerCartes(run, (run.recompense || run.tresor || {}).cartes || []);
      titre = 'Le Conseiller · ' + (r ? r.titre : '');
      corps = `<div class="col conseiller" style="padding:10px 12px;gap:8px"><div class="muet">Le Conseiller compare, le Mentor tranche. Voici le pour et le contre de chaque option.</div>${r ? r.options.map((o) => `<div class="option ${o.meilleur ? 'meilleur' : ''}"><b>${esc(o.nom)}</b>${o.risque ? ` <span class="risque r-${o.risque}">risque ${o.risque}</span>` : ''}${o.meilleur ? ' <span class="tag-meilleur">le plus solide</span>' : ''}${o.suite ? `<div class="muet">Suite : ${esc(o.suite.join(', '))}</div>` : ''}<div class="pc">${o.pour.map((t) => `<span class="pour">+ ${esc(t)}</span>`).join('')}${o.contre.map((t) => `<span class="contre">- ${esc(t)}</span>`).join('')}${!o.pour.length && !o.contre.length ? '<span class="muet">Rien de notable.</span>' : ''}</div></div>`).join('') : '<span class="muet">Rien à comparer ici.</span>'}</div>`;
    } else if (v === 'aide') { titre = 'Comment jouer'; corps = AIDE; }
    else if (v === 'nouveautes') { titre = 'Nouveautés'; corps = NOUVEAUTES; }
    else if (v === 'credits') { titre = 'Crédits'; corps = CREDITS; }
    else if (v === 'options') {
      titre = 'Son et options';
      const etat = Son.etat();
      corps = `<div class="col" style="padding:14px;gap:14px">
        <label class="reglage"><span>Musique <b>${Math.round(meta.volMusique * 100)} %</b></span><input type="range" min="0" max="100" step="5" value="${Math.round(meta.volMusique * 100)}" data-vol="musique"></label>
        <label class="reglage"><span>Bruitages <b>${Math.round(meta.volEffets * 100)} %</b></span><input type="range" min="0" max="100" step="5" value="${Math.round(meta.volEffets * 100)}" data-vol="effets"></label>
        <div class="ligne"><button class="btn" data-a="son">${Son.estMuet() ? 'Rétablir le son' : 'Couper le son'}</button><button class="btn bleu" data-a="testSon">Tester le son</button></div>
        <div class="muet">État audio : ${esc(etat)}. Sur iPhone, le son démarre au premier toucher. Si tu n'entends rien, vérifie le volume du téléphone, puis touche « Tester le son ».</div>
      </div>`;
    }
    return `<div class="voile"><div class="entete"><h2>${esc(titre)}</h2><button class="btn petit" data-a="fermerVoile">Fermer</button></div><div class="contenu">${corps}</div></div>`;
  }

  const AIDE = `<div class="texte-long">
    <h3>Le combat</h3><ul>
    <li>Tu as <b>3 mana</b> par tour et toujours <b>4 cartes en main</b> : chaque carte jouée est aussitôt remplacée.</li>
    <li>Touche une carte : l'<b>aperçu exact</b> s'affiche aussitôt (dégâts sur chaque cible, part de vie qui va tomber, « Létal » si l'ennemi meurt, ta garde face aux dégâts annoncés). Puis <b>touche-la encore</b> (ou Jouer) pour confirmer. S'il y a plusieurs ennemis, touche celui que tu vises.</li>
    <li>Le <b>Mentor</b> te dit en une ligne quelle carte jouer et pourquoi, ou s'il vaut mieux finir le tour. Il conseille aussi les récompenses, les reliques, le marchand et les évolutions.</li>
    <li>Les <b>Lames</b> frappent, les <b>Sorts</b> protègent ou préparent. Chaque classe a sa propre mécanique (Chaleur, Brume, Gel, Flèches, Rouages, Sève, Rage, Âmes, Cadence, Or, Marque, Contre, Arcane, Harmonie).</li>
    <li>Le <b>Conseiller</b> (bouton Comparer) ne décide pas : il met côte à côte le pour et le contre de chaque coup, carte, achat ou chemin.</li>
    <li>Au-dessus de chaque ennemi, son <b>intention</b>. Touche-le pour lire ses tactiques : certains volent ton or, se relèvent, se divisent, protègent leurs alliés ou t'obligent à les viser.</li>
    <li>La <b>garde</b> absorbe les coups et disparaît au tour suivant. Gagner du mana deux fois dans un tour donne de la Force (Surcharge).</li></ul>
    <h3>Raretés</h3><ul>
    <li>Le cadre de chaque carte montre sa rareté : <span class="r-C">commune</span> (gris), <span class="r-P">peu commune</span> (vert), <span class="r-R">rare</span> (bleu), <span class="r-E">épique</span> (violet), <span class="r-L">légendaire</span> (or). Une seule carte légendaire de chaque sorte par paquet.</li>
    <li>Les chances de chaque rareté s'affichent sous les récompenses. Les élites et les boss donnent de meilleures cartes, et chaque récompense sans carte rare augmente un peu tes chances à la suivante.</li></ul>
    <h3>Reliques et familiers</h3><ul>
    <li>Chaque élite te laisse choisir une relique parmi deux, chaque boss une relique de boss parmi trois. Elles restent toute la course et changent ta façon de jouer.</li>
    <li>Après certains combats, un <b>familier</b> s'approche. Il se tient à côté de toi, agit au début de chacun de tes tours et compte pour sa tribu. Après 3 puis 7 combats, il évolue et <b>tu choisis sa voie</b> (A ou B) : chaque lignée a 4 formes finales possibles.</li></ul>
    <h3>La course</h3><ul>
    <li>Trois actes de 16 étapes, chacun dans un monde tiré au hasard, avec un boss annoncé dès le départ. Trois voies : Sécurité à gauche (braseros), Équilibre au centre, Audace à droite (élites, élite enflammée). Des carrefours permettent de changer de voie.</li>
    <li>Chaque boss vaincu offre <b>3 cartes légendaires</b> au choix. La <b>jauge de fortune</b> monte à chaque récompense commune ou passée et augmente tes chances de rares ; elle retombe quand tu prends une rare.</li>
    <li><b>Serments</b> : des défis facultatifs à choisir avant de partir (élites enflammées, meutes, jeûne, orgueil), contre du renom.</li>
    <li>À chaque <b>niveau</b>, tu choisis un talent. Chez le marchand, tu peux monter le <b>rang de ta compétence</b> et acheter des talismans contre des éclats.</li>
    <li><b>Tribus</b> : Forgés, Bêtes, Lucioles, Cendrés, Givrins. Avec 3, 5 puis 7 cartes d'une tribu, un lien s'active.</li>
    <li>Certaines cartes ont une <b>quête</b> : elles évoluent toutes seules (★★, ★★★).</li></ul>
    <h3>Entre les courses</h3><ul>
    <li>Le <b>renom</b> débloque les classes (Vesper au niveau 7, Nacre au niveau 8), puis les héritages et les Brasiers (10 paliers de difficulté).</li>
    <li>« Tout débloqué », sur l'écran titre, ouvre tout de suite toutes les classes, les héritages et les Brasiers.</li></ul></div>`;
  const NOUVEAUTES = `<div class="texte-long">
    <h3>V9, 20/11/2026 : plus long, plus profond</h3><ul>
    <li>Actes de 16 étapes avant le boss, sur trois voies lisibles (Sécurité, Équilibre, Audace) reliées par des carrefours. 2 à 3 élites par acte, dont une élite enflammée qui paie trois reliques.</li>
    <li>Le boss de l'acte est annoncé dès la première étape. 3 bosses possibles par acte, chacun avec sa mécanique.</li>
    <li>Après chaque boss : 3 cartes légendaires garanties au choix.</li>
    <li>Jauge de fortune : chaque récompense commune ou passée augmente tes chances de rare, d'épique et de légendaire.</li>
    <li>4 nouvelles classes : Corvine la Lame-corbeau (assassin, Marques), Basalte le Rempart vivant (colosse, Contre), Ysar l'Arcaniste (mage, Arcane), Aubade la Chanteuse d'aube (enchanteresse, Harmonie et familiers). 14 classes, chacune avec sa silhouette.</li>
    <li>71 nouvelles cartes, dont une légendaire par classe et des légendaires neutres. 216 cartes en tout.</li>
    <li>19 nouveaux monstres, chaque élite a sa mécanique signature (voile de suie, carapace, seuil, torpeur, ombre, deuxième phase).</li>
    <li>Le Conseiller : compare le pour et le contre de chaque option (coups, cartes, achats, chemins). Le Mentor reste là pour trancher.</li>
    <li>Serments : 4 défis facultatifs contre du renom. 8 nouveaux événements (33 en tout).</li>
    <li>Brasier 10 plus dur : plus de PV par acte, boss plus coriaces qui s'énervent, soins et or réduits.</li>
    <li>Nouvelle musique en synthèse : un leitmotiv au piano et aux cordes, un thème de combat à basse mouvante, un thème de boss avec chœur, une fanfare de victoire et une ambiance de carte.</li></ul>
    <h3>V8, 20/11/2026 : profondeur et ressenti</h3><ul>
    <li>Aperçu exact avant de jouer : dégâts sur chaque cible, part de vie qui tombe, marque « Létal », garde face aux dégâts annoncés. Calculé par le moteur du jeu lui-même.</li>
    <li>Combat plus vivant : carte qui vole vers sa cible, arrêt sur image et secousse sur les gros coups, éclats de feu, de givre, de poison ou de Cadence, note qui monte à chaque carte enchaînée.</li>
    <li>Nouvelle direction artistique : une arène par monde (torches animées, braises, brume), cadres de cartes ornés par rareté, illustrations 48×32 en plusieurs plans, boss agrandis avec bannière d'entrée.</li>
    <li>Familiers à évolutions embranchées : 2 choix de voie par lignée, 10 nouvelles formes. Ton familier se tient à côté de toi en combat.</li>
    <li>Le Mentor explique : une ligne de raison en combat, un conseil sur les cartes, les reliques, le marchand et les évolutions.</li>
    <li>145 cartes (43 nouvelles cartes de synergie) et 25 événements répartis sur les 3 actes.</li>
    <li>Équilibrage refait à partir de la télémétrie du simulateur (taux de prise et de victoire par carte et par relique).</li></ul>
    <h3>V7, 19/11/2026 : cartes illustrées, reliques, familiers</h3><ul>
    <li>Chaque carte a son illustration en pixel art, un cadre aux couleurs de sa classe et une gemme de rareté : commune, peu commune, rare, épique, légendaire (cadre or animé).</li>
    <li>Taux de tirage par rareté, affichés sous les récompenses. 5 cartes légendaires et de nouvelles épiques.</li>
    <li>41 reliques : 31 d'élite (choix parmi 2) et 10 de boss (choix parmi 3).</li>
    <li>Retour des familiers : 5 lignées de 3 stades, une par tribu.</li>
    <li>Bestiaire : chaque monstre a sa tactique (vol, fuite, résurrection, division, provocation, protection, rage, vampirisme…).</li>
    <li>2 nouvelles classes : Vesper l'Horlogère (Cadence et Écho) et Nacre la Prêteuse (elle paie ses coups en or).</li>
    <li>Musique refaite : thèmes distincts pour le titre, la carte, le combat, l'élite, le boss et le marchand. Nouveaux bruitages. Réglage du volume. Correctif du son sur iPhone.</li>
    <li>Passer une carte en récompense rapporte 8 or.</li></ul>
    <h3>V6, 19/11/2026 : la refonte pixel art</h3><ul>
    <li>Pixel art rétro, 8 classes, main de 4 cartes, sélection puis confirmation, progression RPG, tribus, quêtes, Mentor, mode « Tout débloqué ».</li></ul>
    <h3>V5, 17/11/2026</h3><ul><li>Silex le Brisegivre, décors par acte, premiers familiers de braise. Reste jouable via le tag v5 du dépôt.</li></ul></div>`;
  const CREDITS = `<div class="texte-long">
    <h3>Sprites et décors</h3><p>« 16x16 DungeonTileset II » de 0x72 (v1.7), licence <b>CC0 1.0</b> (domaine public) : 0x72.itch.io/dungeontileset-ii. Recolorés et assemblés pour Braises.</p>
    <h3>Illustrations des cartes, reliques et familiers</h3><p>Composées pour Braises à partir des armes du « DungeonTileset II » de 0x72 et du « 1-Bit Pack » 1.2 de Kenney (kenney.nl), licence <b>CC0 1.0</b> : sprites recolorés, ciels, silhouettes, sols, halos et particules générés par code.</p>
    <h3>Arènes</h3><p>Générées par code (outils/arenes.py), avec les textures de mur et de sol du DungeonTileset II de 0x72 (CC0 1.0), recolorées. Flammes et braises animées faites maison.</p>
    <h3>Police</h3><p>Pixelify Sans, The Pixelify Sans Project Authors, licence <b>SIL Open Font License 1.1</b>.</p>
    <h3>Musique et sons</h3><p>Composés et générés en direct dans le navigateur (synthèse Web Audio), faits maison. Aucun échantillon externe. La bande originale de la V9 s'inspire de l'esprit des musiques de RPG japonais des années 90 (leitmotiv, piano, cordes, chœur) ; toutes les mélodies sont originales, aucune n'est reprise.</p>
    <h3>Jeu</h3><p>Braises est un jeu original. Ses mécaniques s'inspirent du genre deckbuilder roguelike (main qui se remplit, classes à compétence évolutive, races de cartes et cartes à quête à la façon de Rogue Adventure ; carte à embranchements, reliques et intentions à la façon de Slay the Spire). Aucun nom, texte, visuel ni son n'est repris de ces jeux. Les archétypes des 4 classes de la V9 (assassin, colosse, mage, enchanteresse) sont des rôles classiques du genre MOBA ; noms, visuels et mécaniques sont originaux.</p></div>`;

  // ---------- actions ----------
  function nouvelleCourse() {
    run = M.nouvelleCourse(ui.classe, { heritage: ui.heritage, brasier: ui.brasier, serments: ui.serments });
    ui.ecran = 'jeu'; ui.selNoeud = null; ui.choix = null; sauver();
  }
  async function jouerSel(cibleU) {
    const c = run.combat; const i = ui.sel; if (i == null || ui.verrou) return;
    const inst = c.main[i];
    if (!M.peutJouer(run, c, i)) { Son.bip('erreur'); toast(M.cout(inst, c) > c.j.mana ? 'Pas assez de mana' : 'Pas assez d\'or'); return; }
    if (M.besoinCible(inst) && cibleU == null && M.vivants(c).length > 1) { toast('Touche un ennemi'); return; }
    const d = M.def(inst);
    const elCarte = $ecran.querySelector(`.main .carte[data-p="${i}"]`);
    const de = elCarte ? elCarte.getBoundingClientRect() : null, html = elCarte ? elCarte.outerHTML : '';
    const cibleEl = cibleU != null ? $ecran.querySelector(`.ennemi[data-p="${cibleU}"] .spr`) : (d.t === 'L' ? $ecran.querySelector('.ennemi:not(.mort) .spr') : elH());
    const vers = cibleEl ? cibleEl.getBoundingClientRect() : null;
    const res = M.jouerCarte(run, c, i, cibleU);
    if (!res.ok) { Son.bip('erreur'); if (res.raison === 'provocation') toast('Un ennemi te provoque : vise-le d\'abord'); else if (res.raison === 'or') toast('Pas assez d\'or'); return; }
    ui.sel = null; ui.info = null; ui.detailHeros = false; ui.element = elementCarte(d);
    voler(html, de, vers);
    Son.bip(d.t === 'L' ? 'lame' : 'sort'); Son.chaine(c.joues || 1, d.t);
    const fini = run.ecran !== 'combat';
    if (fini) { if (d.t === 'L') anim(elH(), 'elan-h'); ui.verrou = true; await attendre(150); await jouerEvenements(res.ev, 0); await attendre(650); ui.verrou = false; Son.stinger('victoire'); ui.choix = null; rendre(); sauver(); return; }
    rendre(); sauver();
    if (d.t === 'L') anim(elH(), 'elan-h');
    setTimeout(() => jouerEvenements(res.ev, 0), 150);
  }
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  async function finDuTour() {
    if (ui.verrou) return;
    const c = run.combat; ui.sel = null; ui.info = null; ui.detailHeros = false;
    Son.bip('fin-tour');
    M.finTour(run, c);
    const evs = c.ev.slice();
    ui.verrou = true;
    if (run.ecran === 'combat') { rendre(); await jouerEvenements(evs, 330); }
    else { await jouerEvenements(evs, 330); await attendre(500); }
    ui.verrou = false;
    if (run.ecran === 'fin') Son.stinger('defaite');
    else if (run.ecran === 'recompense') Son.stinger('victoire');
    ui.choix = null;
    rendre(); sauver();
  }

  function action(a, p) {
    if (ui.verrou && !['voile', 'fermerVoile'].includes(a)) return;
    if (a !== 'abandon') ui.abandon = false;
    switch (a) {
      case 'titre': ui.ecran = 'titre'; break;
      case 'continuer': ui.ecran = 'jeu'; break;
      case 'abandon': if (ui.abandon) { if (run) { run.fini = true; run.gagne = false; M.enregistrerFin(meta, run); } run = null; ui.abandon = false; sauver(); } else ui.abandon = true; break;
      case 'nouvelle': ui.ecran = 'classe'; ui.classe = ui.classe || meta.dernierClasse || null; break;
      case 'mentor': meta.mentor = !meta.mentor; sauver(); break;
      case 'conseillerBascule': meta.conseiller = !meta.conseiller; sauver(); break;
      case 'conseiller': ui.conseillerCtx = p; ui.voile = 'conseiller'; break;
      case 'serment': ui.serments = ui.serments.includes(p) ? ui.serments.filter((x) => x !== p) : ui.serments.concat(p); break;
      case 'tout': meta.toutDebloque = !meta.toutDebloque; sauver(); toast(meta.toutDebloque ? 'Tout est débloqué' : 'Progression normale'); break;
      case 'son': Son.bascule(); meta.muet = Son.estMuet(); sauver(); break;
      case 'classe': if (M.classesDebloquees(meta).includes(p)) { ui.classe = p; ui.heritage = 0; } else toast('Renom niveau ' + D.CLASSES[p].renom + ' requis'); break;
      case 'heritage': if (M.heritagesDebloques(meta, ui.classe).includes(+p)) ui.heritage = +p; else toast('Pas encore débloqué'); break;
      case 'brasier': if (+p <= M.brasierMax(meta, ui.classe)) ui.brasier = +p; else toast('Gagne au Brasier ' + (+p - 1) + ' d\'abord'); break;
      case 'partir': meta.dernierClasse = ui.classe; nouvelleCourse(); break;
      case 'voile': ui.voile = p; break;
      case 'fermerVoile': ui.voile = null; break;
      case 'noeud': if (M.choixCarte(run).includes(p)) { if (ui.selNoeud === p) return action('aller'); ui.selNoeud = p; } break;
      case 'aller': if (ui.selNoeud && M.entrerNoeud(run, ui.selNoeud)) {
        ui.selNoeud = null; ui.sel = null; ui.choix = null;
        if (run.ecran === 'combat' && (run.combat.type === 'boss' || run.combat.type === 'elite')) {
          const boss = run.combat.type === 'boss', e0 = run.combat.ennemis[0];
          ui.banniere = { nom: boss ? D.ENNEMIS[run.bossId].nom : e0.nom, titre: boss ? 'Gardien de ' + D.MONDES[run.monde].nom : 'Élite', elite: !boss };
          Son.stinger(boss ? 'boss' : 'surcharge');
          setTimeout(() => { ui.banniere = null; const b = $ecran.querySelector('.banniere-boss'); if (b) b.remove(); }, 2600);
        }
        sauver();
      } break;
      case 'carte': { const i = +p; if (ui.sel === i) { jouerSel(ui.selCible); return; } ui.sel = i; ui.selCible = null; ui.info = null; ui.detailHeros = false; Son.bip('clic'); break; }
      case 'ennemi': {
        const u = +p; const c = run.combat;
        if (ui.sel != null && M.besoinCible(c.main[ui.sel])) { jouerSel(u); return; }
        ui.info = ui.info === u ? null : u; break;
      }
      case 'heros': ui.detailHeros = !ui.detailHeros; ui.sel = null; break;
      case 'jouer': if (ui.sel == null) { toast('Choisis une carte'); return; } jouerSel(ui.selCible); return;
      case 'conseil': { const m = M.conseilCombat(run); if (!m || m.i < 0) { toast('Le Mentor : finis ton tour'); return; } ui.sel = m.i; ui.selCible = m.u; ui.info = null; toast('Le Mentor : ' + D.CARTES[run.combat.main[m.i].id].nom + (m.u != null && M.vivants(run.combat).length > 1 ? ' sur ' + run.combat.ennemis.find((e) => e.u === m.u).nom : '')); break; }
      case 'fin': finDuTour(); return;
      case 'choixCarte': ui.choix = ui.choix === p ? null : p; break;
      case 'prendre': if (ui.choix && M.prendreCarte(run, ui.choix)) { Son.bip('carte'); ui.choix = null; sauver(); } break;
      case 'passerCarte': if (M.passerCarte(run)) { Son.bip('piece'); ui.choix = null; sauver(); } break;
      case 'choixRel': ui.choix = 'R' + p; Son.bip('clic'); break;
      case 'prendreRel': if (ui.choix && M.choisirRelique(run, ui.choix.slice(1))) { Son.stinger('relique'); ui.choix = null; sauver(); } break;
      case 'prendreFam': if (M.prendreFamilier(run)) { Son.stinger('familier'); sauver(); } break;
      case 'remplFam': if (M.prendreFamilier(run, +p)) { Son.stinger('familier'); toast('Ton nouveau familier te suit'); sauver(); } break;
      case 'testSon': Son.debloquer(); Son.stinger('victoire'); break;
      case 'quitterRecompense': if (M.evolutionsEnAttente(run).length) { toast('Choisis d\'abord la voie de ton familier'); break; } M.quitterRecompense(run); ui.choix = null; sauver(); break;
      case 'evoSel': ui.evoSel = p; Son.bip('clic'); break;
      case 'evoOk': {
        const f = M.evolutionsEnAttente(run)[0]; if (!f || !ui.evoSel) break;
        if (M.choisirEvolution(run, f.id, ui.evoSel)) {
          const st = M.famStade(f); ui.evoSel = null; ui.evoAnim = { sprite: st.sprite, nom: st.nom, txt: st.txt };
          Son.stinger('evolution'); sauver(); rendre();
          setTimeout(() => { ui.evoAnim = null; rendre(); }, 1700);
          return;
        }
        break;
      }
      case 'choixTalent': ui.choix = p; break;
      case 'prendreTalent': if (ui.choix && M.choisirTalent(run, ui.choix)) { Son.stinger('relique'); ui.choix = null; sauver(); } break;
      case 'ouvrir': M.ouvrirTresor(run); Son.bip('coffre'); ui.choix = null; sauver(); break;
      case 'quitter': M.quitterEcran(run); ui.choix = null; sauver(); break;
      case 'etal': ui.choix = ui.choix === p ? null : p; break;
      case 'acheter': {
        const k = ui.choix[0], r = ui.choix.slice(1); let ok = false;
        if (k === 'c') ok = M.acheterCarte(run, +r);
        else if (k === 't') ok = M.acheterTalisman(run, +r);
        else ok = M.acheterService(run, r);
        if (ok) { Son.bip('achat'); ui.choix = null; sauver(); } else { Son.bip('erreur'); toast(k === 't' || r === 'relance' ? 'Pas assez d\'éclats' : 'Pas assez d\'or'); }
        break;
      }
      case 'brasero': ui.choix = p; break;
      case 'faireBrasero': if (ui.choix === 'soin') M.braseroSoigner(run); else if (ui.choix === 'mediter') M.braseroMediter(run); else if (ui.choix === 'affuter') { if (run.deck.some(M.affutable)) M.demanderSelection(run, 'affuter', 'brasero'); else toast('Rien à affûter'); } Son.bip('soin'); ui.choix = null; sauver(); if (run.ecran === 'brasero' && run.niveauxEnAttente > 0 && run.brasero.fait) { /* talent au prochain combat */ } break;
      case 'choixEv': ui.choix = +p; break;
      case 'faireEv': if (ui.choix != null && M.choisirEvenement(run, ui.choix)) { ui.choix = null; sauver(); } else toast('Impossible'); break;
      case 'choixDeck': ui.choix = ui.choix === +p ? null : +p; break;
      case 'faireSel': if (ui.choix != null) { const s = run.selection.mode; if (M.appliquerSelection(run, ui.choix)) { const ds = run.dernierSelection; toast(s === 'transformer' && ds.nouveau ? 'Devient : ' + D.CARTES[ds.nouveau].nom : 'Fait'); Son.bip('soin'); ui.choix = null; sauver(); } } break;
      case 'annulerSel': M.annulerSelection(run); ui.choix = null; sauver(); break;
      case 'finTitre': run = null; ui.ecran = 'titre'; sauver(); break;
    }
    rendre();
  }

  // Son : iOS n'autorise l'audio qu'après un geste. On déverrouille au tout premier toucher, quel qu'il soit.
  function debloquerSon() {
    try { Son.debloquer(); Son.volumes(meta.volMusique, meta.volEffets); if (meta.muet && !Son.estMuet()) Son.bascule(); window.__sonPret = true; Son.musique(scene()); } catch (e) {}
  }
  ['pointerdown', 'touchend', 'keydown'].forEach((t) => document.addEventListener(t, () => { if (!window.__sonPret || Son.suspendu()) debloquerSon(); }, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && window.__sonPret) Son.debloquer(); });
  app.addEventListener('input', (ev) => {
    const r = ev.target.closest('[data-vol]'); if (!r) return;
    const v = (+r.value) / 100;
    if (r.dataset.vol === 'musique') meta.volMusique = v; else meta.volEffets = v;
    Son.volumes(meta.volMusique, meta.volEffets);
    const b = r.parentElement.querySelector('b'); if (b) b.textContent = Math.round(v * 100) + ' %';
    sauver();
  });
  app.addEventListener('change', (ev) => { const r = ev.target.closest('[data-vol]'); if (r && r.dataset.vol === 'effets') Son.bip('lame'); });
  app.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-a]');
    if (!b) return;
    if (!window.__sonPret) debloquerSon();
    action(b.dataset.a, b.dataset.p);
  });
  // niveaux gagnés hors combat (méditer, événement) : on les règle au retour sur la carte
  const rendreBase = rendre;
  rendre = function () {
    if (run && ui.ecran === 'jeu' && run.ecran === 'carte' && run.niveauxEnAttente > 0 && !run.talentChoix) { run.apresNiveau = 'carte'; run.ecran = 'niveau'; run.talentChoix = null; preparer(); }
    rendreBase();
  };
  function preparer() { // reprend la logique du moteur pour proposer des talents
    const r = M.D.CLASSES[run.classe];
    const pool = M.D.TALENTS.concat(r.talents).filter((t) => !run.talents.includes(t.id) || t.id === 't-pv');
    const cl = pool.filter((t) => r.talents.includes(t));
    const melange = pool.slice().sort(() => Math.random() - 0.5);
    const choix = []; if (cl.length) choix.push(cl[Math.floor(Math.random() * cl.length)]);
    melange.forEach((t) => { if (choix.length < 3 && !choix.includes(t)) choix.push(t); });
    run.talentChoix = choix.map((t) => t.id);
  }

  window.braises = { M, etat: () => run, meta: () => meta, ui, rendre: () => rendre(), action };
  rendre();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
