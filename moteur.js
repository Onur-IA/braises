/* Braises V7 : moteur de règles (navigateur et Node).
   Main de 4 cartes qui se remplit à chaque carte jouée, 3 mana par tour, classes à compétence évolutive,
   tribus et liens, cartes à quête qui évoluent, niveaux et talents pendant la course, renom entre les courses.
   Jeu original : aucun nom, texte ni visuel repris d'un autre jeu. */
(function (racine) {
  const D = (typeof module !== 'undefined' && module.exports) ? require('./donnees.js') : racine.BraisesDonnees;
  const { CARTES, CLASSES, TALISMANS, ENNEMIS, MONDES, ACTES, TALENTS, EVENEMENTS, TRIBUS, RELIQUES, FAMILIERS, TAUX } = D;

  // ---------- hasard reproductible (état stocké dans la course) ----------
  function alea(run) {
    let a = (run.rs = (run.rs + 0x6D2B79F5) | 0);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ent = (run, n) => Math.floor(alea(run) * n);
  const choisir = (run, arr) => arr[ent(run, arr.length)];
  const entre = (run, a, b) => a + ent(run, b - a + 1);
  function melanger(run, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = ent(run, i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  const SEUILS_XP = [0, 25, 60, 105, 160, 225, 300, 390, 490];
  const RENOM_NIVEAUX = [0, 80, 200, 360, 560, 800, 1100, 1500, 2000, 2600, 3300];
  const BRASIER = [
    'Aucun malus.',
    'Ennemis : +10 % de PV.',
    'Élites : +1 Force.',
    'Après un boss, tu ne récupères que la moitié de tes PV.',
    'Ennemis : +1 dégât par coup.',
    'Tu commences avec une Suie dans ton paquet.',
    'Marchands : +20 % de prix.',
    'Ennemis : +30 % de PV au total.',
    'Le brasero soigne 20 % au lieu de 30 %.',
    'Boss : +1 Force.',
    'Ennemis : +2 dégâts par coup au total.'
  ];

  // ---------- effets (héritage, talismans, talents) ----------
  function effets(run) {
    const out = [];
    const cl = CLASSES[run.classe];
    if (run.heritage != null && cl.heritages[run.heritage]) out.push(...cl.heritages[run.heritage].eff);
    run.talismans.forEach((t) => TALISMANS[t] && out.push(...TALISMANS[t].eff));
    (run.reliques || []).forEach((t) => RELIQUES[t] && out.push(...RELIQUES[t].eff));
    run.talents.forEach((id) => { const t = talentDef(id); if (t) out.push(...t.eff); });
    return out;
  }
  function eff(run, cle) { return effets(run).filter((e) => e[0] === cle).reduce((s, e) => s + (typeof e[1] === 'number' ? e[1] : e[2] || 0), 0); }
  function talentDef(id) { return TALENTS.find((t) => t.id === id) || Object.values(CLASSES).flatMap((c) => c.talents).find((t) => t.id === id); }

  // ---------- cartes ----------
  function def(inst) { return CARTES[inst.id || inst]; }
  function niveauMax(d) { return d.v.length - 1; }
  function vals(inst) { const d = def(inst); return d.v[Math.min(inst.niv || 0, d.v.length - 1)]; }
  function texte(inst) { return def(inst).txt(vals(inst)); }
  function nomCarte(inst) {
    const d = def(inst); const n = inst.niv || 0;
    if (d.q) return d.nom + ' ' + '★'.repeat(n + 1);
    return d.nom + (n > 0 ? '+' : '');
  }
  function cout(inst, c) { const d = def(inst); if (inst.gratuit) return 0; return d.coutV ? d.coutV(vals(inst)) : d.c; }
  function coutOr(run, inst) { const d = def(inst); if (!d.or) return 0; return Math.round(d.or * (run.classe === 'nacre' && run.rang >= 3 ? 0.6 : 1)); }
  function nouvelleInst(run, id, niv) { return { u: ++run.uidN, id, niv: niv || 0, q: 0 }; }
  function tribuCompte(run, tr) {
    let n = run.deck.filter((x) => def(x).tr === tr).length;
    (run.familiers || []).forEach((f) => { if (FAMILIERS[f.id] && FAMILIERS[f.id].tribu === tr) n += f.stade || 0; });
    return n + (eff(run, 'tribuPlus') || 0);
  }
  function liens(run) {
    const out = [];
    Object.entries(TRIBUS).forEach(([k, t]) => {
      const n = tribuCompte(run, k);
      let palier = -1; t.paliers.forEach((p, i) => { if (n >= p) palier = i; });
      out.push({ tribu: k, nom: t.nom, n, palier, val: palier >= 0 ? t.val[palier] : 0, txt: palier >= 0 ? t.txt[palier] : null, prochain: t.paliers.find((p) => p > n) || null, couleur: t.couleur });
    });
    return out;
  }
  function lienVal(run, tr) { const l = liens(run).find((x) => x.tribu === tr); return l ? l.val : 0; }

  // ---------- création de course ----------
  function nouvelleCourse(classe, opts) {
    opts = opts || {};
    const cl = CLASSES[classe];
    const run = {
      v: 7, classe, heritage: opts.heritage != null ? opts.heritage : 0, brasier: opts.brasier || 0,
      rs: (opts.graine != null ? opts.graine : Math.floor(Math.random() * 2 ** 31)) | 0,
      pvMax: cl.pv, pv: cl.pv, or: 90 + (cl.orDepart || 0), eclats: 1, deck: [], talismans: [], reliques: [], familiers: [], pity: 0, talents: [], rang: 1, niveau: 1, xp: 0,
      niveauxEnAttente: 0, acte: 0, monde: null, bossId: null, carte: null, pos: null, etage: 0, etageTotal: 0,
      ecran: 'carte', combat: null, recompense: null, marchand: null, evenement: null, tresor: null, selection: null, talentChoix: null,
      stats: { tues: 0, degats: 0, tours: 0, elites: 0, boss: 0, cartesJouees: 0 }, uidN: 0, flags: {}, vus: [], journal: [], gagne: false, fini: false
    };
    cl.depart.forEach((id) => run.deck.push(nouvelleInst(run, id)));
    if (run.brasier >= 5) run.deck.push(nouvelleInst(run, 'suie'));
    const bonusPv = eff(run, 'pvMax'); run.pvMax += bonusPv; run.pv += bonusPv;
    run.or += eff(run, 'orDepart');
    commencerActe(run, 0);
    return run;
  }

  function commencerActe(run, n) {
    run.acte = n;
    const a = ACTES[n];
    run.monde = choisir(run, a.mondes);
    run.bossId = choisir(run, a.boss);
    run.carte = genererCarte(run);
    run.pos = null; run.etage = 0; run.ecran = 'carte'; run.chemin = [];
  }

  // ---------- carte ----------
  function genererCarte(run) {
    const R = 7, COLS = 4;
    const noeuds = {};
    const cle = (r, c) => r + '-' + c;
    const departs = melanger(run, [0, 1, 2, 3]).slice(0, 2);
    departs.push(ent(run, COLS), ent(run, COLS));
    departs.forEach((c0) => {
      let c = c0;
      for (let r = 0; r < R; r++) {
        const k = cle(r, c);
        if (!noeuds[k]) noeuds[k] = { id: k, r, c, type: null, liens: [] };
        if (r < R - 1) {
          let nc = Math.max(0, Math.min(COLS - 1, c + choisir(run, [-1, 0, 0, 1])));
          // évite de croiser un lien existant
          const croise = Object.values(noeuds).some((n) => n.r === r && n.liens.some((l) => { const [, lc] = l.split('-').map(Number); return (n.c < c && lc > nc) || (n.c > c && lc < nc); }));
          if (croise) nc = c;
          const nk = cle(r + 1, nc);
          if (!noeuds[k].liens.includes(nk)) noeuds[k].liens.push(nk);
          c = nc;
        } else noeuds[k].liens = ['boss'];
      }
    });
    Object.values(noeuds).forEach((n) => {
      if (n.r === 0) n.type = 'combat';
      else if (n.r === 3) n.type = 'tresor';
      else if (n.r === R - 1) n.type = 'brasero';
      else {
        const poids = [['combat', 44], ['evenement', 20], ['elite', n.r >= 2 ? 14 : 0], ['marchand', n.r >= 2 ? 11 : 0], ['brasero', n.r >= 2 && n.r <= 4 ? 7 : 0]];
        const tot = poids.reduce((s, p) => s + p[1], 0);
        let x = alea(run) * tot;
        for (const [t, w] of poids) { x -= w; if (x < 0) { n.type = t; break; } }
        if (!n.type) n.type = 'combat';
      }
      n.liens.sort();
    });
    noeuds.boss = { id: 'boss', r: R, c: 1.5, type: 'boss', liens: [] };
    return { noeuds, rangs: R };
  }
  function choixCarte(run) {
    if (!run.carte) return [];
    if (run.pos == null) return Object.values(run.carte.noeuds).filter((n) => n.r === 0).map((n) => n.id).sort();
    const n = run.carte.noeuds[run.pos];
    return n ? n.liens.slice() : [];
  }

  function entrerNoeud(run, id) {
    if (!choixCarte(run).includes(id)) return false;
    run.pos = id; run.etage++; run.etageTotal++; run.chemin = (run.chemin || []).concat(id);
    const n = run.carte.noeuds[id];
    const m = MONDES[run.monde];
    if (n.type === 'combat') {
      const pool = (run.acte === 0 && n.r <= 1 && m.faciles) ? m.faciles : m.normaux;
      if (run.flags.eliteSuivante) { run.flags.eliteSuivante = false; commencerCombat(run, choisir(run, m.elites), 'elite'); }
      else commencerCombat(run, choisir(run, pool), 'combat');
    } else if (n.type === 'elite') commencerCombat(run, choisir(run, m.elites), 'elite');
    else if (n.type === 'boss') commencerCombat(run, [run.bossId], 'boss');
    else if (n.type === 'tresor') {
      run.tresor = { or: Math.round(entre(run, 30, 50) * (1 + eff(run, 'orBonus') / 100)), eclats: 1, cartes: tirerCartes(run, 3 + eff(run, 'choixCartes'), 'tresor'), pris: false, ouvert: false };
      run.ecran = 'tresor';
    } else if (n.type === 'marchand') { run.marchand = genererMarchand(run); run.ecran = 'marchand'; }
    else if (n.type === 'evenement') {
      const libres = EVENEMENTS.filter((e) => !run.vus.includes(e.id));
      const ev = choisir(run, libres.length ? libres : EVENEMENTS);
      run.vus.push(ev.id); run.evenement = { id: ev.id, fait: null }; run.ecran = 'evenement';
    } else if (n.type === 'brasero') { run.ecran = 'brasero'; run.brasero = { fait: null }; }
    return true;
  }

  // ---------- combat ----------
  function P(e, k) { const d = ENNEMIS[e.id]; const p = d && d.pas && d.pas.find((x) => x[0] === k); return p ? p[1] : 0; }
  function creerEnnemi(run, c, id, invoque) {
    const d = ENNEMIS[id];
    let pv = entre(run, d.pv[0], d.pv[1]);
    let mult = [1.08, 1.32, 1.48][run.acte] || 1.48; if (run.brasier >= 1) mult += 0.1; if (run.brasier >= 7) mult += 0.2;
    pv = Math.round(pv * mult);
    const e = { u: ++c.uidE, id, nom: d.nom, sprite: d.sprite, pv, pvMax: pv, garde: 0, st: {}, mi: d.alea ? ent(run, d.m.length) : 0, intent: null, dernier: [], invoque: !!invoque,
      rang: d.boss ? 'boss' : d.elite ? 'elite' : 'normal', bonusDeg: (run.brasier >= 4 ? 1 : 0) + (run.brasier >= 10 ? 1 : 0), vol: 0, tours: 0 };
    if (d.elite && run.brasier >= 2) e.st.force = 1;
    if (d.boss && run.brasier >= 9) e.st.force = (e.st.force || 0) + 1;
    const esq = (d.pas || []).find((x) => x[0] === 'esquive'); if (esq && !invoque) e.st.esquive = esq[1];
    return e;
  }
  function choisirIntent(run, c, e) {
    const d = ENNEMIS[e.id];
    let m;
    if (d.alea) {
      let k = ent(run, d.m.length);
      if (e.dernier.length >= 2 && e.dernier[0] === k && e.dernier[1] === k) k = (k + 1) % d.m.length;
      e.dernier.unshift(k); e.dernier.length = Math.min(2, e.dernier.length);
      m = d.m[k];
    } else { m = d.m[e.mi % d.m.length]; e.mi++; }
    if (m.t === 'inv' && vivants(c).length >= 4) m = { t: 'atk', v: 6 };
    e.intent = Object.assign({}, m);
    if (P(e, 'voleur') && e.rang === 'normal' && e.tours >= 3) e.intent = { t: 'fuite' };
  }
  function vivants(c) { return c.ennemis.filter((e) => e.pv > 0); }
  function ciblesValides(c) { const v = vivants(c); const t = v.filter((e) => P(e, 'provocation')); return t.length ? t : v; }

  const RESS_CLASSE = { solen: 'chaleur', fumee: 'brume', ivra: 'fleches', bram: 'rouages', lierre: 'seve', grenat: 'rage', ossian: 'ames', vesper: 'cadence' };
  function commencerCombat(run, ids, type) {
    const c = { type, ennemis: [], main: [], pioche: [], defausse: [], exil: [], j: { garde: 0, mana: 0, st: {} }, tour: 0, joues: 0, jouesCombat: 0, surch: false, fin: null, ev: [], uidE: 0, uidC: 0, xp: 0, dernier: null,
      reserve: 0, orFin: 0, consumees: 0, typePrec: null, dernierJoue: null, manteau: false };
    run.combat = c; run.ecran = 'combat';
    ids.forEach((id) => c.ennemis.push(creerEnnemi(run, c, id)));
    c.pioche = melanger(run, run.deck.map((x) => ({ u: x.u, id: x.id, niv: x.niv })));
    const suies = eff(run, 'suiesCombat'); for (let i = 0; i < suies; i++) c.pioche.splice(ent(run, c.pioche.length + 1), 0, { u: 's' + (++c.uidC), id: 'suie', niv: 0, temp: true });
    // liens de tribus
    const forge = lienVal(run, 'forge'); if (forge) gagnerGarde(run, c, forge, true);
    const cendre = lienVal(run, 'cendre'); if (cendre) c.ennemis.forEach((e) => ajSt(e, 'brulure', cendre));
    const givre = lienVal(run, 'givre'); if (givre) c.ennemis.forEach((e) => ajSt(e, 'gel', givre));
    // effets de début de combat
    effets(run).forEach((ef) => {
      if (ef[0] === 'debutCombat') { if (ef[1] === 'garde') gagnerGarde(run, c, ef[2], true); else if (ef[1] === 'cadence') gagnerCadence(run, c, ef[2]); else ajSt(c.j, ef[1], ef[2]); }
      if (ef[0] === 'debutCombatEnnemis') c.ennemis.forEach((e) => ajSt(e, ef[1], ef[2]));
    });
    const rc = eff(run, 'ressourceClasse');
    if (rc) {
      if (run.classe === 'silex') c.ennemis.forEach((e) => ajSt(e, 'gel', rc));
      else if (run.classe === 'nacre') run.or += 10 * rc;
      else if (run.classe === 'fumee') ajSt(c.j, 'brume', 1);
      else if (run.classe === 'vesper') gagnerCadence(run, c, rc);
      else if (RESS_CLASSE[run.classe]) ajSt(c.j, RESS_CLASSE[run.classe], rc);
    }
    if (run.classe === 'silex' && run.rang >= 3) c.ennemis.forEach((e) => ajSt(e, 'gel', 2));
    if (run.classe === 'ossian' && run.rang >= 2) gagnerAmes(run, c, 2);
    if (run.classe === 'nacre') { const fo = Math.min(3, Math.floor(run.or / 70)); if (fo) ajSt(c.j, 'force', fo); } if (run.classe === 'nacre') { const g = run.rang >= 2 ? Math.min(15, Math.floor(run.or / 10)) : Math.min(8, Math.floor(run.or / 20)); if (g) gagnerGarde(run, c, g, true); }
    if (run.classe === 'lierre') verifSauvage(run, c);
    (run.familiers || []).forEach((f) => { const s = famStade(f); if (s && s.esquive) ajSt(c.j, 'esquive', s.esquive); });
    if (type === 'elite') run.stats.elites++;
    debutTour(run, c);
  }

  function ajSt(ent_, s, n) { ent_.st[s] = (ent_.st[s] || 0) + n; if (ent_.st[s] <= 0) delete ent_.st[s]; }
  function stJoueur(run, c, s, n) { if (eff(run, 'immunite') && (s === 'faible' || s === 'expose' || s === 'fragile')) return; ajSt(c.j, s, n); }
  function tailleMain(run) { return Math.max(2, 4 + eff(run, 'mainPlus')); }
  function piocher(run, c, n) {
    for (let i = 0; i < n; i++) {
      if (c.main.length >= 8) return;
      if (!c.pioche.length) {
        if (!c.defausse.length) return;
        c.pioche = melanger(run, c.defausse); c.defausse = [];
        if (eff(run, 'remelange')) { ajSt(c.j, 'force', 1); gagnerGarde(run, c, 5, true); c.ev.push({ k: 'relique', nom: 'Sablier renversé' }); }
      }
      const x = c.pioche.pop();
      if (x.id === 'suie' && eff(run, 'antiSuie')) { c.exil.push(x); i--; if (!c.pioche.length && !c.defausse.length) return; continue; }
      c.main.push(x);
    }
  }
  function remplirMain(run, c) { const t = tailleMain(run); if (c.main.length < t) piocher(run, c, t - c.main.length); }

  function famStade(f) { const l = FAMILIERS[f.id]; return l ? l.stades[Math.min(f.stade || 0, l.stades.length - 1)] : null; }
  function agirFamiliers(run, c) {
    (run.familiers || []).forEach((f) => {
      const s = famStade(f); if (!s || c.fin) return;
      const v = vivants(c); if (!v.length) return;
      c.ev.push({ k: 'famAgit', id: f.id, nom: s.nom });
      if (s.k === 'brul') ajSt(choisir(run, v), 'brulure', s.n);
      else if (s.k === 'brulTous') v.forEach((e) => ajSt(e, 'brulure', s.n));
      else if (s.k === 'garde') gagnerGarde(run, c, s.n, true);
      else if (s.k === 'gel') ajSt(choisir(run, v), 'gel', s.n);
      else if (s.k === 'gel2') melanger(run, v.slice()).slice(0, 2).forEach((e) => ajSt(e, 'gel', s.n));
      else if (s.k === 'gelTous') v.forEach((e) => ajSt(e, 'gel', s.n));
      else if (s.k === 'mord' || s.k === 'mord2') { for (let i = 0; i < (s.k === 'mord2' ? 2 : 1); i++) { const w = vivants(c).sort((a, b) => a.pv - b.pv)[0]; if (w) frapper(run, c, w, s.n, 'familier'); } }
      else if (s.k === 'soin') soigner(run, c, s.n);
    });
  }

  function debutTour(run, c) {
    c.tour++; run.stats.tours++;
    const gg = eff(run, 'gardeGardee');
    c.j.garde = gg ? Math.min(gg, c.j.garde) : 0;
    c.joues = 0; c.surch = false; c.typePrec = null; c.sortTour = false; c.zp = 0; c.coquille = false;
    c.ennemis.forEach((e) => { e.mueTour = false; });
    let mana = 3 + eff(run, 'manaTour') + (c.reserve || 0); c.reserve = 0;
    if (c.tour === 1) mana += eff(run, 'premierTourMana');
    if (run.classe === 'grenat' && run.rang >= 2 && run.pv < run.pvMax / 2) mana += 1;
    c.j.mana = mana;
    if (c.j.st.poison) { perdrePV(run, c, c.j.st.poison, 'poison'); ajSt(c.j, 'poison', -1); if (c.fin) return; }
    effets(run).forEach((ef) => {
      if (ef[0] === 'debutTour') { if (ef[1] === 'garde') gagnerGarde(run, c, ef[2], true); else if (ef[1] === 'seve') gagnerSeve(run, c, ef[2]); else ajSt(c.j, ef[1], ef[2]); }
      if (ef[0] === 'debutTourEnnemiAlea') { const v = vivants(c); if (v.length) ajSt(choisir(run, v), ef[1], ef[2]); }
    });
    if (run.classe === 'solen' && run.rang >= 3) ajSt(c.j, 'chaleur', 1);
    const gpc = eff(run, 'gardeParChaleur'); if (gpc) { const g = 2 * Math.floor((c.j.st.chaleur || 0) / 3); if (g) gagnerGarde(run, c, g, true); }
    agirFamiliers(run, c);
    const dg = eff(run, 'dague'); if (dg) { const w = vivants(c).sort((a, b) => a.pv - b.pv)[0]; if (w) frapper(run, c, w, dg, 'relique'); }
    if (!vivants(c).length) { if (!c.fin) c.fin = 'victoire'; }
    c.main.forEach((x) => { delete x.gratuit; });
    if (!eff(run, 'garderMain')) { c.defausse.push(...c.main.filter((x) => !x.gen)); c.main = []; }
    remplirMain(run, c);
    if (c.tour === 1) { const pm = eff(run, 'premierTourMain'); if (pm) piocher(run, c, pm); }
    if (eff(run, 'carteGratuite')) { const cand = c.main.filter((x) => cout(x, c) > 0); if (cand.length) choisir(run, cand).gratuit = true; }
    vivants(c).forEach((e) => choisirIntent(run, c, e));
  }

  function gagnerGarde(run, c, n, brut) {
    if (n <= 0) return 0;
    let g = n + (c.j.st.robustesse || 0) + eff(run, 'gardePlus');
    if (!brut && c.j.st.fragile) g = Math.floor(g * 0.75);
    c.j.garde += g; c.ev.push({ k: 'garde', n: g });
    return g;
  }
  function gagnerSeve(run, c, n) { ajSt(c.j, 'seve', n); verifSauvage(run, c); }
  function verifSauvage(run, c) {
    if (run.classe !== 'lierre' || c.j.st.sauvage) return;
    const seuil = run.rang >= 3 ? 6 : 9;
    if ((c.j.st.seve || 0) >= seuil) { c.j.st.sauvage = 1; ajSt(c.j, 'force', 1); ajSt(c.j, 'epines', 2); c.ev.push({ k: 'sauvage' }); }
  }
  function gagnerAmes(run, c, n) {
    ajSt(c.j, 'ames', n);
    if (run.classe === 'ossian' && run.rang >= 3) for (let i = 0; i < n; i++) { const v = vivants(c); if (v.length) frapper(run, c, choisir(run, v), 2, null); }
  }
  function gagnerCadence(run, c, n) {
    ajSt(c.j, 'cadence', n);
    if (run.classe !== 'vesper') return;
    const seuil = run.rang >= 3 ? 2 : 3;
    while ((c.j.st.cadence || 0) >= seuil) { ajSt(c.j, 'cadence', -seuil); ajSt(c.j, 'echo', 1); c.ev.push({ k: 'echo' }); }
  }

  function degatsJoueur(run, c, base, cible, d) {
    let dmg = base + (c.j.st.force || 0);
    if (d && d.t === 'L') {
      dmg += eff(run, 'lamePlus') + lienVal(run, 'bete');
      if (run.classe === 'solen' && run.rang >= 2) dmg += Math.floor((c.j.st.chaleur || 0) / 2);
      if (run.classe === 'grenat') dmg += Math.min(5, c.j.st.rage || 0);
    }
    if (d && d.c === 2) dmg += eff(run, 'coutDeuxPlus');
    if (cible && cible.st.faible) dmg += eff(run, 'bonusFaible');
    if (c.j.st.faible) dmg = Math.floor(dmg * 0.75);
    if (cible && cible.st.expose) dmg = Math.floor(dmg * (eff(run, 'exposeFort') ? 2 : 1.5));
    const h = eff(run, 'horloge'); if (h && c.tour % h === 0) dmg *= 2;
    return Math.max(0, dmg);
  }
  function frapper(run, c, e, dmg, source) {
    if (!e || e.pv <= 0) return 0;
    if (e.st.esquive && dmg > 0) { ajSt(e, 'esquive', -1); c.ev.push({ k: 'esquiveE', u: e.u }); return 0; }
    let reste = dmg;
    if (e.garde > 0) { const a = Math.min(e.garde, reste); e.garde -= a; reste -= a; }
    e.pv -= reste;
    c.ev.push({ k: 'deg', u: e.u, n: reste, bloque: dmg - reste });
    if (!c.sim) { run.stats.degats += reste; progresQuete(run, 'deg', reste); }
    if (source === 'carte' && P(e, 'epines') && e.pv > 0) recevoir(run, c, P(e, 'epines'), null, true);
    const fx = eff(run, 'faux'); if (fx && e.rang === 'normal' && e.pv > 0 && e.pv <= fx) { e.pv = 0; c.ev.push({ k: 'faux', u: e.u }); }
    if (e.pv <= 0) mourir(run, c, e);
    else {
      const mu = P(e, 'mue'); if (mu && !e.mueTour) { e.mueTour = true; e.garde += mu; c.ev.push({ k: 'mue', u: e.u, n: mu }); }
      const en = P(e, 'enrage'); if (en && !e.enrage && e.pv < e.pvMax / 2) { e.enrage = true; ajSt(e, 'force', en); c.ev.push({ k: 'rage', u: e.u }); }
    }
    return reste;
  }
  function mourir(run, c, e) {
    const d = ENNEMIS[e.id];
    if (P(e, 'revenant') && !e.revenu) { e.revenu = true; e.pv = Math.round(e.pvMax / 2); e.st = {}; c.ev.push({ k: 'releve', u: e.u }); return; }
    e.pv = 0; e.garde = 0; e.intent = null;
    c.ev.push({ k: 'mort', u: e.u });
    c.xp += e.invoque ? 2 : d.boss ? 45 : d.elite ? 20 : 8;
    if (e.vol) { run.or += e.vol; c.ev.push({ k: 'or', n: e.vol }); e.vol = 0; }
    if (!c.sim) { run.stats.tues++; progresQuete(run, 'tue', 1); }
    if (d.boss) run.stats.boss++;
    if (run.classe === 'grenat' && run.rang >= 3) soigner(run, c, 5);
    if (run.classe === 'nacre') run.or += 8;
    const ok = eff(run, 'orKill'); if (ok) run.or += ok;
    const sk = eff(run, 'soinKill'); if (sk) soigner(run, c, sk);
    if (P(e, 'explose')) recevoir(run, c, P(e, 'explose'), null, true);
    const autres = vivants(c);
    autres.forEach((a) => { const g = P(a, 'galvanise'); if (g) { ajSt(a, 'force', g); c.ev.push({ k: 'rage', u: a.u }); } });
    if (eff(run, 'contagion') && autres.length) {
      const cible = choisir(run, autres);
      ['brulure', 'poison', 'gel'].forEach((s) => { if (e.st[s]) ajSt(cible, s, e.st[s]); });
    }
    const pd = eff(run, 'poudre'); if (pd) autres.forEach((a) => frapper(run, c, a, pd, 'relique'));
    const dv = P(e, 'diviser');
    if (dv && ENNEMIS[dv]) for (let i = 0; i < 2; i++) { if (vivants(c).length >= 5) break; const n = creerEnnemi(run, c, dv, true); n.pv = n.pvMax = Math.round(n.pvMax * 0.7); c.ennemis.push(n); choisirIntent(run, c, n); c.ev.push({ k: 'divise', u: n.u }); }
    if (!vivants(c).length && !c.fin) c.fin = 'victoire';
  }
  function recevoir(run, c, dmg, attaquant, brut) {
    if (c.fin === 'defaite') return 0;
    if (!brut) {
      if (c.j.st.esquive) { ajSt(c.j, 'esquive', -1); c.ev.push({ k: 'esquive' }); return 0; }
      if (c.j.st.expose) dmg = Math.floor(dmg * 1.5);
      if (c.j.st.brume) { ajSt(c.j, 'brume', -1); dmg = Math.floor(dmg / 2); }
      const cq = eff(run, 'coquille'); if (cq && !c.coquille && dmg > 0) { c.coquille = true; dmg = Math.max(0, dmg - cq); }
    }
    let reste = dmg;
    if (c.j.garde > 0) { const a = Math.min(c.j.garde, reste); c.j.garde -= a; reste -= a; if (!c.sim && a) progresQuete(run, 'garde', a); }
    c.ev.push({ k: 'touche', n: reste, bloque: dmg - reste });
    if (reste > 0) perdrePV(run, c, reste);
    if (attaquant && reste > 0 && P(attaquant, 'vampire') && attaquant.pv > 0) { const h = Math.floor(reste / 2); attaquant.pv = Math.min(attaquant.pvMax, attaquant.pv + h); if (h) c.ev.push({ k: 'vampire', u: attaquant.u, n: h }); }
    if (attaquant && c.j.st.epines && attaquant.pv > 0) frapper(run, c, attaquant, c.j.st.epines, 'epines');
    return reste;
  }
  function perdrePV(run, c, n, raison) {
    run.pv -= n;
    if (run.classe === 'grenat') ajSt(c.j, 'rage', 1);
    if (run.pv <= 0 && eff(run, 'phenix') && !run.phenixUtilise) { run.phenixUtilise = true; run.pv = Math.round(run.pvMax * 0.4); c.ev.push({ k: 'phenix' }); }
    if (run.pv <= 0) { run.pv = 0; c.fin = 'defaite'; return; }
    const mt = eff(run, 'manteau'); if (mt && !c.manteau && run.pv < run.pvMax / 2) { c.manteau = true; gagnerGarde(run, c, mt, true); ajSt(c.j, 'esquive', 1); c.ev.push({ k: 'relique', nom: 'Manteau de cendres' }); }
  }
  function soigner(run, c, n) { const avant = run.pv; run.pv = Math.min(run.pvMax, run.pv + n); if (c) c.ev.push({ k: 'soin', n: run.pv - avant }); return run.pv - avant; }
  function degatsEnnemi(run, c, e, base) {
    let d = Math.round(base * ([1.04, 1.14, 1.24][run.acte] || 1.24)) + (e.st.force || 0) + e.bonusDeg;
    if (e.st.faible) d = Math.floor(d * 0.75);
    if (e.st.gel) d -= Math.min(e.st.gel, Math.floor(d / 2));
    if (P(e, 'opportuniste') && c.j.garde <= 0) d = Math.floor(d * 1.5);
    return Math.max(0, d);
  }
  function intentAffiche(run, c, e) {
    const m = e.intent; if (!m) return null;
    const o = { t: m.t, n: m.n || 1 };
    if (m.t === 'atk' || m.t === 'atkdeb' || m.t === 'atkdef') {
      let d = degatsEnnemi(run, c, e, m.v);
      if (c.j.st.expose) d = Math.floor(d * 1.5);
      o.deg = d;
    }
    if (m.t === 'def' || m.t === 'atkdef') o.garde = m.g || m.v;
    if (m.t === 'buf') o.s = m.s, o.v = m.v;
    if (m.t === 'deb' || m.t === 'atkdeb') o.s = m.s, o.v = m.n2 || m.v;
    if (m.t === 'soin') o.v = m.v;
    if (m.t === 'inv') o.id = m.id;
    return o;
  }
  function degatsEntrants(run, c) {
    return vivants(c).reduce((s, e) => { const o = intentAffiche(run, c, e); return s + (o && o.deg ? o.deg * o.n : 0); }, 0);
  }

  function ctx(run, c, cible, d) {
    const statutPlus = (s, n) => (n > 0 && ['brulure', 'poison', 'gel', 'faible', 'expose'].includes(s) ? n + eff(run, 'statutPlus') : n);
    const deux = d && d.c === 2 ? eff(run, 'coutDeuxPlus') : 0;
    const x = {
      run, c, cible, carte: d,
      deg(n, e) { e = e || cible; if (!e || e.pv <= 0) { const v = vivants(c); e = v[0]; } if (!e) return; frapper(run, c, e, degatsJoueur(run, c, n, e, d), 'carte'); },
      degTous(n) { vivants(c).forEach((e) => frapper(run, c, e, degatsJoueur(run, c, n, e, d), 'carte')); },
      degAlea(n) { const v = vivants(c); if (v.length) { const e = choisir(run, v); frapper(run, c, e, degatsJoueur(run, c, n, e, d), 'carte'); } },
      garde(n) { gagnerGarde(run, c, n + deux); },
      statut(e, s, n) { if (e && e.pv > 0 && n) ajSt(e, s, statutPlus(s, n)); },
      statutTous(s, n) { vivants(c).forEach((e) => ajSt(e, s, statutPlus(s, n))); },
      soi(s, n) { if (s === 'esquive' || s === 'brume') { ajSt(c.j, s, n); if (s === 'brume' && n > 0) brumeGagnee(run, c); } else if (s === 'seve') gagnerSeve(run, c, n); else if (s === 'cadence') gagnerCadence(run, c, n); else ajSt(c.j, s, n); },
      pioche(n) { piocher(run, c, n); },
      mana(n) {
        if (c.surch) { ajSt(c.j, 'force', 1); c.ev.push({ k: 'surcharge' }); if (eff(run, 'surchargePlus')) { piocher(run, c, 1); gagnerGarde(run, c, 4, true); } }
        else { c.j.mana += n; c.surch = true; }
      },
      manaBrut(n) { c.j.mana += n; },
      soin(n) { soigner(run, c, n); },
      perdPV(n) { run.pv = Math.max(1, run.pv - n); if (run.classe === 'grenat') ajSt(c.j, 'rage', 1); c.ev.push({ k: 'touche', n, bloque: 0 }); },
      tribu(tr) { return tribuCompte(run, tr); },
      st(s) { return c.j.st[s] || 0; },
      eff(k) { return eff(run, k); },
      ennemisVivants() { return vivants(c); },
      briser(par) {
        const e = cible && cible.pv > 0 ? cible : vivants(c)[0]; if (!e) return;
        const g = e.st.gel || 0;
        frapper(run, c, e, degatsJoueur(run, c, (par + eff(run, 'briserPlus')) * Math.max(1, g), e, d), 'carte');
        if (g) { delete e.st.gel; if (run.classe === 'silex' && run.rang >= 2) gagnerGarde(run, c, 2 * g, true); }
      },
      decocher() { decocher(run, c); },
      rouages(n) { ajouterRouages(run, c, n); },
      seve(n) { gagnerSeve(run, c, n); },
      ame(n) { gagnerAmes(run, c, n); },
      cadence(n) { gagnerCadence(run, c, n); },
      precedent() { return c.typePrec; },
      jouesTour() { return c.joues; },
      orFin(n) { c.orFin += n; },
      gagnerOr(n) { run.or = Math.max(0, run.or + n); },
      annulerIntent(e) { if (e && e.pv > 0 && e.rang !== 'boss') { e.intent = { t: 'renonce' }; c.ev.push({ k: 'renonce', u: e.u }); } },
      consumees() { return c.consumees; },
      rejouer() {
        const dj = c.dernierJoue; if (!dj) return;
        const d2 = def(dj); const v = vivants(c);
        let cib = null; if (d2.cib === 'e') { cib = v.find((e) => e.u === dj.cu) || choisir(run, ciblesValides(c)); if (!cib) return; }
        d2.f(ctx(run, c, cib, d2), vals(dj));
      }
    };
    return x;
  }
  function brumeGagnee(run, c) { if (run.classe === 'fumee' && run.rang >= 2) vivants(c).forEach((e) => ajSt(e, 'faible', 1)); }
  function decocher(run, c) {
    const n = c.j.st.fleches || 0; if (!n) return;
    const par = (run.rang >= 2 ? 3 : 2) + eff(run, 'flechePlus');
    for (let i = 0; i < n; i++) { const v = vivants(c); if (!v.length) break; const e = choisir(run, v); frapper(run, c, e, par + (e.st.expose ? Math.floor(par / 2) : 0), 'fleche'); }
    c.ev.push({ k: 'fleches', n });
  }
  function ajouterRouages(run, c, n) {
    ajSt(c.j, 'rouages', n);
    while ((c.j.st.rouages || 0) >= 4) {
      ajSt(c.j, 'rouages', -4);
      if (c.main.length < 8) { c.main.push({ u: 'g' + (++c.uidC), id: 'rivet', niv: run.rang >= 2 ? 1 : 0, gen: true }); c.ev.push({ k: 'rivet' }); }
    }
  }

  function peutJouer(run, c, i) {
    const inst = c.main[i]; if (!inst || c.fin) return false;
    return cout(inst, c) <= c.j.mana && coutOr(run, inst) <= run.or;
  }
  function besoinCible(inst) { return def(inst).cib === 'e'; }

  function jouerCarte(run, c, i, cibleU) {
    if (!c || c.fin) return { ok: false, raison: 'fini' };
    const inst = c.main[i]; if (!inst) return { ok: false, raison: 'carte' };
    const d = def(inst);
    const k = cout(inst, c);
    if (k > c.j.mana) return { ok: false, raison: 'mana' };
    const ko = coutOr(run, inst);
    if (ko > run.or) return { ok: false, raison: 'or' };
    let cible = null;
    if (d.cib === 'e') {
      const v = ciblesValides(c);
      cible = v.find((e) => e.u === cibleU) || (v.length === 1 ? v[0] : null);
      if (!cible) return { ok: false, raison: vivants(c).some((e) => e.u === cibleU) ? 'provocation' : 'cible' };
    }
    c.ev = [];
    c.j.mana -= k;
    if (ko) { run.or -= ko; c.ev.push({ k: 'paie', n: ko }); }
    c.main.splice(i, 1);
    delete inst.gratuit;
    let fois = 1;
    if (c.joues === 0 && eff(run, 'premiereDouble')) fois++;
    if (c.j.st.echo) { ajSt(c.j, 'echo', -1); fois++; c.ev.push({ k: 'echoJoue' }); if (run.classe === 'vesper' && run.rang >= 2) gagnerGarde(run, c, 4, true); }
    c.joues++; c.jouesCombat++;
    if (!c.sim) run.stats.cartesJouees++;
    const v = vals(inst);
    for (let f = 0; f < fois; f++) {
      if (c.fin) break;
      const cib = cible && cible.pv > 0 ? cible : (d.cib === 'e' ? (ciblesValides(c)[0] || null) : null);
      if (d.cib === 'e' && !cib) break;
      d.f(ctx(run, c, cib, d), v);
    }
    // compétences de classe
    const cl = run.classe;
    if (cl === 'solen' && d.t === 'S') ajSt(c.j, 'chaleur', 1);
    if (cl === 'fumee' && c.joues === (run.rang >= 3 ? 2 : 3)) { ajSt(c.j, 'brume', 1); brumeGagnee(run, c); c.ev.push({ k: 'brume' }); }
    if (cl === 'silex' && d.t === 'L' && !d.sansGel) { if (d.cib === 'tous') vivants(c).forEach((e) => ajSt(e, 'gel', 1)); else if (cible && cible.pv > 0) ajSt(cible, 'gel', 1); }
    if (cl === 'ivra' && (d.t === 'L' || (run.rang >= 3 && d.t === 'S'))) ajSt(c.j, 'fleches', 1);
    if (cl === 'bram' && !inst.gen) ajouterRouages(run, c, run.rang >= 3 && d.tr === 'forge' ? 2 : 1);
    if (cl === 'lierre') { gagnerSeve(run, c, 1); if (run.rang >= 2 && d.t === 'S') ajSt(c.j, 'epines', 1); }
    if (cl === 'vesper' && c.typePrec && c.typePrec !== d.t) gagnerCadence(run, c, 1);
    if (d.t === 'S') {
      const sg = eff(run, 'sortGarde'); if (sg) gagnerGarde(run, c, sg, true);
      if (!c.sim) progresQuete(run, 'sort', 1);
      const sd = eff(run, 'sortDeg'); if (sd) { const vv = vivants(c); if (vv.length) frapper(run, c, choisir(run, vv), sd, 'relique'); }
      if (!c.sortTour && eff(run, 'premierSortPioche')) piocher(run, c, 1);
      c.sortTour = true;
    }
    if (d.t === 'L') { const lg = eff(run, 'lameGarde'); if (lg) gagnerGarde(run, c, lg, true); }
    if (c.j.st.ardeur && d.id !== 'coeurardent') vivants(c).forEach((e) => frapper(run, c, e, c.j.st.ardeur, 'ardeur'));
    if (c.joues === 4 && eff(run, 'rouet')) { c.j.mana += 1; c.ev.push({ k: 'relique', nom: 'Rouet' }); }
    const tb = eff(run, 'tambour'); if (tb && c.jouesCombat % tb === 0) { ajSt(c.j, 'force', 1); c.ev.push({ k: 'relique', nom: 'Tambour de guerre' }); }
    if (k === 0 && eff(run, 'zeroPioche') && (c.zp || 0) < 3) { c.zp = (c.zp || 0) + 1; piocher(run, c, 1); }
    const exil = d.exil || (d.exilSi && d.exilSi(v)) || inst.gen;
    if (exil) {
      if (!inst.gen) c.exil.push(inst);
      c.consumees++;
      if (cl === 'ossian') gagnerAmes(run, c, 1);
      if (eff(run, 'consumePlus') && !c.fin) { piocher(run, c, 1); gagnerGarde(run, c, 3, true); }
    } else c.defausse.push(inst);
    c.dernier = inst.id;
    if (d.id !== 'miroir') c.dernierJoue = { id: inst.id, niv: inst.niv, cu: cible ? cible.u : null };
    c.typePrec = d.t;
    if (!vivants(c).length && !c.fin) c.fin = 'victoire';
    if (!c.fin) remplirMain(run, c);
    if (c.fin === 'victoire' && !c.sim) finCombat(run);
    else if (c.fin === 'defaite' && !c.sim) defaite(run);
    return { ok: true, ev: c.ev };
  }

  function finTour(run, c) {
    if (!c || c.fin) return;
    c.ev = [];
    if (run.classe === 'ivra') { decocher(run, c); delete c.j.st.fleches; }
    if (eff(run, 'gardeRiposte') && c.j.garde >= 2) { const v = vivants(c); if (v.length) frapper(run, c, choisir(run, v), Math.floor(c.j.garde / 2), 'relique'); }
    if (c.fin === 'victoire') { if (!c.sim) finCombat(run); return; }
    const rm = eff(run, 'reserveMana'); if (rm) c.reserve = Math.min(rm, c.j.mana);
    if (c.j.st.brulure) { perdrePV(run, c, c.j.st.brulure); ajSt(c.j, 'brulure', -1); }
    ['faible', 'expose', 'fragile'].forEach((s) => { if (c.j.st[s]) ajSt(c.j, s, -1); });
    if (!eff(run, 'garderMain')) { c.defausse.push(...c.main.filter((x) => !x.gen)); c.main = []; }
    c.main.forEach((x) => { delete x.gratuit; });
    if (c.fin) { if (!c.sim) defaite(run); return; }
    c.coquille = false;
    // tour des ennemis
    for (const e of c.ennemis.slice()) {
      if (e.pv <= 0) continue;
      e.garde = 0; e.tours++;
      if (e.st.poison) { frapper(run, c, e, e.st.poison, 'poison'); ajSt(e, 'poison', -1); if (e.pv <= 0) continue; }
      if (P(e, 'carapace')) e.garde += P(e, 'carapace');
      const pr = P(e, 'protecteur'); if (pr) vivants(c).forEach((a) => { if (a !== e) a.garde += pr; });
      agir(run, c, e);
      if (c.fin === 'defaite') break;
      if (e.pv > 0 && e.st.brulure) { frapper(run, c, e, e.st.brulure, 'brulure'); ajSt(e, 'brulure', -1); }
      if (e.pv > 0 && P(e, 'regen')) e.pv = Math.min(e.pvMax, e.pv + P(e, 'regen'));
      if (e.pv > 0 && P(e, 'colere')) ajSt(e, 'force', P(e, 'colere'));
      ['faible', 'expose'].forEach((s) => { if (e.st[s]) ajSt(e, s, -1); });
      if (c.fin) break;
    }
    if (!vivants(c).length && !c.fin) c.fin = 'victoire';
    if (c.fin === 'defaite') { if (!c.sim) defaite(run); return; }
    if (c.fin === 'victoire') { if (!c.sim) finCombat(run); return; }
    debutTour(run, c);
    if (c.fin === 'defaite' && !c.sim) defaite(run);
    else if (c.fin === 'victoire' && !c.sim) finCombat(run);
  }

  function agir(run, c, e) {
    const m = e.intent; if (!m) return;
    c.ev.push({ k: 'agit', u: e.u, t: m.t });
    if (m.t === 'renonce') { e.intent = null; return; }
    if (m.t === 'fuite') { e.pv = 0; e.intent = null; e.fui = true; c.ev.push({ k: 'fuite', u: e.u, n: e.vol }); e.vol = 0; return; }
    const coups = (v, n) => { for (let i = 0; i < (n || 1); i++) { if (e.pv <= 0 || c.fin) break; recevoir(run, c, degatsEnnemi(run, c, e, v), e); } };
    const apresCoup = () => {
      const vo = P(e, 'voleur'); if (vo && run.or > 0) { const n = Math.min(vo, run.or); run.or -= n; e.vol += n; c.ev.push({ k: 'vol', u: e.u, n }); }
      if (P(e, 'fragilise')) stJoueur(run, c, 'fragile', 1);
    };
    const debuff = (s, n) => {
      if (s === 'suie') { for (let i = 0; i < n; i++) c.defausse.push({ u: 's' + (++c.uidC), id: 'suie', niv: 0, gen: false, temp: true }); c.ev.push({ k: 'suie', n }); }
      else stJoueur(run, c, s, n);
    };
    switch (m.t) {
      case 'atk': coups(m.v, m.n); apresCoup(); break;
      case 'def': e.garde += m.v; break;
      case 'buf': ajSt(e, m.s, m.v); break;
      case 'deb': debuff(m.s, m.v); break;
      case 'atkdeb': coups(m.v, m.n); apresCoup(); debuff(m.s, m.n2); break;
      case 'atkdef': coups(m.v, m.n); apresCoup(); e.garde += m.g; break;
      case 'soin': { const v = vivants(c).sort((a, b) => a.pv / a.pvMax - b.pv / b.pvMax)[0]; if (v) v.pv = Math.min(v.pvMax, v.pv + m.v); break; }
      case 'inv': if (vivants(c).length < 4) { const n = creerEnnemi(run, c, m.id, true); c.ennemis.push(n); choisirIntent(run, c, n); n.intent = { t: 'def', v: 3 }; } break;
    }
    e.intent = null;
  }

  // ---------- quêtes ----------
  function progresQuete(run, k, n) {
    run.deck.forEach((x) => {
      const d = def(x);
      if (!d.q || d.q.k !== k || (x.niv || 0) >= niveauMax(d)) return;
      x.q = (x.q || 0) + n * (eff(run, 'queteX2') ? 2 : 1);
      const seuil = d.q.s[x.niv || 0];
      if (x.q >= seuil) { x.niv = (x.niv || 0) + 1; run.journal.push({ k: 'quete', id: x.id, niv: x.niv }); if (run.combat) run.combat.ev.push({ k: 'quete', id: x.id, niv: x.niv }); }
    });
  }

  // ---------- récompenses ----------
  function poolCartes(run) {
    const legend = new Set(run.deck.filter((x) => def(x).r === 'L').map((x) => x.id));
    return Object.values(CARTES).filter((d) => !d.depart && d.r !== 'M' && d.r !== 'G' && (d.cl === null || d.cl === run.classe) && !legend.has(d.id));
  }
  function tauxTirage(run, source) {
    const t = Object.assign({}, TAUX[source] || TAUX.combat);
    if (source !== 'boss') { const p = Math.min(12, run.pity || 0); t.R += p; t.C = Math.max(0, t.C - p); }
    if (eff(run, 'oeil')) { t.R *= 1.6; t.E *= 1.8; t.L *= 2.2; }
    return t;
  }
  function tirerRarete(run, t) {
    const tot = Object.values(t).reduce((a, b) => a + b, 0);
    let x = alea(run) * tot;
    for (const r of ['L', 'E', 'R', 'P', 'C']) { x -= t[r] || 0; if (x < 0) return r; }
    return 'C';
  }
  function tirerCartes(run, n, source) {
    const pool = poolCartes(run);
    const t = tauxTirage(run, source);
    const out = [];
    let essais = 0;
    while (out.length < n && essais++ < 300) {
      let r = tirerRarete(run, t);
      if (r === 'R' && !pool.some((d) => d.r === 'R' && !out.includes(d.id))) r = 'E';
      let cands = pool.filter((d) => d.r === r && !out.includes(d.id));
      const cls = cands.filter((d) => d.cl);
      if (cls.length && alea(run) < 0.45) cands = cls;
      if (!cands.length) continue;
      out.push(choisir(run, cands).id);
    }
    if (source !== 'boss') { if (out.some((id) => 'REL'.includes(CARTES[id].r))) run.pity = 0; else run.pity = (run.pity || 0) + 1; }
    return out;
  }
  function tirerReliques(run, n, src) {
    const libres = Object.keys(RELIQUES).filter((t) => RELIQUES[t].src === src && !(run.reliques || []).includes(t));
    melanger(run, libres);
    return libres.slice(0, n);
  }
  function gagnerRelique(run, id) {
    if (!id || !RELIQUES[id] || run.reliques.includes(id)) return false;
    run.reliques.push(id);
    RELIQUES[id].eff.forEach((e) => { if (e[0] === 'pvMax') { run.pvMax += e[1]; run.pv += e[1]; } });
    return true;
  }
  function equipeMax(run) { return 2 + (eff(run, 'familierPlus') ? 1 : 0); }
  function offreFamilier(run) {
    const tenus = (run.familiers || []).map((f) => f.id);
    const libres = Object.keys(FAMILIERS).filter((k) => !tenus.includes(k));
    return libres.length ? choisir(run, libres) : null;
  }
  function accueillirFamilier(run, id, remplace) {
    if (!FAMILIERS[id] || run.familiers.some((f) => f.id === id)) return false;
    if (run.familiers.length >= equipeMax(run)) { if (remplace == null || !run.familiers[remplace]) return false; run.familiers.splice(remplace, 1); }
    run.familiers.push({ id, stade: 0, combats: 0 });
    return true;
  }
  function evoluerFamiliers(run) {
    const evs = [];
    (run.familiers || []).forEach((f) => {
      f.combats = (f.combats || 0) + (eff(run, 'familierPlus') ? 2 : 1);
      const seuils = [3, 7];
      while ((f.stade || 0) < 2 && f.combats >= seuils[f.stade || 0]) { f.stade = (f.stade || 0) + 1; evs.push({ id: f.id, nom: famStade(f).nom }); }
    });
    return evs;
  }
  function tirerTalismans(run, n) {
    const libres = Object.keys(TALISMANS).filter((t) => !run.talismans.includes(t));
    melanger(run, libres);
    return libres.slice(0, n);
  }
  function gagnerTalisman(run, id) {
    if (!id || run.talismans.includes(id)) return;
    run.talismans.push(id);
    const t = TALISMANS[id];
    t.eff.forEach((e) => { if (e[0] === 'pvMax') { run.pvMax += e[1]; run.pv += e[1]; } });
  }

  function finCombat(run) {
    const c = run.combat; if (!c || run.recompense) return;
    const type = c.type;
    const orBase = type === 'boss' ? entre(run, 70, 90) : type === 'elite' ? entre(run, 26, 36) : entre(run, 11, 18);
    const or = Math.round(orBase * (1 + eff(run, 'orBonus') / 100));
    const eclats = type === 'boss' ? 3 : type === 'elite' ? entre(run, 1, 2) : (alea(run) < 0.25 ? 1 : 0);
    run.or += or; run.eclats += eclats;
    run.or += (c.orFin || 0) + eff(run, 'orFinCombat') + (run.classe === 'nacre' ? 10 : 0);
    if (type === 'elite' && eff(run, 'bonusElite')) { run.or += 20; run.eclats += 1; }
    let soin = eff(run, 'finCombatSoin') + lienVal(run, 'luciole');
    if (eff(run, 'soinRage')) soin += (c.j.st.rage || 0) * eff(run, 'soinRage');
    if (soin) soigner(run, null, soin);
    const xp = c.xp;
    run.xp += xp;
    const niveauAvant = run.niveau;
    while (run.niveau < SEUILS_XP.length && run.xp >= SEUILS_XP[run.niveau]) {
      run.niveau++; run.pvMax += 4; run.pv = Math.min(run.pvMax, run.pv + 4); run.niveauxEnAttente++;
    }
    run.recompense = {
      type, or, eclats, xp, soin, niveaux: run.niveau - niveauAvant,
      cartes: tirerCartes(run, 3 + eff(run, 'choixCartes'), type), cartePrise: false,
      reliquesChoix: type === 'boss' ? tirerReliques(run, 3, 'B') : type === 'elite' ? tirerReliques(run, 2, 'E') : null, reliquePrise: false,
      evos: evoluerFamiliers(run), familier: null, familierPris: false
    };
    const chanceF = type === 'elite' ? 0.4 : type === 'combat' ? 0.12 : 0;
    if (chanceF && alea(run) < chanceF) run.recompense.familier = offreFamilier(run);
    run.combat = null;
    run.ecran = 'recompense';
  }
  function defaite(run) { run.ecran = 'fin'; run.gagne = false; run.fini = true; }

  function prendreCarte(run, id) {
    const r = run.recompense || run.tresor || run.evenement;
    if (!r || r.cartePrise || !r.cartes || !r.cartes.includes(id)) return false;
    run.deck.push(nouvelleInst(run, id, CARTES[id].r === 'C' && eff(run, 'communeAffutee') ? 1 : 0)); r.cartePrise = true; return true;
  }
  function choisirRelique(run, id) {
    const r = run.recompense; if (!r || !r.reliquesChoix || r.reliquePrise || !r.reliquesChoix.includes(id)) return false;
    gagnerRelique(run, id); r.reliquePrise = true; return true;
  }
  function prendreFamilier(run, remplace) {
    const r = run.recompense || run.evenement; if (!r || !r.familier || r.familierPris) return false;
    if (!accueillirFamilier(run, r.familier, remplace)) return false;
    r.familierPris = true; return true;
  }
  function passerCarte(run) { const r = run.recompense; if (!r || r.cartePrise) return false; r.cartePrise = true; r.passee = true; run.or += 8; return true; }
  function quitterRecompense(run) {
    const r = run.recompense; if (!r) return;
    const boss = r.type === 'boss';
    run.recompense = null;
    if (run.niveauxEnAttente > 0) { preparerTalents(run); run.apresNiveau = boss ? 'boss' : 'carte'; run.ecran = 'niveau'; return; }
    apresCombat(run, boss);
  }
  function apresCombat(run, boss) {
    if (boss) {
      if (run.acte >= ACTES.length - 1) { run.ecran = 'fin'; run.gagne = true; run.fini = true; return; }
      if (run.brasier >= 3) run.pv = Math.min(run.pvMax, run.pv + Math.round((run.pvMax - run.pv) / 2));
      else run.pv = run.pvMax;
      commencerActe(run, run.acte + 1);
    } else run.ecran = 'carte';
  }
  function preparerTalents(run) {
    const cl = CLASSES[run.classe];
    const pool = TALENTS.concat(cl.talents).filter((t) => !run.talents.includes(t.id) || t.id === 't-pv');
    melanger(run, pool);
    const classe = pool.filter((t) => cl.talents.includes(t));
    const choix = [];
    if (classe.length) choix.push(classe[0]);
    pool.forEach((t) => { if (choix.length < 3 && !choix.includes(t)) choix.push(t); });
    run.talentChoix = choix.map((t) => t.id);
  }
  function choisirTalent(run, id) {
    if (!run.talentChoix || !run.talentChoix.includes(id)) return false;
    run.talents.push(id);
    const t = talentDef(id);
    t.eff.forEach((e) => { if (e[0] === 'pvMax') { run.pvMax += e[1]; run.pv += e[1]; } if (e[0] === 'orImmediat') run.or += e[1]; });
    run.niveauxEnAttente--;
    run.talentChoix = null;
    if (run.niveauxEnAttente > 0) { preparerTalents(run); return true; }
    apresCombat(run, run.apresNiveau === 'boss');
    run.apresNiveau = null;
    return true;
  }

  // ---------- trésor, brasero, marchand, événements ----------
  function ouvrirTresor(run) {
    const t = run.tresor; if (!t || t.ouvert) return;
    t.ouvert = true; run.or += t.or; run.eclats += t.eclats;
  }
  function quitterEcran(run) { run.tresor = null; run.marchand = null; run.evenement = null; run.brasero = null; run.selection = null; run.ecran = 'carte'; }
  function soinBrasero(run) { return Math.round(run.pvMax * ((run.brasier >= 8 ? 20 : 30) + eff(run, 'soinRepos')) / 100); }
  function braseroFait(run, k) { const b = run.brasero; b.faits = (b.faits || []).concat(k); if (b.faits.length >= 1 + (eff(run, 'braseroDouble') ? 1 : 0)) b.fait = k; }
  function braseroSoigner(run) { if (!run.brasero || run.brasero.fait) return false; run.pv = Math.min(run.pvMax, run.pv + soinBrasero(run)); braseroFait(run, 'soin'); return true; }
  function braseroMediter(run) {
    if (!run.brasero || run.brasero.fait) return false;
    braseroFait(run, 'mediter'); gagnerXp(run, 20); return true;
  }
  function gagnerXp(run, n) {
    run.xp += n;
    while (run.niveau < SEUILS_XP.length && run.xp >= SEUILS_XP[run.niveau]) { run.niveau++; run.pvMax += 4; run.pv = Math.min(run.pvMax, run.pv + 4); run.niveauxEnAttente++; }
  }
  function affutable(inst) { const d = def(inst); return (inst.niv || 0) < niveauMax(d) && d.r !== 'M'; }
  function demanderSelection(run, mode, retour) { run.selection = { mode, retour }; run.ecranAvant = run.ecran; run.ecran = 'selection'; }
  function annulerSelection(run) {
    const s = run.selection; if (!s) return;
    if (s.retour === 'marchand' && run.marchand && run.marchand.services[s.mode]) { run.or += prixService(run, s.mode); run.marchand.services[s.mode] = false; }
    run.ecran = run.ecranAvant || 'carte'; run.selection = null;
  }
  function appliquerSelection(run, u) {
    const s = run.selection; if (!s) return false;
    const i = run.deck.findIndex((x) => x.u === u); if (i < 0) return false;
    const inst = run.deck[i];
    if (s.mode === 'affuter') { if (!affutable(inst)) return false; inst.niv = (inst.niv || 0) + 1; }
    else if (s.mode === 'retirer') run.deck.splice(i, 1);
    else if (s.mode === 'transformer') { const pool = poolCartes(run).filter((d) => d.id !== inst.id && 'CP'.includes(d.r)); run.deck[i] = nouvelleInst(run, choisir(run, pool).id); }
    else if (s.mode === 'dupliquer') run.deck.push(Object.assign(nouvelleInst(run, inst.id, inst.niv), { q: inst.q }));
    run.journal.push({ k: s.mode, id: inst.id });
    run.dernierSelection = { mode: s.mode, id: inst.id, nouveau: s.mode === 'transformer' ? run.deck[i].id : null };
    run.ecran = run.ecranAvant || 'carte'; run.selection = null;
    if (s.retour === 'brasero' && run.brasero) braseroFait(run, 'affuter');
    return true;
  }

  function prixMult(run) { return run.brasier >= 6 ? 1.2 : 1; }
  function genererMarchand(run) {
    const pool = poolCartes(run);
    const pris = [];
    const tire = (r, cl) => { const c = pool.filter((d) => d.r === r && !pris.includes(d.id) && (cl == null || (cl ? d.cl : !d.cl))); if (!c.length) return null; const d = choisir(run, c); pris.push(d.id); return d.id; };
    const ids = [tire('C', true), tire('C', false), tire('P', true), tire('P', false), tire(alea(run) < 0.3 ? 'E' : 'R', null), tire(alea(run) < 0.06 ? 'L' : 'C', false)].filter(Boolean);
    const prixR = { C: 45, P: 70, R: 115, E: 165, L: 250 };
    const m = run.marchand0 = null;
    return {
      cartes: ids.map((id) => ({ id, prix: Math.round((prixR[CARTES[id].r] + entre(run, -6, 8)) * prixMult(run)), vendu: false })),
      talismans: tirerTalismans(run, 3).map((id) => ({ id, prix: TALISMANS[id].prix, vendu: false })),
      services: { soin: false, retirer: false, transformer: false, dupliquer: false, pvmax: false, rang: false, relance: false }
    };
  }
  function prixService(run, k) {
    const base = { soin: 35, retirer: 60, transformer: 40, dupliquer: 70, pvmax: 45, rang: run.rang === 1 ? 110 : 200, relance: 1 }[k];
    return k === 'relance' ? base : Math.round(base * prixMult(run));
  }
  function acheterCarte(run, i) {
    const m = run.marchand; const o = m && m.cartes[i]; if (!o || o.vendu || run.or < o.prix) return false;
    run.or -= o.prix; o.vendu = true; run.deck.push(nouvelleInst(run, o.id, CARTES[o.id].r === 'C' && eff(run, 'communeAffutee') ? 1 : 0)); return true;
  }
  function acheterTalisman(run, i) {
    const m = run.marchand; const o = m && m.talismans[i]; if (!o || o.vendu || run.eclats < o.prix) return false;
    run.eclats -= o.prix; o.vendu = true; gagnerTalisman(run, o.id); return true;
  }
  function acheterService(run, k) {
    const m = run.marchand; if (!m || m.services[k]) return false;
    const p = prixService(run, k);
    if (k === 'relance') { if (run.eclats < p) return false; run.eclats -= p; const nv = genererMarchand(run); m.cartes = nv.cartes; m.services.relance = true; return true; }
    if (k === 'rang' && run.rang >= 3) return false;
    if (run.or < p) return false;
    run.or -= p; m.services[k] = true;
    if (k === 'soin') run.pv = Math.min(run.pvMax, run.pv + Math.round(run.pvMax * 0.3));
    else if (k === 'pvmax') { run.pvMax += 4; run.pv += 4; }
    else if (k === 'rang') run.rang++;
    else demanderSelection(run, k, 'marchand');
    return true;
  }

  function evenementDef(run) { return run.evenement && EVENEMENTS.find((e) => e.id === run.evenement.id); }
  function choixPossible(run, ch) { return !ch.cond || (ch.cond[0] === 'or' ? run.or >= ch.cond[1] : true); }
  function choisirEvenement(run, k) {
    const ev = evenementDef(run); if (!ev || run.evenement.fait != null) return false;
    const ch = ev.choix[k]; if (!ch || !choixPossible(run, ch)) return false;
    run.evenement.fait = k; run.evenement.resultat = [];
    const res = run.evenement.resultat;
    ch.eff.forEach((e) => {
      const [t, n] = e;
      if (t === 'pv') { if (n < 0) run.pv = Math.max(1, run.pv + n); else run.pv = Math.min(run.pvMax, run.pv + n); res.push((n > 0 ? '+' : '') + n + ' PV'); }
      else if (t === 'pvMax') { run.pvMax += n; run.pv += n; res.push('+' + n + ' PV max'); }
      else if (t === 'or') { run.or += n; res.push((n > 0 ? '+' : '') + n + ' or'); }
      else if (t === 'eclats') { run.eclats += n; res.push('+' + n + ' éclat' + (n > 1 ? 's' : '')); }
      else if (t === 'xp') { gagnerXp(run, n); res.push('+' + n + ' XP'); }
      else if (t === 'ajoute') { run.deck.push(nouvelleInst(run, n)); res.push(CARTES[n].nom + ' rejoint ton paquet'); }
      else if (t === 'talisman') { const id = tirerTalismans(run, 1)[0]; if (id) { gagnerTalisman(run, id); res.push('Talisman : ' + TALISMANS[id].nom); } }
      else if (t === 'carteRare') { run.evenement.cartes = tirerCartes(run, 3, 'boss'); run.evenement.cartePrise = false; }
      else if (t === 'affuteAlea') { const a = run.deck.filter(affutable); if (a.length) { const x = choisir(run, a); x.niv = (x.niv || 0) + 1; res.push(CARTES[x.id].nom + ' est affûtée'); } }
      else if (t === 'affute') demanderSelection(run, 'affuter', 'evenement');
      else if (t === 'retire') demanderSelection(run, 'retirer', 'evenement');
      else if (t === 'elite') { run.flags.eliteSuivante = true; res.push('Le prochain combat sera une élite'); }
      else if (t === 'familier') { const id = offreFamilier(run); if (id && run.familiers.length < equipeMax(run)) { accueillirFamilier(run, id); res.push(FAMILIERS[id].stades[0].nom + ' rejoint ton équipe'); } else { gagnerXp(run, 20); res.push('Ton équipe est complète : +20 XP'); } }
      else if (t === 'pari') { run.or -= 30; if (alea(run) < 0.5) { run.or += 80; res.push('Gagné : +50 or net'); } else res.push('Perdu : −30 or'); }
    });
    return true;
  }

  // ---------- IA (simulation et mentor) ----------
  function cloner(run, c) {
    const r2 = Object.assign({}, run, { stats: Object.assign({}, run.stats), journal: [], deck: run.deck });
    const c2 = JSON.parse(JSON.stringify(c)); c2.sim = true;
    return [r2, c2];
  }
  const POIDS_ST = { echo: 7, cadence: 1.8, ardeur: 9, chaleur: 1.6, fleches: 2.2, seve: 0.7, rage: 1.2, ames: 2.2, brume: 3, esquive: 6, epines: 1.6, robustesse: 3, force: 4, rouages: 1 };
  function score(run, c, entrants) {
    if (c.fin === 'victoire') return 1e5 + run.pv * 10;
    if (c.fin === 'defaite') return -1e5;
    let s = run.pv * 3;
    vivants(c).forEach((e) => {
      s -= e.pv + e.garde * 0.4;
      s -= (e.st.esquive || 0) * 7 + (e.st.force || 0) * 2.5 + (e.st.epines || 0) * 0.8;
      s += (e.st.brulure || 0) * 0.9 + (e.st.poison || 0) * 0.9 + (e.st.gel || 0) * (run.classe === 'silex' ? 2.2 : 1.2) + (e.st.faible || 0) * 1.8 + (e.st.expose || 0) * 2;
    });
    s += 14 * c.ennemis.filter((e) => e.pv <= 0).length;
    const inc = degatsEntrants(run, c);
    s += Math.min(c.j.garde, inc) * 2.4 + Math.max(0, c.j.garde - inc) * 0.15;
    Object.entries(c.j.st).forEach(([k, v]) => { if (POIDS_ST[k]) s += v * POIDS_ST[k]; });
    s -= (c.j.st.faible || 0) * 2 + (c.j.st.expose || 0) * 2;
    s += c.main.length * 0.6 + c.j.mana * 0.2 + run.or * 0.09;
    vivants(c).forEach((e) => { if (e.intent && e.intent.t === 'renonce') s += 2; s -= (e.vol || 0) * 0.05; });
    return s;
  }
  function meilleurCoup(run, c) {
    const base = score(run, c);
    let best = null;
    c.main.forEach((inst, i) => {
      if (!peutJouer(run, c, i)) return;
      const cibles = besoinCible(inst) ? ciblesValides(c).map((e) => e.u) : [null];
      cibles.forEach((u) => {
        const [r2, c2] = cloner(run, c);
        const res = jouerCarte(r2, c2, i, u);
        if (!res.ok) return;
        let s = score(r2, c2) - base;
        if (def(inst).id === 'suie') s += 0.2;
        if (!best || s > best.s) best = { i, u, s };
      });
    });
    if (!best || best.s <= 0.3) return null;
    return best;
  }
  function conseil(run) { const c = run.combat; if (!c || c.fin) return null; return meilleurCoup(run, c); }

  const RANG_IA = ['echoforge', 'horloge', 'carapace', 'phenix', 'grimoirenoir', 'ancre', 'chaudron', 'oeil', 'pacte', 'lanterneetroite',
    'gardelame', 'pierreetincelle', 'dague', 'herisson', 'braseropoche', 'etincelle', 'coquille', 'poudre', 'manteau', 'calice', 'sablierinverse', 'rouet',
    'dynamo', 'tambour', 'cloche', 'spore', 'faux', 'lunette', 'gantelet', 'encrier', 'urnevide', 'banniere', 'flute', 'mechelente', 'lanterneveille',
    'trefle', 'aimant', 'carnet', 'sifflet', 'pageblanche', 'oeufbraise'];
  function iaCarte(run) {
    const choix = choixCarte(run).map((id) => run.carte.noeuds[id]);
    const ratio = run.pv / run.pvMax;
    let best = null;
    choix.forEach((n) => {
      let s = { combat: 3, elite: ratio > 0.7 ? 4.5 : ratio > 0.5 ? 1 : -3, brasero: ratio < 0.5 ? 7 : ratio < 0.75 ? 3 : 0.5, marchand: run.or >= 100 ? 5 : 0.5, tresor: 5, evenement: 2.6, boss: 10 }[n.type] || 0;
      s += alea(run) * 1.5;
      if (!best || s > best.s) best = { id: n.id, s };
    });
    return best && best.id;
  }
  function valeurCarte(run, id) {
    const d = CARTES[id];
    let s = { C: 1, P: 2, R: 3.2, E: 3.9, L: 4.6 }[d.r] || 0;
    if (d.or && run.classe === 'nacre') s += 0.6;
    if (d.cl === run.classe) s += 1.4;
    if (d.tr) s += 0.45 * tribuCompte(run, d.tr);
    if (d.q) s += 0.6;
    const doublons = run.deck.filter((x) => x.id === id).length; s -= doublons * 0.8;
    return s;
  }
  function iaRecompense(run, cartes) {
    let best = null; cartes.forEach((id) => { const s = valeurCarte(run, id); if (!best || s > best.s) best = { id, s }; });
    if (!best) return null;
    if (run.deck.length >= 22 && best.s < 2.6) return null;
    return best.id;
  }
  function iaSelection(run) {
    const s = run.selection;
    let cands = run.deck.slice();
    if (s.mode === 'affuter') { cands = cands.filter(affutable); cands.sort((a, b) => valeurCarte(run, b.id) - valeurCarte(run, a.id)); }
    else if (s.mode === 'retirer' || s.mode === 'transformer') { const ordre = ['suie', 'frappe', 'parade']; cands.sort((a, b) => (ordre.indexOf(b.id) + 1 || 0) - (ordre.indexOf(a.id) + 1 || 0)); }
    else cands.sort((a, b) => valeurCarte(run, b.id) - valeurCarte(run, a.id));
    if (!cands.length) { annulerSelection(run); return; }
    appliquerSelection(run, cands[0].u);
  }
  function iaEcran(run) {
    switch (run.ecran) {
      case 'carte': { const id = iaCarte(run); if (!id || !entrerNoeud(run, id)) return false; return true; }
      case 'combat': {
        const c = run.combat; let garde = 0;
        while (!c.fin && garde++ < 30) { const m = meilleurCoup(run, c); if (!m) break; jouerCarte(run, c, m.i, m.u); }
        if (run.combat === c && !c.fin) finTour(run, c);
        if (run.combat === c && c.tour > 60) { run.pv = 0; defaite(run); }
        return true;
      }
      case 'recompense': {
        const r = run.recompense;
        const id = iaRecompense(run, r.cartes); if (id) prendreCarte(run, id);
        if (r.reliquesChoix && r.reliquesChoix.length) { const rk = r.reliquesChoix.slice().sort((a, b) => RANG_IA.indexOf(a) - RANG_IA.indexOf(b)); choisirRelique(run, rk[0]); }
        if (r.familier && run.familiers.length < equipeMax(run)) prendreFamilier(run);
        quitterRecompense(run); return true;
      }
      case 'niveau': { const ch = run.talentChoix; choisirTalent(run, ch[ent(run, ch.length)]); return true; }
      case 'tresor': { ouvrirTresor(run); const id = iaRecompense(run, run.tresor.cartes); if (id) prendreCarte(run, id); quitterEcran(run); return true; }
      case 'brasero': {
        if (run.pv / run.pvMax < 0.55) braseroSoigner(run);
        else if (run.deck.some(affutable)) { demanderSelection(run, 'affuter', 'brasero'); iaSelection(run); }
        else braseroSoigner(run);
        quitterEcran(run); return true;
      }
      case 'marchand': {
        const m = run.marchand;
        if (run.rang < 3 && run.or >= prixService(run, 'rang') + 20) acheterService(run, 'rang');
        m.talismans.forEach((t, i) => { if (run.eclats >= t.prix) acheterTalisman(run, i); });
        if (run.deck.some((x) => x.id === 'suie' || x.id === 'frappe') && run.or >= prixService(run, 'retirer')) { acheterService(run, 'retirer'); if (run.ecran === 'selection') iaSelection(run); }
        if (run.pv / run.pvMax < 0.5 && run.or >= prixService(run, 'soin')) acheterService(run, 'soin');
        const triees = m.cartes.map((o, i) => ({ o, i, s: valeurCarte(run, o.id) })).sort((a, b) => b.s - a.s);
        triees.forEach(({ o, i, s }) => { if (s >= 2.4 && run.or >= o.prix) acheterCarte(run, i); });
        quitterEcran(run); return true;
      }
      case 'evenement': {
        const ev = evenementDef(run);
        if (run.evenement.fait == null) {
          let k = ev.choix.findIndex((ch) => choixPossible(run, ch) && !(run.pv < run.pvMax * 0.5 && ch.eff.some((e) => e[0] === 'pv' && e[1] < 0)) && !ch.eff.some((e) => e[0] === 'elite' && run.pv < run.pvMax * 0.7));
          if (k < 0) k = ev.choix.length - 1;
          choisirEvenement(run, k);
          if (run.ecran === 'selection') iaSelection(run);
          if (run.evenement && run.evenement.cartes && !run.evenement.cartePrise) { const id = iaRecompense(run, run.evenement.cartes); if (id) prendreCarte(run, id); }
        }
        quitterEcran(run); return true;
      }
      case 'selection': iaSelection(run); return true;
      default: return false;
    }
  }
  function jouerCourse(classe, opts) {
    const run = nouvelleCourse(classe, opts);
    let garde = 0;
    while (!run.fini && garde++ < 5000) { if (!iaEcran(run)) break; }
    return { gagne: run.gagne, mort: run.fini && !run.gagne, acte: run.acte + 1, etage: run.etageTotal, niveau: run.niveau, tours: run.stats.tours, pv: run.pv, deckFinal: run.deck.map((x) => x.id), talismans: run.talismans.slice(), reliques: run.reliques.slice(), familiers: run.familiers.map((f) => f.id + ':' + f.stade), talents: run.talents.slice(), bloque: !run.fini, renom: renomGagne(run) };
  }

  // ---------- méta (renom) ----------
  function renomGagne(run) {
    return run.etageTotal * 4 + run.stats.tues * 2 + run.stats.elites * 10 + run.stats.boss * 30 + (run.gagne ? 100 + run.brasier * 15 : 0);
  }
  function niveauRenom(renom) { let n = 1; RENOM_NIVEAUX.forEach((s, i) => { if (renom >= s) n = i + 1; }); return n; }
  function classesDebloquees(meta) {
    if (meta.toutDebloque) return Object.keys(CLASSES);
    const n = niveauRenom(meta.renom || 0);
    return Object.keys(CLASSES).filter((k) => CLASSES[k].renom <= n);
  }
  function heritagesDebloques(meta, classe) {
    if (meta.toutDebloque) return [0, 1, 2];
    const p = (meta.parClasse || {})[classe] || {};
    const out = [0];
    if ((p.meilleurActe || 0) >= 2) out.push(1);
    if (p.victoires) out.push(2);
    return out;
  }
  function brasierMax(meta, classe) {
    if (meta.toutDebloque) return 10;
    const p = (meta.parClasse || {})[classe] || {};
    return Math.min(10, p.brasierMax || 0);
  }
  function enregistrerFin(meta, run) {
    meta.renom = (meta.renom || 0) + renomGagne(run);
    meta.courses = (meta.courses || 0) + 1;
    meta.parClasse = meta.parClasse || {};
    const p = meta.parClasse[run.classe] = meta.parClasse[run.classe] || { courses: 0, victoires: 0, meilleurActe: 0, brasierMax: 0 };
    p.courses++;
    p.meilleurActe = Math.max(p.meilleurActe, run.acte + 1);
    if (run.gagne) { p.victoires++; meta.victoires = (meta.victoires || 0) + 1; if (run.brasier >= p.brasierMax) p.brasierMax = Math.min(10, run.brasier + 1); }
    return meta;
  }

  const M = {
    D, alea, SEUILS_XP, RENOM_NIVEAUX, BRASIER,
    nouvelleCourse, choixCarte, entrerNoeud, jouerCarte, finTour, peutJouer, besoinCible, vivants, intentAffiche, degatsEntrants,
    prendreCarte, choisirRelique, prendreFamilier, passerCarte, accueillirFamilier, famStade, equipeMax, coutOr, ciblesValides, tauxTirage, P, gagnerRelique, quitterRecompense, choisirTalent, ouvrirTresor, quitterEcran,
    braseroSoigner, braseroMediter, soinBrasero, demanderSelection, annulerSelection, appliquerSelection, affutable,
    acheterCarte, acheterTalisman, acheterService, prixService, evenementDef, choixPossible, choisirEvenement,
    def, vals, texte, nomCarte, cout, liens, tribuCompte, talentDef, effets, eff, tailleMain,
    conseil, jouerCourse, iaEcran, renomGagne, niveauRenom, classesDebloquees, heritagesDebloques, brasierMax, enregistrerFin
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else racine.BraisesMoteur = M;
})(typeof window !== 'undefined' ? window : globalThis);
