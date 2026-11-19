/* Braises V6 : interface (pixel art, tactile iPhone : on sélectionne une carte, puis on confirme). */
(function () {
  const M = window.BraisesMoteur, D = M.D, PIX = window.PIX || {};
  const CLE_META = 'braises6-meta', CLE_PARTIE = 'braises6-partie';
  const app = document.getElementById('app');
  const $ecran = document.getElementById('ecran');
  const lire = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  let meta = Object.assign({ renom: 0, courses: 0, victoires: 0, parClasse: {}, toutDebloque: false, mentor: true }, lire(CLE_META, {}));
  let run = lire(CLE_PARTIE, null);
  if (run && run.v !== 6) run = null;
  const ui = { ecran: 'titre', sel: null, selCible: null, selNoeud: null, classe: null, heritage: 0, brasier: 0, voile: null, info: null, choix: null, verrou: false, abandon: false };

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
  function carteHTML(inst, o) {
    o = o || {};
    const d = M.def(inst), v = M.vals(inst);
    const cl = d.cl ? D.CLASSES[d.cl] : null, tr = d.tr ? D.TRIBUS[d.tr] : null;
    const q = d.q ? (instDeck(inst.u) || inst) : null;
    const quete = d.q && (q.niv || 0) < d.v.length - 1 ? `<span class="quete">Quête : ${esc(d.q.txt)} ${q.q || 0}/${d.q.s[q.niv || 0]}</span>` : (d.q ? '<span class="quete">Quête accomplie</span>' : '');
    return `<button class="carte r-${d.r} ${d.t === 'S' ? 'sort' : 'lame'} ${cl ? 'cl' : ''} ${o.cls || ''}" ${o.attrs || ''} style="${cl ? '--clc:' + cl.couleur : ''}">
      <span class="cout">${d.c}</span><span class="nom">${esc(M.nomCarte(inst))}</span>
      <span class="type">${d.t === 'L' ? 'Lame' : 'Sort'}${tr ? ` <span class="tribu" style="background:${tr.couleur}">${tr.nom}</span>` : ''}</span>
      <span class="texte">${esc(d.txt(v))}</span>${quete}</button>`;
  }

  // ---------- statuts ----------
  const COURT = { force: 'For', robustesse: 'Rob', faible: 'Faib', expose: 'Exp', brulure: 'Brûl', poison: 'Pois', gel: 'Gel', epines: 'Épi', brume: 'Brume', esquive: 'Esq', chaleur: 'Chal', fleches: 'Flè', seve: 'Sève', rage: 'Rage', ames: 'Âmes', rouages: 'Roua', sauvage: 'Sauvage', fragile: 'Frag' };
  const RESS = ['chaleur', 'fleches', 'seve', 'rage', 'ames', 'rouages'];
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
  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; app.appendChild(d); setTimeout(() => d.remove(), 1800); }
  const elE = (u) => $ecran.querySelector(`.ennemi[data-p="${u}"] .spr`);
  const elH = () => $ecran.querySelector('.heros-zone .spr');
  function jouerEvenements(evs, pas) {
    return new Promise((res) => {
      let t = 0;
      evs.forEach((e) => {
        const dt = (e.k === 'agit' ? pas : e.k === 'touche' || e.k === 'deg' ? 90 : 40);
        setTimeout(() => montrerEv(e), t);
        t += dt;
      });
      setTimeout(res, t + 120);
    });
  }
  function montrerEv(e) {
    if (e.k === 'deg') { const el = elE(e.u); if (e.n > 0) { flotter(el, '-' + e.n, 'deg'); anim(el, 'coup'); Son.bip('degat'); } else if (e.bloque) flotter(el, 'bloqué', 'garde'); }
    else if (e.k === 'touche') { const el = elH(); if (e.n > 0) { flotter(el, '-' + e.n, 'touche'); anim(el, 'coup'); Son.bip('degat'); } else if (e.bloque) { flotter(el, 'bloqué', 'garde'); Son.bip('bloc'); } }
    else if (e.k === 'garde') { flotter(elH(), '+' + e.n + ' garde', 'garde'); Son.bip('bloc'); }
    else if (e.k === 'soin') { if (e.n) { flotter(elH(), '+' + e.n, 'soin'); Son.bip('soin'); } }
    else if (e.k === 'agit') { anim(elE(e.u), 'elan-e'); }
    else if (e.k === 'esquive') flotter(elH(), 'esquive', 'info');
    else if (e.k === 'rivet') flotter(elH(), 'Rivet forgé', 'info');
    else if (e.k === 'sauvage') { flotter(elH(), 'Forme sauvage', 'info'); Son.bip('chaleur'); }
    else if (e.k === 'surcharge') flotter(elH(), 'Surcharge : +1 Force', 'info');
    else if (e.k === 'suie') flotter(elH(), '+' + e.n + ' Suie', 'touche');
    else if (e.k === 'quete') toast(D.CARTES[e.id].nom + ' évolue ' + '★'.repeat(e.niv + 1));
    else if (e.k === 'fleches') flotter(elH(), e.n + ' flèche' + (e.n > 1 ? 's' : ''), 'info');
    else if (e.k === 'mort') Son.bip('mort');
  }

  // ---------- musique ----------
  function scene() {
    if (ui.ecran !== 'jeu' || !run) return 'titre';
    if (run.ecran === 'combat') return run.combat && run.combat.type === 'boss' ? 'boss' : 'combat';
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
    $ecran.innerHTML = h + (ui.voile ? rendreVoile() : '');
    if (ui.ecran === 'jeu' && run && run.ecran === 'carte') {
      const z = $ecran.querySelector('.carte-zone'), n = $ecran.querySelector('.noeud.sel') || $ecran.querySelector('.noeud.ouvert');
      if (z && n) z.scrollTop = Math.max(0, n.offsetTop - z.clientHeight * 0.62);
    }
    if (Son && Son.musique && window.__sonPret) Son.musique(scene());
  }

  function hud() {
    const cl = D.CLASSES[run.classe];
    const xa = M.SEUILS_XP[run.niveau - 1] || 0, xb = M.SEUILS_XP[run.niveau] || xa + 1;
    const pct = run.niveau >= M.SEUILS_XP.length ? 100 : Math.round(100 * (run.xp - xa) / (xb - xa));
    return `<div class="hud">
      ${spr(cl.sprite, 1.2, { fixe: true })}
      <span class="stat pv">${ico('i-coeur')} ${run.pv}/${run.pvMax}</span>
      <span class="stat orv">${ico('i-or')} ${run.or}</span>
      <span class="stat ecl">${ico('i-eclat')} ${run.eclats}</span>
      <span class="niv">Niv. ${run.niveau}<span class="barre"><i style="width:${pct}%"></i></span></span>
      <span class="vide"></span>
      <button class="btn" data-a="voile" data-p="deck">Paquet ${run.deck.length}</button>
      <button class="btn" data-a="voile" data-p="sac">Sac</button>
      <button class="btn" data-a="titre" aria-label="Menu">≡</button>
    </div>`;
  }

  // ----- titre -----
  function rendreTitre() {
    const deb = M.classesDebloquees(meta);
    const niv = M.niveauRenom(meta.renom || 0);
    const a = M.RENOM_NIVEAUX[niv - 1] || 0, b = M.RENOM_NIVEAUX[niv] || a + 1;
    const pct = niv >= M.RENOM_NIVEAUX.length ? 100 : Math.round(100 * ((meta.renom || 0) - a) / (b - a));
    const heros = Object.entries(D.CLASSES).map(([k, c]) => `<div class="h ${deb.includes(k) ? '' : 'verrou'}">${spr(c.sprite, 2.6)}<span>${deb.includes(k) ? c.nom : '?'}</span></div>`).join('');
    return `<div class="titre">
      <div class="centre"><div class="logo">BRAISES</div><div class="sous-logo">V6 · deckbuilder roguelike en pixel art</div></div>
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
          <button class="bascule ${meta.toutDebloque ? 'on' : ''}" data-a="tout">Tout débloqué ${meta.toutDebloque ? 'oui' : 'non'}</button>
          <button class="bascule" data-a="son">${Son.estMuet() ? 'Son coupé' : 'Son'}</button>
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
      return `<button class="tuile ${id === k ? 'sel' : ''} ${ok ? '' : 'verrou'}" data-a="classe" data-p="${id}">${spr(c.sprite, 2.2, { fixe: !ok || id !== k })}<span>${ok ? c.nom : 'Renom ' + c.renom}</span></button>`;
    }).join('');
    const conds = ['Disponible', 'Atteindre l\'acte 2 avec ' + cl.nom, 'Gagner une course avec ' + cl.nom];
    const her = cl.heritages.map((h, i) => `<button class="${i === ui.heritage ? 'sel' : ''} ${herDeb.includes(i) ? '' : 'verrou'}" data-a="heritage" data-p="${i}"><b>${esc(h.nom)}</b>${herDeb.includes(i) ? esc(h.txt) : esc(conds[i])}</button>`).join('');
    const bra = Array.from({ length: 11 }, (_, i) => `<button class="${i === ui.brasier ? 'sel' : ''} ${i <= bmax ? '' : 'verrou'}" data-a="brasier" data-p="${i}">${i}</button>`).join('');
    const depart = {}; cl.depart.forEach((id) => { depart[id] = (depart[id] || 0) + 1; });
    return `<div class="entete"><button class="btn petit" data-a="titre">‹</button><h2>Choisis ta classe</h2></div>
      <div class="defile grand">
        <div class="grille-classes">${tuiles}</div>
        <div class="fiche-classe">
          <div class="ligne">${spr(cl.sprite, 4)}<div class="col" style="gap:3px"><h2 style="color:${cl.couleur}">${cl.nom}</h2><span class="muet">${esc(cl.titre)} · ${cl.pv} PV</span><span style="font-size:13px">${esc(cl.resume)}</span></div></div>
          <div class="panneau col" style="gap:5px"><h3>Compétence : ${esc(cl.comp.nom)}</h3>${cl.comp.rangs.map((r, i) => `<div class="rang"><b>Rang ${i + 1}</b><span>${esc(r)}</span></div>`).join('')}<span class="muet">Les rangs 2 et 3 s'achètent chez le marchand.</span></div>
          <div class="muet">Départ : ${Object.entries(depart).map(([id, n]) => n + '× ' + D.CARTES[id].nom).join(', ')}</div>
          <h3>Héritage</h3><div class="choix-ligne">${her}</div>
          <h3>Brasier ${ui.brasier}</h3><div class="brasier-sel">${bra}</div>
          <div class="muet">${esc(M.BRASIER.slice(1, ui.brasier + 1).join(' ') || M.BRASIER[0])}</div>
        </div>
      </div>
      <div class="pied"><button class="btn prim" data-a="partir">Partir avec ${cl.nom}</button></div>`;
  }

  // ----- carte -----
  const NOEUDS = {
    combat: ['i-crane', 'Combat', 'Des créatures du coin. Or, expérience et une carte au choix.'],
    elite: ['i-elite', 'Élite', 'Un adversaire coriace. Plus d\'or, des éclats et un talisman.'],
    tresor: ['i-coffre', 'Trésor', 'Un coffre : or, un éclat et une carte au choix.'],
    marchand: ['i-sac', 'Marchand', 'Cartes, talismans, soins, retrait de carte et rangs de compétence.'],
    evenement: ['i-question', 'Inconnu', 'Une rencontre, un choix.'],
    brasero: ['i-feu', 'Brasero', 'Se soigner, affûter une carte ou méditer.'],
    boss: ['i-boss', 'Boss', '']
  };
  function rendreCarte() {
    const c = run.carte, choix = M.choixCarte(run), chemin = run.chemin || [];
    const LIG = 88, H = (c.rangs + 1) * LIG + 40;
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
      const st = [chemin.includes(n.id) ? 'passe' : '', choix.includes(n.id) ? 'ouvert' : '', ui.selNoeud === n.id ? 'sel' : '', run.pos === n.id ? 'ici' : '', n.type === 'boss' ? 'boss' : ''].join(' ');
      const inner = n.type === 'boss' ? spr(boss.sprite, 1.6, { fixe: true }) : ico(t[0]);
      return `<button class="noeud ${st}" style="left:${x(n)}%;top:${y(n)}px" data-a="noeud" data-p="${n.id}" aria-label="${t[1]}">${inner}</button>`;
    }).join('');
    let fiche;
    if (ui.selNoeud && choix.includes(ui.selNoeud)) {
      const n = c.noeuds[ui.selNoeud], t = NOEUDS[n.type];
      fiche = `<div class="txt"><b>${n.type === 'boss' ? esc(boss.nom) : t[1]}</b>${n.type === 'boss' ? 'Le gardien de ' + esc(D.MONDES[run.monde].nom) + '. Une carte rare et un talisman au choix.' : t[2]}</div><button class="btn prim" data-a="aller">Y aller</button>`;
    } else fiche = `<div class="txt"><b>Où aller ?</b>Touche un lieu qui brille, puis confirme.</div>`;
    const leg = ['combat', 'elite', 'tresor', 'marchand', 'evenement', 'brasero'].map((k) => `<span>${ico(NOEUDS[k][0])} ${NOEUDS[k][1]}</span>`).join('');
    return `${hud()}
      <div class="carte-titre"><h2>${esc(D.MONDES[run.monde].nom)}</h2><span class="muet">Acte ${run.acte + 1}/3 · Brasier ${run.brasier} · Rang ${run.rang}</span></div>
      <div class="legende">${leg}</div>
      <div class="carte-zone"><div class="carte-int" style="height:${H}px"><svg viewBox="0 0 100 ${H}" preserveAspectRatio="none">${lignes}</svg>${noeuds}</div></div>
      <div class="fiche-bas">${fiche}</div>`;
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
    }
    return '';
  }
  function intentTexte(e) {
    const o = M.intentAffiche(run, run.combat, e); if (!o) return '';
    const nomSt = (s) => s === 'suie' ? 'des Suies (cartes mortes) dans ta défausse' : (D.STATUTS[s] || {}).nom || s;
    return { atk: `Va attaquer : ${o.deg} dégâts${o.n > 1 ? ', ' + o.n + ' fois' : ''}.`, atkdeb: `Va attaquer (${o.deg}) et t'infliger ${nomSt(o.s)} ${o.v}.`, atkdef: `Va attaquer (${o.deg}) et se protéger.`, def: `Va se protéger (${o.garde} garde).`, buf: `Va se renforcer (${nomSt(o.s)} +${o.v}).`, deb: `Va t'infliger ${nomSt(o.s)} ${o.v}.`, soin: `Va soigner un allié de ${o.v} PV.`, inv: 'Va appeler du renfort.' }[o.t] || '';
  }
  function rendreCombat() {
    const c = run.combat, cl = D.CLASSES[run.classe], monde = D.MONDES[run.monde];
    const viv = M.vivants(c);
    const selInst = ui.sel != null ? c.main[ui.sel] : null;
    const cibler = selInst && M.besoinCible(selInst) && viv.length > 1;
    const nE = c.ennemis.filter((e) => e.pv > 0).length;
    const ennemis = c.ennemis.map((e) => {
      const d = D.ENNEMIS[e.id];
      const s = d.boss ? 4.6 : nE >= 3 ? 3 : 4;
      return `<button class="ennemi ${e.pv <= 0 ? 'mort' : ''} ${cibler && e.pv > 0 ? 'ciblable' : ''}" data-a="ennemi" data-p="${e.u}">
        ${intentHTML(e)}
        ${spr(e.sprite, s, { flip: true })}
        <span class="jauge"><i style="width:${Math.max(0, 100 * e.pv / e.pvMax)}%"></i><span>${e.garde ? '⛨' + e.garde + ' ' : ''}${e.pv}/${e.pvMax}</span></span>
        <span class="statuts">${statutsHTML(e.st)}</span>
      </button>`;
    }).join('');
    const heros = `<div class="heros-zone" data-a="heros">
      ${c.j.garde ? `<span class="garde-badge">⛨ ${c.j.garde}</span>` : '<span style="height:18px"></span>'}
      ${spr(cl.sprite, 4.6)}
      <span class="jauge heros"><i style="width:${100 * run.pv / run.pvMax}%"></i><span>${run.pv}/${run.pvMax}</span></span>
      <span class="statuts">${statutsHTML(c.j.st)}</span>
    </div>`;
    let info = '';
    if (ui.info) {
      const e = c.ennemis.find((x) => x.u === ui.info && x.pv > 0);
      if (e) { const d = D.ENNEMIS[e.id]; info = `<div class="info-ennemi"><b>${esc(e.nom)}</b> ${d.boss ? '(boss)' : d.elite ? '(élite)' : ''}<br>${intentTexte(e)}${d.passif ? '<br>Capacité : ' + D.PASSIFS[d.passif[0]](d.passif[1]) : ''}${Object.keys(e.st).length ? '<br>' + statutsTexte(e.st) : ''}</div>`; }
    }
    const mana = Array.from({ length: Math.max(3, c.j.mana) }, (_, i) => `<i class="${i < c.j.mana ? '' : 'vide'}"></i>`).join('');
    const liens = M.liens(run).filter((l) => l.palier >= 0).map((l) => `<span style="color:${l.couleur}">${l.nom} ${l.n}</span>`).join('');
    let conseil = null;
    if (meta.mentor && !ui.verrou) { const m = M.conseil(run); conseil = m ? m.i : -1; }
    const main = c.main.map((inst, i) => carteHTML(inst, { cls: [ui.sel === i ? 'sel' : '', M.peutJouer(run, c, i) ? '' : 'injouable', conseil === i ? 'conseil' : ''].join(' '), attrs: `data-a="carte" data-p="${i}"` })).join('');
    let detail;
    if (selInst) {
      const d = M.def(selInst);
      detail = `<b>${esc(M.nomCarte(selInst))}</b> · ${d.t === 'L' ? 'Lame' : 'Sort'} · ${d.c} mana<br>${esc(M.texte(selInst))}${d.exil ? '' : ''}<br><span class="muet">${cibler ? 'Touche un ennemi pour la jouer.' : 'Touche encore la carte, ou Jouer, pour confirmer.'}</span>`;
    } else if (ui.detailHeros) detail = `<b>${cl.nom}</b> · ${esc(cl.comp.nom)} rang ${run.rang} : ${esc(cl.comp.rangs.slice(0, run.rang).join(' '))}<br>${statutsTexte(c.j.st) || '<span class="muet">Aucun effet en cours.</span>'}`;
    else detail = `<span class="muet">Touche une carte pour la lire, puis confirme. ${meta.mentor ? (conseil >= 0 ? 'Le Mentor te suggère la carte marquée.' : 'Le Mentor te conseille de finir le tour.') : ''} Touche un ennemi pour voir ce qu'il prépare.</span>`;
    return `<div class="ecran-combat col grand" style="gap:0">
      <div class="gauche">${hud()}
        <div class="scene" style="background-image:url(pix/${monde.bg}.png)">
          <span class="monde-nom">${esc(monde.nom)}${c.type === 'elite' ? ' · élite' : c.type === 'boss' ? ' · boss' : ''}</span><span class="tour-nom">Tour ${c.tour}</span>
          ${heros}<div class="ennemis-zone">${ennemis}</div>${info}
        </div>
      </div>
      <div class="droite">
        <div class="barre-combat"><span class="mana">${mana}<b>${c.j.mana}</b></span><span class="liens-mini">${liens}</span>
          <span class="piles"><button data-a="voile" data-p="pioche">Pioche ${c.pioche.length}</button><button data-a="voile" data-p="defausse">Déf. ${c.defausse.length}</button>${c.exil.length ? `<button data-a="voile" data-p="exil">Cons. ${c.exil.length}</button>` : ''}</span></div>
        <div class="detail">${detail}</div>
        <div class="main">${main}</div>
        <div class="actions">
          <button class="btn bleu" data-a="conseil">Conseil</button>
          <button class="btn ${selInst ? 'prim' : 'off'}" data-a="jouer">Jouer</button>
          <button class="btn" data-a="fin">Fin du tour</button>
        </div>
      </div>
    </div>`;
  }

  // ----- récompense -----
  function rendreRecompense() {
    const r = run.recompense;
    const tal = r.talisman ? `<div class="section"><h3>Talisman gagné</h3>${talismanHTML(r.talisman)}</div>` : '';
    let talb = '';
    if (r.talismansChoix && r.talismansChoix.length) {
      talb = `<div class="section"><h3>${r.talismanPris ? 'Talisman choisi' : 'Choisis un talisman'}</h3><div class="col">${r.talismansChoix.map((t) => talismanHTML(t, { attrs: r.talismanPris ? '' : `data-a="choixTal" data-p="${t}"`, sel: ui.choix === 'T' + t })).join('')}</div>
        ${!r.talismanPris && ui.choix && ui.choix[0] === 'T' ? `<button class="btn or" style="margin-top:8px;width:100%" data-a="prendreTal">Prendre ${esc(D.TALISMANS[ui.choix.slice(1)].nom)}</button>` : ''}</div>`;
    }
    const cartes = r.cartePrise ? '<div class="muet centre">Carte ajoutée à ton paquet.</div>' : `<div class="cartes-choix">${r.cartes.map((id) => carteHTML({ id, niv: 0, u: 'r' + id }, { cls: ui.choix === id ? 'sel' : '', attrs: `data-a="choixCarte" data-p="${id}"` })).join('')}</div>
      ${ui.choix && D.CARTES[ui.choix] ? `<button class="btn prim" style="width:100%" data-a="prendre">Prendre ${esc(D.CARTES[ui.choix].nom)}</button>` : '<div class="muet centre">Touche une carte pour la choisir, puis confirme. Tu peux aussi passer.</div>'}`;
    return `${hud()}<div class="ecran-centre">
      <div class="fin-titre" style="font-size:30px;color:var(--or)">${r.type === 'boss' ? 'Boss vaincu !' : 'Victoire'}</div>
      <div class="butin"><span>${ico('i-or', 2)} +${r.or}</span>${r.eclats ? `<span>${ico('i-eclat', 2)} +${r.eclats}</span>` : ''}<span style="color:var(--vert)">+${r.xp} XP</span>${r.soin ? `<span style="color:var(--vert)">${ico('i-coeur')} +${r.soin}</span>` : ''}</div>
      ${r.niveaux ? `<div class="niveau-titre" style="font-size:22px">Niveau ${run.niveau} atteint !</div>` : ''}
      ${tal}${talb}
      <div class="section"><h3>Une carte pour ton paquet</h3>${cartes}</div>
    </div><div class="pied"><button class="btn ${r.cartePrise ? 'prim' : ''}" data-a="quitterRecompense">${r.cartePrise ? 'Continuer' : 'Passer'}</button></div>`;
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
      ${ui.choix ? `<button class="btn prim" style="width:100%" data-a="prendre">Prendre ${esc(D.CARTES[ui.choix].nom)}</button>` : ''}`}
    </div><div class="pied"><button class="btn" data-a="quitter">Repartir</button></div>`;
  }

  function rendreMarchand() {
    const m = run.marchand;
    const cartes = m.cartes.map((o, i) => `<div class="item ${o.vendu ? 'vendu' : ''}">${carteHTML({ id: o.id, niv: 0, u: 'm' + i }, { cls: ui.choix === 'c' + i ? 'sel' : '', attrs: o.vendu ? '' : `data-a="etal" data-p="c${i}"` })}<span class="prix-tag ${run.or < o.prix ? 'cher' : ''}">${ico('i-or')} ${o.prix}</span></div>`).join('');
    const tals = m.talismans.map((o, i) => o.vendu ? '' : talismanHTML(o.id, { prix: o.prix, cher: run.eclats < o.prix, sel: ui.choix === 't' + i, attrs: `data-a="etal" data-p="t${i}"` })).join('');
    const SV = { soin: ['Soins', '+30 % de tes PV max'], retirer: ['Retrait', 'Retire une carte du paquet'], transformer: ['Métamorphose', 'Change une carte en une autre'], dupliquer: ['Copie', 'Duplique une carte'], pvmax: ['Fortifiant', '+4 PV max'], rang: ['Compétence', run.rang >= 3 ? 'Rang maximum atteint' : 'Rang ' + (run.rang + 1) + ' : ' + D.CLASSES[run.classe].comp.rangs[run.rang]], relance: ['Nouvel étal', 'Renouvelle les cartes'] };
    const services = Object.keys(SV).map((k) => {
      const p = M.prixService(run, k), off = m.services[k] || (k === 'rang' && run.rang >= 3);
      return `<button class="service ${off ? 'off' : ''} ${ui.choix === 's' + k ? 'sel' : ''}" ${off ? '' : `data-a="etal" data-p="s${k}"`}><b>${SV[k][0]} <span class="prix-tag ${k === 'relance' ? (run.eclats < p ? 'cher' : '') : (run.or < p ? 'cher' : '')}">${ico(k === 'relance' ? 'i-eclat' : 'i-or')} ${p}</span></b>${esc(SV[k][1])}</button>`;
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
    return `${hud()}<div class="ecran-centre" style="align-items:stretch">
      <div class="ligne"><span>${ico('i-sac', 3)}</span><div><h2>Le marchand</h2><div class="muet">« Tout se paie, même la lumière. »</div></div></div>
      <div class="section"><h3>Cartes</h3><div class="etal">${cartes}</div></div>
      <div class="section"><h3>Talismans</h3><div class="col">${tals || '<span class="muet">Plus rien.</span>'}</div></div>
      <div class="section"><h3>Services</h3><div class="services">${services}</div></div>
    </div><div class="pied">${pied}<button class="btn" data-a="quitter">Partir</button></div>`;
  }

  function rendreBrasero() {
    const b = run.brasero;
    const opts = [['soin', 'Se soigner', '+' + M.soinBrasero(run) + ' PV'], ['affuter', 'Affûter', 'Améliore une carte (ou fait avancer sa quête d\'un cran)'], ['mediter', 'Méditer', '+20 XP']];
    return `${hud()}<div class="ecran-centre" style="justify-content:center">
      <h2>Le brasero</h2><div>${ico('i-feu', 6)}</div>
      ${b.fait ? `<div class="muet">${b.fait === 'soin' ? 'Tu te sens mieux.' : b.fait === 'mediter' ? 'Ton esprit s\'éclaircit.' : 'La lame chante.'}</div>` : `<div class="services" style="width:100%">${opts.map(([k, n, t]) => `<button class="service ${ui.choix === k ? 'sel' : ''}" data-a="brasero" data-p="${k}"><b>${n}</b>${t}</button>`).join('')}</div>`}
    </div><div class="pied">${!b.fait ? `<button class="btn prim ${ui.choix ? '' : 'off'}" data-a="faireBrasero">Confirmer</button>` : ''}<button class="btn" data-a="quitter">Repartir</button></div>`;
  }

  function rendreEvenement() {
    const ev = M.evenementDef(run), st = run.evenement;
    let bas;
    if (st.fait == null) bas = `<div class="choix-ev">${ev.choix.map((ch, i) => `<button class="${M.choixPossible(run, ch) ? '' : 'off'} ${ui.choix === i ? 'sel' : ''}" style="${ui.choix === i ? 'border-color:var(--or)' : ''}" data-a="choixEv" data-p="${i}">${esc(ch.txt)}</button>`).join('')}</div>`;
    else {
      bas = `<div class="panneau" style="width:100%">${esc(ev.choix[st.fait].txt)}${(st.resultat || []).length ? '<br><b class="px" style="color:var(--or)">' + esc(st.resultat.join(' · ')) + '</b>' : ''}</div>`;
      if (st.cartes && !st.cartePrise) bas += `<div class="cartes-choix">${st.cartes.map((id) => carteHTML({ id, niv: 0, u: 'e' + id }, { cls: ui.choix === id ? 'sel' : '', attrs: `data-a="choixCarte" data-p="${id}"` })).join('')}</div>${typeof ui.choix === 'string' ? `<button class="btn prim" style="width:100%" data-a="prendre">Prendre ${esc(D.CARTES[ui.choix].nom)}</button>` : ''}`;
    }
    return `${hud()}<div class="ecran-centre"><div>${ico('i-question', 4)}</div><h2>${esc(ev.titre)}</h2><div class="recit">${esc(ev.txt)}</div>${bas}</div>
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
      titre = 'Talismans et talents';
      corps = `<div class="col" style="padding:12px">
        <h3>Compétence : ${esc(cl.comp.nom)} (rang ${run.rang})</h3>${cl.comp.rangs.map((r, i) => `<div class="muet" style="${i < run.rang ? 'color:var(--clair)' : ''}">Rang ${i + 1} : ${esc(r)}</div>`).join('')}
        <h3>Héritage</h3>${talismanHTML('her', { def: her, ico: 'i-couronne' })}
        <h3>Talismans (${run.talismans.length})</h3>${run.talismans.map((t) => talismanHTML(t)).join('') || '<span class="muet">Aucun pour l\'instant. Les élites en donnent, le marchand en vend contre des éclats.</span>'}
        <h3>Talents (${run.talents.length})</h3>${run.talents.map((id) => talismanHTML(id, { def: M.talentDef(id), ico: 'i-epee' })).join('') || '<span class="muet">Monte de niveau pour en choisir.</span>'}
        <h3>Liens de tribus</h3>${M.liens(run).map((l) => `<div class="muet"><b class="px" style="color:${l.couleur}">${l.nom} ${l.n}</b> : ${l.txt ? esc(l.txt) : 'inactif'} (paliers ${D.TRIBUS[l.tribu].paliers.join(', ')})</div>`).join('')}
      </div>`;
    } else if (v === 'aide') { titre = 'Comment jouer'; corps = AIDE; }
    else if (v === 'nouveautes') { titre = 'Nouveautés'; corps = NOUVEAUTES; }
    else if (v === 'credits') { titre = 'Crédits'; corps = CREDITS; }
    return `<div class="voile"><div class="entete"><h2>${esc(titre)}</h2><button class="btn petit" data-a="fermerVoile">Fermer</button></div><div class="contenu">${corps}</div></div>`;
  }

  const AIDE = `<div class="texte-long">
    <h3>Le combat</h3><ul>
    <li>Tu as <b>3 mana</b> par tour et toujours <b>4 cartes en main</b> : chaque carte jouée est aussitôt remplacée.</li>
    <li>Touche une carte pour la lire, puis <b>touche-la encore</b> (ou Jouer) pour confirmer. S'il y a plusieurs ennemis, touche celui que tu vises.</li>
    <li>Les <b>Lames</b> frappent, les <b>Sorts</b> protègent ou préparent. Chaque classe réagit à l'un ou à l'autre.</li>
    <li>Au-dessus de chaque ennemi, son <b>intention</b> : ce qu'il fera à son tour. Touche-le pour les détails et sa capacité.</li>
    <li>La <b>garde</b> absorbe les coups et disparaît au tour suivant. Gagner du mana deux fois dans un tour donne de la Force (Surcharge).</li></ul>
    <h3>La course</h3><ul>
    <li>Trois actes, chacun dans un monde tiré au hasard, avec un boss au sommet.</li>
    <li>Les combats rapportent de l'or, de l'XP et une carte au choix. Les élites donnent un talisman et des éclats.</li>
    <li>À chaque <b>niveau</b>, tu choisis un talent. Chez le marchand, tu peux monter le <b>rang de ta compétence</b>.</li>
    <li><b>Tribus</b> : Forgés, Bêtes, Lucioles, Cendrés, Givrins. Avec 3, 5 puis 7 cartes d'une tribu dans ton paquet, un lien s'active.</li>
    <li>Certaines cartes ont une <b>quête</b> : elles évoluent toutes seules (★★, ★★★) quand tu la remplis.</li></ul>
    <h3>Entre les courses</h3><ul>
    <li>Chaque course rapporte du <b>renom</b>, qui débloque de nouvelles classes.</li>
    <li>Atteindre l'acte 2 puis gagner avec une classe débloque ses héritages. Gagner ouvre le Brasier suivant (10 paliers de difficulté).</li>
    <li>« Tout débloqué », sur l'écran titre, ouvre tout de suite toutes les classes, les héritages et les Brasiers.</li></ul></div>`;
  const NOUVEAUTES = `<div class="texte-long">
    <h3>V6, 19/11/2026 : la refonte pixel art</h3><ul>
    <li>Tout le jeu passe en pixel art rétro : héros et monstres animés visibles en combat, décors de donjon par monde.</li>
    <li>8 classes (Solen, Fumée, Silex, Ivra, Bram, Lierre, Grenat, Ossian), chacune avec sa compétence à trois rangs et trois héritages.</li>
    <li>Main de 4 cartes qui se remplit à chaque carte jouée, 3 mana par tour.</li>
    <li>Sélection puis confirmation : une carte ne part plus au premier toucher.</li>
    <li>Progression RPG : XP, niveaux et talents pendant la course, renom et déblocages entre les courses.</li>
    <li>5 tribus de cartes avec des liens à paliers, et des cartes à quête qui évoluent seules.</li>
    <li>Marchand complet (cartes, talismans contre éclats, soins, retrait, métamorphose, copie, rangs de compétence), trésors, événements, brasero.</li>
    <li>5 mondes, 36 ennemis avec intentions et capacités, 6 boss.</li>
    <li>Mode « Tout débloqué » et Mentor qui suggère un coup.</li>
    <li>Musique plus présente.</li></ul>
    <h3>V5, 17/11/2026</h3><ul><li>Silex le Brisegivre, décors par acte, familiers de braise. Reste jouable via le tag v5 du dépôt.</li></ul></div>`;
  const CREDITS = `<div class="texte-long">
    <h3>Sprites et décors</h3><p>« 16x16 DungeonTileset II » de 0x72 (v1.7), licence <b>CC0 1.0</b> (domaine public) : 0x72.itch.io/dungeontileset-ii. Recolorés et assemblés pour Braises. Icônes du feu, du point d'interrogation, du sac, de la couronne, de l'éclat, du bouclier et de l'intention d'attaque dessinées pour le jeu.</p>
    <h3>Police</h3><p>Pixelify Sans, The Pixelify Sans Project Authors, licence <b>SIL Open Font License 1.1</b>.</p>
    <h3>Musique et sons</h3><p>Générés en direct dans le navigateur, faits maison.</p>
    <h3>Jeu</h3><p>Braises est un jeu original. Ses mécaniques s'inspirent du genre deckbuilder roguelike (main qui se remplit et classes à compétence évolutive à la façon de Rogue Adventure, carte à embranchements à la façon de Slay the Spire). Aucun nom, texte, visuel ni son n'est repris de ces jeux.</p></div>`;

  // ---------- actions ----------
  function nouvelleCourse() {
    run = M.nouvelleCourse(ui.classe, { heritage: ui.heritage, brasier: ui.brasier });
    ui.ecran = 'jeu'; ui.selNoeud = null; ui.choix = null; sauver();
  }
  async function jouerSel(cibleU) {
    const c = run.combat; const i = ui.sel; if (i == null || ui.verrou) return;
    const inst = c.main[i];
    if (!M.peutJouer(run, c, i)) { Son.bip('erreur'); toast('Pas assez de mana'); return; }
    if (M.besoinCible(inst) && cibleU == null && M.vivants(c).length > 1) { toast('Touche un ennemi'); return; }
    const d = M.def(inst);
    const res = M.jouerCarte(run, c, i, cibleU);
    if (!res.ok) { Son.bip('erreur'); return; }
    ui.sel = null; ui.info = null; ui.detailHeros = false;
    Son.bip('jouer');
    const fini = run.ecran !== 'combat';
    if (fini) { if (d.t === 'L') anim(elH(), 'elan-h'); ui.verrou = true; await jouerEvenements(res.ev, 0); await attendre(650); ui.verrou = false; Son.stinger('victoire'); ui.choix = null; rendre(); sauver(); return; }
    rendre(); sauver();
    if (d.t === 'L') anim(elH(), 'elan-h');
    jouerEvenements(res.ev, 0);
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
      case 'tout': meta.toutDebloque = !meta.toutDebloque; sauver(); toast(meta.toutDebloque ? 'Tout est débloqué' : 'Progression normale'); break;
      case 'son': Son.bascule(); break;
      case 'classe': if (M.classesDebloquees(meta).includes(p)) { ui.classe = p; ui.heritage = 0; } else toast('Renom niveau ' + D.CLASSES[p].renom + ' requis'); break;
      case 'heritage': if (M.heritagesDebloques(meta, ui.classe).includes(+p)) ui.heritage = +p; else toast('Pas encore débloqué'); break;
      case 'brasier': if (+p <= M.brasierMax(meta, ui.classe)) ui.brasier = +p; else toast('Gagne au Brasier ' + (+p - 1) + ' d\'abord'); break;
      case 'partir': meta.dernierClasse = ui.classe; nouvelleCourse(); break;
      case 'voile': ui.voile = p; break;
      case 'fermerVoile': ui.voile = null; break;
      case 'noeud': if (M.choixCarte(run).includes(p)) { if (ui.selNoeud === p) return action('aller'); ui.selNoeud = p; } break;
      case 'aller': if (ui.selNoeud && M.entrerNoeud(run, ui.selNoeud)) { ui.selNoeud = null; ui.sel = null; ui.choix = null; if (run.ecran === 'combat' && run.combat.type === 'boss') toast(D.ENNEMIS[run.bossId].nom); sauver(); } break;
      case 'carte': { const i = +p; if (ui.sel === i) { jouerSel(ui.selCible); return; } ui.sel = i; ui.selCible = null; ui.info = null; ui.detailHeros = false; Son.bip('clic'); break; }
      case 'ennemi': {
        const u = +p; const c = run.combat;
        if (ui.sel != null && M.besoinCible(c.main[ui.sel])) { jouerSel(u); return; }
        ui.info = ui.info === u ? null : u; break;
      }
      case 'heros': ui.detailHeros = !ui.detailHeros; ui.sel = null; break;
      case 'jouer': if (ui.sel == null) { toast('Choisis une carte'); return; } jouerSel(ui.selCible); return;
      case 'conseil': { const m = M.conseil(run); if (!m) { toast('Le Mentor : finis ton tour'); return; } ui.sel = m.i; ui.selCible = m.u; ui.info = null; toast('Le Mentor : ' + D.CARTES[run.combat.main[m.i].id].nom + (m.u != null && M.vivants(run.combat).length > 1 ? ' sur ' + run.combat.ennemis.find((e) => e.u === m.u).nom : '')); break; }
      case 'fin': finDuTour(); return;
      case 'choixCarte': ui.choix = ui.choix === p ? null : p; break;
      case 'prendre': if (ui.choix && M.prendreCarte(run, ui.choix)) { Son.bip('soin'); ui.choix = null; sauver(); } break;
      case 'choixTal': ui.choix = 'T' + p; break;
      case 'prendreTal': if (ui.choix && M.choisirTalismanBoss(run, ui.choix.slice(1))) { Son.stinger('relique'); ui.choix = null; sauver(); } break;
      case 'quitterRecompense': M.quitterRecompense(run); ui.choix = null; sauver(); break;
      case 'choixTalent': ui.choix = p; break;
      case 'prendreTalent': if (ui.choix && M.choisirTalent(run, ui.choix)) { Son.stinger('relique'); ui.choix = null; sauver(); } break;
      case 'ouvrir': M.ouvrirTresor(run); Son.stinger('relique'); ui.choix = null; sauver(); break;
      case 'quitter': M.quitterEcran(run); ui.choix = null; sauver(); break;
      case 'etal': ui.choix = ui.choix === p ? null : p; break;
      case 'acheter': {
        const k = ui.choix[0], r = ui.choix.slice(1); let ok = false;
        if (k === 'c') ok = M.acheterCarte(run, +r);
        else if (k === 't') ok = M.acheterTalisman(run, +r);
        else ok = M.acheterService(run, r);
        if (ok) { Son.bip('soin'); ui.choix = null; sauver(); } else { Son.bip('erreur'); toast(k === 't' || r === 'relance' ? 'Pas assez d\'éclats' : 'Pas assez d\'or'); }
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

  app.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-a]');
    if (!b) return;
    if (!window.__sonPret) { try { Son.init(); window.__sonPret = true; } catch (e) {} }
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
