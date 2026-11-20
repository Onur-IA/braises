/* Braises V7 : moteur de règles (navigateur et Node).
   Main de 4 cartes qui se remplit à chaque carte jouée, 3 mana par tour, classes à compétence évolutive,
   tribus et liens, cartes à quête qui évoluent, niveaux et talents pendant la course, renom entre les courses.
   Jeu original : aucun nom, texte ni visuel repris d'un autre jeu. */
(function (racine) {
  const D = (typeof module !== 'undefined' && module.exports) ? require('./donnees.js') : racine.BraisesDonnees;
  const { CARTES, CLASSES, TALISMANS, ENNEMIS, MONDES, ACTES, TALENTS, EVENEMENTS, TRIBUS, RELIQUES, FAMILIERS, TAUX, RARETES } = D;

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

  const SEUILS_XP = [0, 25, 60, 105, 160, 225, 300, 390, 490, 600, 720, 850];
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
    'Ennemis : +3 dégâts par coup au total et plus de PV à chaque acte. Boss : +30 % PV, puis 1 Force par tour dès le tour 5. Soins réduits de 30 %, or gagné réduit d\'un quart, la Brume ne retient plus que 30 % du coup.'
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
  function cout(inst, c) { const d = def(inst); if(c && c.classe==='ysar' && c.rang>=2 && d.t==='S' && !c.sortGratuit && (c.j.st.arcane||0)>=8) return 0; if (inst.gratuit) return 0; return d.coutV ? d.coutV(vals(inst)) : d.c; }
  function coutOr(run, inst) { const d = def(inst); if (!d.or) return 0; return Math.round(d.or * (run.classe === 'nacre' && run.rang >= 3 ? 0.6 : 1)); }
  function nouvelleInst(run, id, niv) { return { u: ++run.uidN, id, niv: niv || 0, q: 0 }; }
  function tribuCompte(run, tr) {
    let n = run.deck.filter((x) => def(x).tr === tr).length;
    (run.familiers || []).forEach((f) => { if (FAMILIERS[f.id] && FAMILIERS[f.id].tribu === tr) n += f.stade || 0; });
    return n + (eff(run, 'tribuPlus') || 0) + ((run.benis || {})[tr] || 0);
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
      v: 9, classe, heritage: opts.heritage != null ? opts.heritage : 0, brasier: opts.brasier || 0,
      serments: (opts.serments || []).filter((x) => D.SERMENTS[x]), rencontres: [],
      rs: (opts.graine != null ? opts.graine : Math.floor(Math.random() * 2 ** 31)) | 0,
      pvMax: cl.pv, pv: cl.pv, or: 90 + (cl.orDepart || 0), eclats: 1, deck: [], talismans: [], reliques: [], familiers: [], pity: 0, talents: [], rang: 1, niveau: 1, xp: 0,
      niveauxEnAttente: 0, acte: 0, monde: null, bossId: null, carte: null, pos: null, etage: 0, etageTotal: 0,
      ecran: 'carte', combat: null, recompense: null, marchand: null, evenement: null, tresor: null, selection: null, talentChoix: null,
      stats: { tues: 0, degats: 0, tours: 0, elites: 0, boss: 0, cartesJouees: 0 }, uidN: 0, flags: {}, vus: [], journal: [], gagne: false, fini: false
    };
    if (cl.familierDepart) accueillirFamilier(run, cl.familierDepart);
    if (eff(run, 'familierDepart2')) accueillirFamilier(run, 'chaton');
    if (run.serments.includes('orgueil')) { run.pvMax -= 10; run.pv -= 10; }
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
    run.bossId = choisir(run, a.boss); run.rencontres = []; run.elitesVues = [];
    run.carte = genererCarte(run);
    run.pos = null; run.etage = 0; run.ecran = 'carte'; run.chemin = [];
  }

  // ---------- carte ----------
  function genererCarte(run) {
    // 16 lieux avant le boss. Trois voies lisibles et des carrefours :
    // la voie de gauche préserve les PV, la droite vise les élites et les reliques.
    const R = 16, noeuds = {}, cle = (r, c) => r + '-' + c;
    const plan = [
      ['combat','combat','combat'], ['evenement','combat','combat'],
      ['combat','combat','evenement'], ['brasero','combat','elite'],
      ['combat','marchand','combat'], ['evenement','combat','combat'],
      ['evenement','elite','elite'], ['brasero','marchand','combat'],
      ['tresor','tresor','tresor'], ['combat','evenement','combat'],
      ['combat','combat','combat'], ['elite','elite','elite'],
      ['marchand','evenement','brasero'], ['combat','combat','combat'],
      ['evenement','combat','combat'], ['brasero','brasero','brasero']
    ];
    // Deux élites communes et une troisième facultative au premier tiers.
    // Le contenu des étapes souples change sans rendre le risque illisible.
    [2,5,9,13,14].forEach((r) => {
      const c = ent(run,3); if (plan[r][c] === 'combat' && alea(run)<0.45) plan[r][c] = 'evenement';
    });
    for(let r=0;r<R;r++) for(let c=0;c<3;c++) {
      const liens = [];
      if(r===R-1) liens.push('boss');
      else {
        liens.push(cle(r+1,c));
        // Carrefours avant les moments importants : retour à une voie sûre possible.
        if ([0,2,4,5,7,9,10,12,14].includes(r)) {
          if(c>0) liens.push(cle(r+1,c-1));
          if(c<2) liens.push(cle(r+1,c+1));
        }
      }
      noeuds[cle(r,c)]={id:cle(r,c),r,c:c+0.5,type:plan[r][c],liens,
        voie:['Sécurité','Équilibre','Audace'][c], enflamme:plan[r][c]==='elite' && c===2 && r===11};
    }
    noeuds.boss={id:'boss',r:R,c:1.5,type:'boss',liens:[]};
    return {noeuds,rangs:R};
  }

  function choixCarte(run) {
    if (!run.carte) return [];
    if (run.pos == null) return Object.values(run.carte.noeuds).filter((n) => n.r === 0).map((n) => n.id).sort();
    const n = run.carte.noeuds[run.pos];
    return n ? n.liens.slice() : [];
  }

  function rencontre(run, pool, elite) {
    const vus = elite ? (run.elitesVues || []) : (run.rencontres || []);
    const libres=pool.filter((p)=>!vus.includes(p.join('/')));
    const p=choisir(run,libres.length?libres:pool);
    if(elite) run.elitesVues=vus.concat(p.join('/')); else run.rencontres=vus.slice(-3).concat(p.join('/'));
    return p;
  }
  function entrerNoeud(run, id) {
    if (!choixCarte(run).includes(id)) return false;
    run.pos = id; run.etage++; run.etageTotal++; run.chemin = (run.chemin || []).concat(id);
    const n = run.carte.noeuds[id];
    const m = MONDES[run.monde];
    run.flags.enflamme = !!n.enflamme;
    if (n.type === 'combat') {
      const pool = (run.acte === 0 && n.r <= 1 && m.faciles) ? m.faciles : m.normaux;
      if (run.flags.eliteSuivante) { run.flags.eliteSuivante = false; commencerCombat(run, rencontre(run, m.elites, true), 'elite'); }
      else commencerCombat(run, rencontre(run, pool, false), 'combat');
    } else if (n.type === 'elite') commencerCombat(run, rencontre(run, m.elites, true), 'elite');
    else if (n.type === 'boss') commencerCombat(run, [run.bossId], 'boss');
    else if (n.type === 'tresor') {
      run.tresor = { or: Math.round(entre(run, 30, 50) * (1 + eff(run, 'orBonus') / 100)), eclats: 1, cartes: tirerCartes(run, 3 + eff(run, 'choixCartes'), 'tresor'), pris: false, ouvert: false };
      run.ecran = 'tresor';
    } else if (n.type === 'marchand') { run.marchand = genererMarchand(run); run.ecran = 'marchand'; }
    else if (n.type === 'evenement') {
      const acte = run.acte + 1;
      const ok = EVENEMENTS.filter((e) => (!e.actes || e.actes.includes(acte)) && evenementPossible(run, e));
      const libres = ok.filter((e) => !run.vus.includes(e.id));
      const ev = choisir(run, libres.length ? libres : ok);
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
    if (run.brasier >= 10) mult *= (d.boss ? 1.3 : 1.22) * (1 + 0.08 * run.acte);
    if (run.serments.includes('meute') && !d.boss && !d.elite) mult *= 1.15;
    if (d.elite && (run.flags.enflamme || run.serments.includes('cendre'))) mult *= 1.25;
    pv = Math.round(pv * mult);
    const e = { u: ++c.uidE, id, nom: d.nom, sprite: d.sprite, pv, pvMax: pv, garde: 0, st: {}, mi: d.alea ? ent(run, d.m.length) : 0, intent: null, dernier: [], invoque: !!invoque,
      rang: d.boss ? 'boss' : d.elite ? 'elite' : 'normal', bonusDeg: (run.brasier >= 4 ? 1 : 0) + (run.brasier >= 10 ? 2 : 0) + (run.serments.includes('meute') && !d.boss && !d.elite ? 1 : 0), vol: 0, tours: 0 };
    if (d.elite && run.brasier >= 2) e.st.force = 1;
    if (d.elite && (run.flags.enflamme || run.serments.includes('cendre'))) e.st.force = (e.st.force || 0) + 1;
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
    if (P(e, 'phase') && e.pv < e.pvMax / 2 && !e.phase) { e.phase = true; e.mi = 0; e.garde += P(e, 'phase'); }
    if (e.phase && d.m2) { m = d.m2[e.mi % d.m2.length]; e.mi++; }
    if (m.t === 'inv' && vivants(c).length >= 4) m = { t: 'atk', v: 6 };
    e.intent = Object.assign({}, m);
    if (P(e, 'voleur') && e.rang === 'normal' && e.tours >= 3) e.intent = { t: 'fuite' };
  }
  function vivants(c) { return c.ennemis.filter((e) => e.pv > 0); }
  function ciblesValides(c) { const v = vivants(c); const t = v.filter((e) => P(e, 'provocation')); return t.length ? t : v; }

  const RESS_CLASSE = { solen: 'chaleur', fumee: 'brume', ivra: 'fleches', bram: 'rouages', lierre: 'seve', grenat: 'rage', ossian: 'ames', vesper: 'cadence', corvine:'marque', basalte:'contre', ysar:'arcane', aubade:'harmonie' };
  function commencerCombat(run, ids, type) {
    const c = { type, ennemis: [], main: [], pioche: [], defausse: [], exil: [], j: { garde: 0, mana: 0, st: {} }, tour: 0, joues: 0, jouesCombat: 0, surch: false, fin: null, ev: [], uidE: 0, uidC: 0, xp: 0, dernier: null,
      reserve: 0, orFin: 0, consumees: 0, typePrec: null, dernierJoue: null, manteau: false };
    c.classe=run.classe; c.rang=run.rang;
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
      else if (run.classe === 'corvine') c.ennemis.forEach((e) => ajSt(e, 'marque', rc));
      else if (RESS_CLASSE[run.classe]) ajSt(c.j, RESS_CLASSE[run.classe], rc);
    }
    if (run.classe === 'silex' && run.rang >= 3) c.ennemis.forEach((e) => ajSt(e, 'gel', 2));
    if (run.classe === 'ossian' && run.rang >= 2) gagnerAmes(run, c, 2);
    if (run.classe === 'nacre') { const fo = Math.min(2, Math.floor(run.or / 120)); if (fo) ajSt(c.j, 'force', fo); } if (run.classe === 'nacre') { const g = run.rang >= 2 ? Math.min(15, Math.floor(run.or / 12)) : Math.min(8, Math.floor(run.or / 25)); if (g) gagnerGarde(run, c, g, true); }
    if (run.classe === 'lierre') verifSauvage(run, c);
    (run.familiers || []).forEach((f) => { const s = famStade(f); if (s && s.esquive) ajSt(c.j, 'esquive', s.esquive); });
    if (eff(run,'marqueDepart')) { const e = plusRobuste(c); if(e) ajSt(e,'marque',eff(run,'marqueDepart')); }
    if(eff(run,'famDebut')) agirFamiliers(run,c);
    if (type === 'elite') run.stats.elites++;
    debutTour(run, c);
  }

  function gagnerContre(run,c,n) {
    if(n>0) { const old=c.j.st.contre||0; ajSt(c.j,'contre',Math.min(n,Math.max(0,6-old))); if(run.classe==='basalte' && run.rang>=3) gagnerGarde(run,c,2,true); }
  }
  function gagnerHarmonie(run,c,n) {
    ajSt(c.j,'harmonie',n);
    if(run.classe!=='aubade') return;
    const seuil=3-eff(run,'harmonieSeuil');
    while((c.j.st.harmonie||0)>=seuil) { ajSt(c.j,'harmonie',-seuil); agirFamiliers(run,c); if(c.fin) break; }
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

  function famStade(f, stade, voie) {
    const l = FAMILIERS[f.id]; if (!l) return null;
    const st = Math.min(stade != null ? stade : (f.stade || 0), l.stades.length - 1);
    if (!st) return l.stades[0];
    return l.stades[st][voie || (f.voie || [])[st - 1] || 'A'];
  }
  function plusRobuste(c) { return vivants(c).sort((a, b) => b.pv - a.pv)[0]; }
  function agirFamiliers(run, c) {
    (run.familiers || []).forEach((f) => {
      const s = famStade(f); if (!s || c.fin) return;
      const v = vivants(c); if (!v.length) return;
      c.ev.push({ k: 'famAgit', id: f.id, nom: s.nom });
      if (run.classe === 'aubade' && run.rang >= 3) gagnerGarde(run,c,2,true);
      if (run.classe === 'aubade') { const w = vivants(c).sort((a, b) => a.pv - b.pv)[0]; if (w) frapper(run, c, w, run.rang, 'familier'); }
      if (s.k === 'brul') ajSt(choisir(run, v), 'brulure', s.n);
      else if (s.k === 'brulTous') v.forEach((e) => ajSt(e, 'brulure', s.n));
      else if (s.k === 'garde') gagnerGarde(run, c, s.n, true);
      else if (s.k === 'gel') ajSt(choisir(run, v), 'gel', s.n);
      else if (s.k === 'gel2') melanger(run, v.slice()).slice(0, 2).forEach((e) => ajSt(e, 'gel', s.n));
      else if (s.k === 'gelTous') v.forEach((e) => ajSt(e, 'gel', s.n));
      else if (s.k === 'mord' || s.k === 'mord2') { for (let i = 0; i < (s.k === 'mord2' ? 2 : 1); i++) { const w = vivants(c).sort((a, b) => a.pv - b.pv)[0]; if (w) frapper(run, c, w, s.n, 'familier'); } }
      else if (s.k === 'soin') soigner(run, c, s.n);
      else if (s.k === 'mana2' || s.k === 'mana2p') { if (c.tour % 2 === 0) { c.j.mana += s.n; if (s.k === 'mana2p') c.famPioche = (c.famPioche || 0) + 1; } }
      else if (s.k === 'gardeEpines') { gagnerGarde(run, c, s.n, true); ajSt(c.j, 'epines', s.e); }
      else if (s.k === 'faible') { const e = plusRobuste(c); if (e) ajSt(e, 'faible', s.n); }
      else if (s.k === 'faibleTous') v.forEach((e) => ajSt(e, 'faible', s.n));
      else if (s.k === 'expose') { const e = plusRobuste(c); if (e) ajSt(e, 'expose', s.n); }
      else if (s.k === 'exposeMord') { v.forEach((e) => ajSt(e, 'expose', 1)); const w = vivants(c).sort((a, b) => a.pv - b.pv)[0]; if (w) frapper(run, c, w, s.n, 'familier'); }
      else if (s.k === 'pioche2') { if (c.tour % 2 === 0) c.famPioche = (c.famPioche || 0) + s.n; }
      else if (s.k === 'piocheSoin') { c.famPioche = (c.famPioche || 0) + s.n; soigner(run, c, 1); }
    });
  }

  function debutTour(run, c) {
    c.tour++; run.stats.tours++;
    const gg = eff(run, 'gardeGardee');
    c.j.garde = c.j.st.montagne ? c.j.garde : run.classe==='basalte' && run.rang>=2 ? Math.floor(c.j.garde/2) : gg ? Math.min(gg, c.j.garde) : 0;
    c.sortAvant = c.sortTour;
    c.joues = 0; c.surch = false; c.typePrec = null; c.sortTour = false; c.sortGratuit = false; c.zp = 0; c.coquille = false;
    c.ennemis.forEach((e) => { e.mueTour = false; e.perteTour=0; if (P(e,'ombre')) e.st.esquive=P(e,'ombre'); });
    let mana = 3 + eff(run, 'manaTour') + (c.reserve || 0); c.reserve = 0;
    if (c.tour === 1) mana += eff(run, 'premierTourMana');
    if (run.classe === 'grenat' && run.rang >= 2 && run.pv < run.pvMax / 2) mana += 1;
    mana += c.j.st.manaPlus || 0;
    c.j.mana = Math.max(0,mana - (c.j.st.torpeur||0)); delete c.j.st.torpeur;
    if(run.classe==='ysar') ajSt(c.j,'arcane',run.rang>=3?3:1);
    if (c.j.st.poison) { perdrePV(run, c, c.j.st.poison, 'poison'); ajSt(c.j, 'poison', -1); if (c.fin) return; }
    effets(run).forEach((ef) => {
      if (ef[0] === 'debutTour') { if (ef[1] === 'garde') gagnerGarde(run, c, ef[2], true); else if (ef[1] === 'seve') gagnerSeve(run, c, ef[2]); else ajSt(c.j, ef[1], ef[2]); }
      if (ef[0] === 'debutTourEnnemiAlea') { const v = vivants(c); if (v.length) ajSt(choisir(run, v), ef[1], ef[2]); }
    });
    if (run.classe === 'solen' && run.rang >= 3 && c.sortAvant) ajSt(c.j, 'chaleur', 1);
    const gpc = eff(run, 'gardeParChaleur'); if (gpc) { const g = 2 * Math.floor((c.j.st.chaleur || 0) / 3); if (g) gagnerGarde(run, c, g, true); }
    agirFamiliers(run, c); if(c.j.st.opera && !c.fin) agirFamiliers(run,c);
    const dg = eff(run, 'dague'); if (dg) { const w = vivants(c).sort((a, b) => a.pv - b.pv)[0]; if (w) frapper(run, c, w, dg, 'relique'); }
    if (!vivants(c).length) { if (!c.fin) c.fin = 'victoire'; }
    c.main.forEach((x) => { delete x.gratuit; });
    if (!eff(run, 'garderMain')) { c.defausse.push(...c.main.filter((x) => !x.gen)); c.main = []; }
    remplirMain(run, c);
    if (c.famPioche) { piocher(run, c, c.famPioche); c.famPioche = 0; }
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
      if (run.classe === 'solen' && run.rang >= 2) dmg += Math.floor((c.j.st.chaleur || 0) / 4);
      if (run.classe === 'grenat') dmg += c.j.st.sansLimite ? (c.j.st.rage||0) : Math.min(5, c.j.st.rage || 0);
      if (run.classe === 'basalte') dmg += (3+eff(run,'contrePlus'))*(c.j.st.contre||0);
      if(d.id==='rivet' && c.j.st.grandeforge) dmg *= 2;
    }
    if(cible && cible.st.marque) { if(c.j.st.nuitrouge) dmg+=cible.st.marque; if(d && d.t==='L') dmg+=(eff(run,'marqueDeg')||0)*cible.st.marque; }
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
    dmg=Math.max(0,dmg-(P(e,'blinde')||0));
    const seuil=P(e,'seuil'); if(seuil) dmg=Math.min(dmg,Math.max(0,seuil-(e.perteTour||0)));
    let reste = dmg;
    if (e.garde > 0) { const a = Math.min(e.garde, reste); e.garde -= a; reste -= a; }
    e.pv -= reste; e.perteTour=(e.perteTour||0)+reste;
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
    if (run.classe === 'nacre') run.or += run.brasier >= 10 ? 4 : 6;
    if(run.classe==='corvine') { c.j.mana++; piocher(run,c,1); if(run.rang>=3 && e.st.marque) { const a=plusRobuste(c); if(a) ajSt(a,'marque',e.st.marque); } }
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
      if (c.j.st.brume) { ajSt(c.j, 'brume', -1); dmg = Math.floor(dmg * (run.brasier >= 10 ? 0.7 : 0.5)); if(c.j.st.brouillard && attaquant && attaquant.pv>0) { ajSt(attaquant,'faible',1); ajSt(attaquant,'expose',1); } }
      const cq = eff(run, 'coquille'); if (cq && !c.coquille && dmg > 0) { c.coquille = true; dmg = Math.max(0, dmg - cq); }
    }
    let reste = dmg;
    if (c.j.garde > 0) { const a = Math.min(c.j.garde, reste); c.j.garde -= a; reste -= a; if (!c.sim && a) progresQuete(run, 'garde', a); }
    c.ev.push({ k: 'touche', n: reste, bloque: dmg - reste });
    if (reste > 0) perdrePV(run, c, reste);
    if(!brut && attaquant && dmg>0 && reste===0 && run.classe==='basalte') gagnerContre(run,c,1);
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
  function soigner(run, c, n) { const avant = run.pv; n=run.brasier>=10 ? Math.floor(n*0.7) : n; run.pv = Math.min(run.pvMax, run.pv + n); if (c) c.ev.push({ k: 'soin', n: run.pv - avant }); return run.pv - avant; }
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
      soi(s, n) { if (s === 'esquive' || s === 'brume') { ajSt(c.j, s, n); if (s === 'brume' && n > 0) brumeGagnee(run, c); } else if (s === 'seve') gagnerSeve(run, c, n); else if (s === 'cadence') gagnerCadence(run, c, n); else if(s==='harmonie') gagnerHarmonie(run,c,n); else if(s==='contre') gagnerContre(run,c,n); else ajSt(c.j, s, n); },
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
      marquesDe(e) {return e && e.st.marque || 0;},
      marquer(e,n) {if(e && e.pv>0) ajSt(e,'marque',n);},
      retirerMarques(e) {if(e) delete e.st.marque;},
      contre(n) {gagnerContre(run,c,n);},
      arcane(n) {ajSt(c.j,'arcane',n);},
      depenserArcane() {const n=c.j.st.arcane||0; delete c.j.st.arcane; return n;},
      harmonie(n) {gagnerHarmonie(run,c,n);},
      famAgir(n) {for(let i=0;i<n && !c.fin;i++) agirFamiliers(run,c);},
      nbFamiliers() {return run.familiers.length;},
      consumerMain() {const n=c.main.length; c.exil.push(...c.main.filter((m)=>!m.gen)); c.main=[]; c.consumees+=n; return n;},
      echangerMain(n) {const k=c.main.length; c.defausse.push(...c.main.filter((m)=>!m.gen)); c.main=[]; piocher(run,c,k+n);},
      reprendre(n) {for(let i=0;i<n && c.defausse.length && c.main.length<8;i++) c.main.push(c.defausse.pop());},
      purgerSuies() {const v=c.main.filter((m)=>m.id==='suie'); c.main=c.main.filter((m)=>m.id!=='suie'); c.exil.push(...v); c.consumees+=v.length; return v.length;},
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
    while ((c.j.st.rouages || 0) >= 5) {
      ajSt(c.j, 'rouages', -5);
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
    if(d.t==='S') c.sortGratuit=true;
    c.main.splice(i, 1);
    delete inst.gratuit;
    let fois = 1;
    if (c.joues === 0 && eff(run, 'premiereDouble')) fois++;
    if (c.j.st.echo) { ajSt(c.j, 'echo', -1); fois++; c.ev.push({ k: 'echoJoue' }); if (run.classe === 'vesper' && run.rang >= 2) gagnerGarde(run, c, 4, true); }
    c.joues++; c.jouesCombat++;
    if (!c.sim) { run.stats.cartesJouees++; if (run.tele) run.tele.joue[d.id] = (run.tele.joue[d.id] || 0) + 1; }
    const v = vals(inst);
    for (let f = 0; f < fois; f++) {
      if (c.fin) break;
      const cib = cible && cible.pv > 0 ? cible : (d.cib === 'e' ? (ciblesValides(c)[0] || null) : null);
      if (d.cib === 'e' && !cib) break;
      d.f(ctx(run, c, cib, d), v);
    }
    // compétences de classe
    const cl = run.classe;
    if(cl==='basalte' && d.t==='L') delete c.j.st.contre;
    if(cl==='corvine' && d.t==='L') { if(d.cib==='tous') vivants(c).forEach((e)=>ajSt(e,'marque',1)); else if(cible && cible.pv>0) ajSt(cible,'marque',1); }
    if(cl==='aubade' && d.t==='S') gagnerHarmonie(run,c,1);
    if(c.j.st.arbremonde) ajSt(c.j,'epines',1);
    if (cl === 'solen' && d.t === 'S') ajSt(c.j, 'chaleur', 1);
    if (cl === 'fumee' && c.joues === (run.rang >= 3 ? 2 : 3)) { ajSt(c.j, 'brume', 1); brumeGagnee(run, c); c.ev.push({ k: 'brume' }); }
    if (cl === 'silex' && d.t === 'L' && !d.sansGel) { if (d.cib === 'tous') vivants(c).forEach((e) => ajSt(e, 'gel', 1)); else if (cible && cible.pv > 0) ajSt(cible, 'gel', 1); }
    if (cl === 'ivra' && (d.t === 'L' || (run.rang >= 3 && d.t === 'S'))) ajSt(c.j, 'fleches', 1);
    if (cl === 'bram' && !inst.gen) ajouterRouages(run, c, run.rang >= 3 && d.tr === 'forge' ? 2 : 1);
    if (cl === 'lierre') { gagnerSeve(run, c, 1); if (run.rang >= 2 && d.t === 'S') ajSt(c.j, 'epines', 1); }
    if (cl === 'vesper' && c.typePrec && c.typePrec !== d.t) gagnerCadence(run, c, c.j.st.tempo ? 2 : 1);
    if (d.t === 'S') {
      if(c.j.st.soleil) { const e=plusRobuste(c); if(e) frapper(run,c,e,Math.min(8,c.j.st.chaleur||0),'soleil'); }
      vivants(c).forEach((e)=>{if(P(e,'hainesort')) ajSt(e,'force',P(e,'hainesort'));});
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
    if (run.classe === 'ivra') { decocher(run, c); if(!c.j.st.carquoisSans) delete c.j.st.fleches; }
    if (eff(run, 'gardeRiposte') && c.j.garde >= 2) { const v = vivants(c); if (v.length) frapper(run, c, choisir(run, v), Math.floor(c.j.garde / 2), 'relique'); }
    if (c.fin === 'victoire') { if (!c.sim) finCombat(run); return; }
    if(run.classe==='ysar') ajSt(c.j,'arcane',c.j.mana*(c.j.st.singularite ? 3 : 2));
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
      if(e.pv>0 && e.rang==='boss' && run.brasier>=10 && c.tour>=5) ajSt(e,'force',1);
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
      if(P(e,'torpeur')) stJoueur(run,c,'torpeur',1);
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
    if(source!=='boss') { const p=Math.min(10,run.pity||0), delta=Math.min(t.C, p*4); t.C-=delta; t.R+=delta*0.65; t.E+=delta*0.25; t.L+=delta*0.10; }
    if (eff(run, 'oeil')) { t.R *= 1.6; t.E *= 1.8; t.L *= 2.2; }
    const total=Object.values(t).reduce((a,b)=>a+b,0); Object.keys(t).forEach((k)=>t[k]=100*t[k]/total);
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
    return out;
  }
  function tirerLegendaires(run,n) {
    const disponibles=poolCartes(run).filter((d)=>d.r==='L');
    melanger(run,disponibles);
    const classe=disponibles.find((d)=>d.cl===run.classe), neutres=disponibles.filter((d)=>!d.cl);
    const offre=classe ? [classe.id] : [];
    neutres.forEach((d)=>{if(offre.length<n) offre.push(d.id);});
    // Il reste toujours au moins 3 légendaires neutres après les 3 boss.
    return melanger(run,offre);
  }
  function fortuneChoix(run,id) {
    if(id && 'REL'.includes(CARTES[id].r)) run.pity=0;
    else run.pity=Math.min(10,(run.pity||0)+(!id?2:CARTES[id].r==='C'?1:0));
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
  function equipeMax(run) { return 2 + (run.classe==='aubade' && run.rang>=2?1:0) + (eff(run, 'familierPlus') ? 1 : 0); }
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
      f.combats = (f.combats || 0) + (eff(run, 'familierPlus') || (run.classe==='aubade' && run.rang>=2) ? 2 : 1);
      const seuils = [3, 7];
      if (!f.evo && (f.stade || 0) < 2 && f.combats >= seuils[f.stade || 0]) { f.evo = (f.stade || 0) + 1; evs.push({ id: f.id, stade: f.evo, choix: true }); }
    });
    return evs;
  }
  // Évolution embranchée : le joueur choisit la voie A ou B (f.evo = stade visé, en attente).
  function evolutionsEnAttente(run) { return (run.familiers || []).filter((f) => f.evo); }
  function choisirEvolution(run, id, voie) {
    const f = (run.familiers || []).find((x) => x.id === id); if (!f || !f.evo || !['A', 'B'].includes(voie)) return false;
    f.voie = (f.voie || []).slice(0, f.evo - 1); f.voie[f.evo - 1] = voie; f.stade = f.evo; f.evo = null;
    run.journal.push({ k: 'evolution', id, voie, stade: f.stade });
    return true;
  }
  function forcerEvolution(run, id) {
    const f = (run.familiers || []).find((x) => x.id === id); if (!f || f.evo || (f.stade || 0) >= 2) return false;
    f.combats = Math.max(f.combats || 0, [3, 7][f.stade || 0]); f.evo = (f.stade || 0) + 1; return true;
  }
  function iaVoie(run, f) {
    const cl = run.classe, deux = run.deck.filter((x) => def(x).c >= 2).length;
    switch (f.id) {
      case 'flammeche': return deux >= 3 || ['bram', 'vesper', 'nacre'].includes(cl) ? 'B' : 'A';
      case 'cendrot': return cl === 'lierre' || run.reliques.includes('herisson') ? 'A' : 'B';
      case 'givrelin': return cl === 'silex' ? 'A' : 'B';
      case 'chaton': return ['ivra', 'fumee'].includes(cl) || run.reliques.includes('lunette') ? 'B' : 'A';
      default: return run.pv / run.pvMax < 0.6 ? 'A' : 'B';
    }
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
    const or = Math.round(orBase * (1 + eff(run, 'orBonus') / 100 + (run.serments.includes('meute')?0.2:0)) * (run.brasier >= 10 ? 0.75 : 1));
    const eclats = type === 'boss' ? 3 : type === 'elite' ? entre(run, 1, 2) : (alea(run) < 0.25 ? 1 : 0);
    run.or += or; run.eclats += eclats;
    run.or += (c.orFin || 0) + eff(run, 'orFinCombat') + (run.classe === 'nacre' ? (run.brasier >= 10 ? 4 : 10) : 0);
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
      cartes: type==='boss' ? tirerLegendaires(run,run.serments.includes('orgueil')?4:3) : tirerCartes(run,3+eff(run,'choixCartes')+(run.serments.includes('jeune')?1:0),run.flags.enflamme?'feu':type), cartePrise: false,
      reliquesChoix: type === 'boss' ? tirerReliques(run, 3, 'B') : type === 'elite' ? tirerReliques(run, run.flags.enflamme || run.serments.includes('cendre') ? 3 : 2, 'E') : null, reliquePrise: false,
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
    run.deck.push(nouvelleInst(run, id, CARTES[id].r === 'C' && eff(run, 'communeAffutee') ? 1 : 0)); r.cartePrise = true; fortuneChoix(run,id); return true;
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
  function passerCarte(run) { const r = run.recompense; if (!r || r.cartePrise) return false; r.cartePrise = true; r.passee = true; run.or += 8; fortuneChoix(run,null); return true; }
  function quitterRecompense(run) {
    const r = run.recompense; if (!r) return false;
    if (evolutionsEnAttente(run).length) return false; // V8 : choisir la voie d'évolution d'abord
    const boss = r.type === 'boss';
    if(!r.cartePrise) passerCarte(run);
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
  function soinBrasero(run) { return Math.round(run.pvMax * Math.max(0,(run.brasier >= 8 ? 20 : 30) + eff(run,'soinRepos')-(run.serments.includes('jeune')?10:0)) / 100); }
  function braseroFait(run, k) { const b = run.brasero; b.faits = (b.faits || []).concat(k); if (b.faits.length >= 1 + (eff(run, 'braseroDouble') ? 1 : 0)) b.fait = k; }
  function braseroSoigner(run) { if (!run.brasero || run.brasero.fait) return false; soigner(run,null,soinBrasero(run)); braseroFait(run, 'soin'); return true; }
  function braseroMediter(run) {
    if (!run.brasero || run.brasero.fait) return false;
    braseroFait(run, 'mediter'); gagnerXp(run, 20); return true;
  }
  function gagnerXp(run, n) {
    run.xp += n;
    while (run.niveau < SEUILS_XP.length && run.xp >= SEUILS_XP[run.niveau]) { run.niveau++; run.pvMax += 4; run.pv = Math.min(run.pvMax, run.pv + 4); run.niveauxEnAttente++; }
  }
  function affutable(inst) { const d = def(inst); return (inst.niv || 0) < niveauMax(d) && d.r !== 'M'; }
  function demanderSelection(run, mode, retour) { if(run.selection && run.ecran==='selection') { (run.selectionsEnAttente=run.selectionsEnAttente||[]).push({mode,retour}); return; } run.selection = { mode, retour }; run.ecranAvant = run.ecran; run.ecran = 'selection'; }
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
    if(run.selectionsEnAttente && run.selectionsEnAttente.length) { const n=run.selectionsEnAttente.shift(); demanderSelection(run,n.mode,n.retour); }
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
    if (k === 'soin') soigner(run,null,Math.round(run.pvMax*0.3));
    else if (k === 'pvmax') { run.pvMax += 4; run.pv += 4; }
    else if (k === 'rang') run.rang++;
    else demanderSelection(run, k, 'marchand');
    return true;
  }

  function evenementPossible(run, e) {
    if (e.cond === 'evolutif') return (run.familiers || []).some((f) => !f.evo && (f.stade || 0) < 2);
    return true;
  }
  function tribuPrincipale(run) {
    const n = {}; run.deck.forEach((x) => { const t = def(x).tr; if (t) n[t] = (n[t] || 0) + 1; });
    const k = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
    return k || choisir(run, Object.keys(TRIBUS));
  }
  function evenementDef(run) { return run.evenement && EVENEMENTS.find((e) => e.id === run.evenement.id); }
  function choixPossible(run, ch) { return !ch.cond || (ch.cond[0] === 'or' ? run.or >= ch.cond[1] : true); }
  function choisirEvenement(run, k) {
    const ev = evenementDef(run); if (!ev || run.evenement.fait != null) return false;
    const ch = ev.choix[k]; if (!ch || !choixPossible(run, ch)) return false;
    run.evenement.fait = k; run.evenement.resultat = [];
    const res = run.evenement.resultat; run.selectionsEnAttente=[];
    ch.eff.forEach((e) => {
      const [t, n] = e;
      if(t==='fortune') {run.pity=Math.min(10,(run.pity||0)+n);res.push('Fortune : '+run.pity+'/10');}
      else if (t === 'pv') { if (n < 0) run.pv = Math.max(1, run.pv + n); else run.pv = Math.min(run.pvMax, run.pv + n); res.push((n > 0 ? '+' : '') + n + ' PV'); }
      else if (t === 'pvMax') { run.pvMax = Math.max(10, run.pvMax + n); run.pv = Math.max(1, Math.min(run.pvMax, run.pv + n)); res.push((n > 0 ? '+' : '') + n + ' PV max'); }
      else if (t === 'relique') { const id = tirerReliques(run, 1, 'E')[0]; if (id && gagnerRelique(run, id)) res.push('Relique : ' + RELIQUES[id].nom); else { run.or += 60; res.push('+60 or'); } }
      else if (t === 'suies') { for (let i = 0; i < n; i++) run.deck.push(nouvelleInst(run, 'suie')); res.push(n + ' Suie' + (n > 1 ? 's' : '') + ' dans ton paquet'); }
      else if (t === 'retireSuies') { const avant = run.deck.length; run.deck = run.deck.filter((x) => x.id !== 'suie'); res.push((avant - run.deck.length) + ' Suie(s) retirée(s)'); }
      else if (t === 'evoFam') { const f = (run.familiers || []).find((x) => !x.evo && (x.stade || 0) < 2); if (f && forcerEvolution(run, f.id)) res.push(famStade(f).nom + ' va évoluer : choisis sa voie'); }
      else if (t === 'carteClasse') { const pool = poolCartes(run).filter((d) => d.cl === run.classe && d.r !== 'E'); melanger(run, pool); run.evenement.cartes = pool.slice(0, 3).map((d) => d.id); run.evenement.cartePrise = false; }
      else if (t === 'transforme') demanderSelection(run, 'transformer', 'evenement');
      else if (t === 'duplique') demanderSelection(run, 'dupliquer', 'evenement');
      else if (t === 'benir') { const tr = tribuPrincipale(run); run.benis = run.benis || {}; run.benis[tr] = (run.benis[tr] || 0) + n; res.push(TRIBUS[tr].nom + ' bénis : +' + n + ' pour les liens'); }
      else if (t === 'pariGros') { run.or -= 50; if (alea(run) < 0.5) { run.or += 120; res.push('Gagné : +70 or net'); } else res.push('Perdu : −50 or'); }
      else if (t === 'pariPV') { run.pv = Math.max(1, run.pv - 6); if (alea(run) < 2 / 3) { run.evenement.cartes = tirerCartes(run, 3, 'boss'); run.evenement.cartePrise = false; res.push('La roue s\'arrête sur le rouge'); } else res.push('Perdu : −6 PV'); }
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
  const POIDS_ST = { echo: 7, cadence: 1.8, ardeur: 9, chaleur: 1.6, fleches: 2.2, seve: 0.7, rage: 1.2, ames: 2.2, brume: 3, esquive: 6, epines: 1.6, robustesse: 3, force: 4, rouages: 1, contre:3.2,arcane:1.7,harmonie:2.4,nuitrouge:6,montagne:12,singularite:6,opera:10,soleil:10,brouillard:8,carquoisSans:10,grandeforge:8,arbremonde:9,sansLimite:7,tempo:10,manaPlus:10 };
  function score(run, c, entrants) {
    if (c.fin === 'victoire') return 1e5 + run.pv * 10;
    if (c.fin === 'defaite') return -1e5;
    let s = run.pv * 3;
    vivants(c).forEach((e) => {
      s -= e.pv + e.garde * 0.4;
      s -= (e.st.esquive || 0) * 7 + (e.st.force || 0) * 2.5 + (e.st.epines || 0) * 0.8;
      s += (e.st.brulure || 0) * 0.9 + (e.st.poison || 0) * 0.9 + (e.st.gel || 0) * (run.classe === 'silex' ? 2.2 : 1.2) + (e.st.faible || 0) * 1.8 + (e.st.expose || 0) * 2 + (e.st.marque||0)*2.5;
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

  // ---------- V8 : aperçu exact (même moteur, sur une copie) ----------
  function apercu(run, c, i, cibleU) {
    if (!c || c.fin || !peutJouer(run, c, i)) return null;
    const inst = c.main[i];
    if (besoinCible(inst) && cibleU == null) { const v = ciblesValides(c); if (v.length === 1) cibleU = v[0].u; }
    const [r2, c2] = cloner(run, c);
    const entrants0 = degatsEntrants(run, c);
    const res = jouerCarte(r2, c2, i, cibleU);
    if (!res.ok) return null;
    const ennemis = {};
    c.ennemis.forEach((e) => {
      if (e.pv <= 0) return;
      const e2 = c2.ennemis.find((x) => x.u === e.u);
      const pv1 = e2 ? Math.max(0, e2.pv) : 0, g1 = e2 ? e2.garde : 0;
      const releve = !!(e2 && e2.revenu && !e.revenu);
      const st = {}; if (e2) Object.keys(e2.st).forEach((k) => { const d = (e2.st[k] || 0) - (e.st[k] || 0); if (d) st[k] = d; });
      ennemis[e.u] = { nom: e.nom, pv0: e.pv, pv1: releve ? 0 : pv1, garde0: e.garde, garde1: g1, deg: (e.pv - (releve ? 0 : pv1)), gardePerdue: Math.max(0, e.garde - g1), mort: releve || pv1 <= 0, releve, st };
    });
    const stJ = {}; Object.keys(Object.assign({}, c.j.st, c2.j.st)).forEach((k) => { const d = (c2.j.st[k] || 0) - (c.j.st[k] || 0); if (d) stJ[k] = d; });
    return {
      cible: cibleU, ennemis, victoire: c2.fin === 'victoire',
      heros: { garde0: c.j.garde, garde1: c2.j.garde, pv0: run.pv, pv1: r2.pv, entrants0, entrants1: c2.fin ? 0 : degatsEntrants(r2, c2), mana0: c.j.mana, mana1: c2.j.mana, main0: c.main.length, main1: c2.main.length, or0: run.or, or1: r2.or, st: stJ }
    };
  }
  // Aperçu pour chaque cible possible d'une carte à cible unique (sur mobile, on montre toutes les cibles).
  function apercuCibles(run, c, i) {
    const inst = c.main[i]; if (!inst) return null;
    if (!besoinCible(inst)) { const a = apercu(run, c, i, null); return a ? { tous: a } : null; }
    const out = {}; ciblesValides(c).forEach((e) => { const a = apercu(run, c, i, e.u); if (a) out[e.u] = a; });
    return out;
  }
  const NOMS_ST = { brulure: 'Brûlure', poison: 'Poison', gel: 'Gel', faible: 'Faiblesse', expose: 'Exposé', force: 'Force', chaleur: 'Chaleur', fleches: 'Flèche', seve: 'Sève', rage: 'Rage', ames: 'Âme', brume: 'Brume', esquive: 'Esquive', epines: 'Épine', robustesse: 'Robustesse', rouages: 'Rouage', contre:'Contre',arcane:'Arcane',harmonie:'Harmonie',marque:'Marque', cadence: 'Cadence', echo: 'Écho', ardeur: 'Ardeur' };
  function raisonCoup(run, c, coup) {
    const a = apercu(run, c, coup.i, coup.u); if (!a) return '';
    const vals = Object.values(a.ennemis);
    if (a.victoire) return 'Achève le combat.';
    const morts = vals.filter((e) => e.mort && !e.releve);
    if (morts.length) return 'Létal sur ' + morts.map((e) => e.nom).join(' et ') + '.';
    const h = a.heros;
    if ((h.st.echo || 0) > 0) return 'Prépare un Écho : ta prochaine carte sera jouée deux fois.';
    if (run.classe === 'vesper' && (h.st.cadence || 0) > 0) { const seuil = run.rang >= 3 ? 2 : 3; return `Monte la Cadence à ${(c.j.st.cadence || 0) + h.st.cadence}/${seuil} pour doubler un prochain coup.`; }
    const g = h.garde1 - h.garde0, inc = h.entrants0;
    const deg = vals.reduce((s, e) => s + e.deg + e.gardePerdue, 0);
    if (g > 0 && inc > h.garde0 && g >= deg) return `Couvre ${Math.min(g, inc - h.garde0)} des ${inc} dégâts entrants.`;
    if (deg > 0) { const top = vals.slice().sort((x, y) => y.deg - x.deg)[0]; const sts = Object.entries(top.st).filter(([k, v]) => v > 0 && NOMS_ST[k]); return `Inflige ${deg} dégâts${vals.filter((e) => e.deg > 0).length > 1 ? ' répartis' : ' à ' + top.nom}${sts.length ? ' et pose ' + sts.map(([k, v]) => v + ' ' + NOMS_ST[k]).join(', ') : ''}.`; }
    const stE = {}; vals.forEach((e) => Object.entries(e.st).forEach(([k, v]) => { if (v > 0) stE[k] = (stE[k] || 0) + v; }));
    const kE = Object.keys(stE).filter((k) => NOMS_ST[k]); if (kE.length) return 'Pose ' + kE.map((k) => stE[k] + ' ' + NOMS_ST[k]).join(', ') + ' avant que les ennemis agissent.';
    const kJ = Object.keys(h.st).filter((k) => h.st[k] > 0 && NOMS_ST[k]); if (kJ.length) return 'Gagne ' + kJ.map((k) => h.st[k] + ' ' + NOMS_ST[k]).join(', ') + ' pour la suite du combat.';
    if (g > 0) return `Gagne ${g} garde${inc ? ` (${inc} dégâts annoncés)` : ' en réserve'}.`;
    if (h.mana1 > h.mana0 - cout(c.main[coup.i], c)) return 'Rend du mana pour enchaîner.';
    if (h.main1 > h.main0) return 'Pioche pour trouver un meilleur coup.';
    return 'Meilleur rapport effet / coût de ta main.';
  }
  function conseilCombat(run) {
    const c = run.combat; if (!c || c.fin) return null;
    const m = meilleurCoup(run, c);
    if (m) return { i: m.i, u: m.u, txt: raisonCoup(run, c, m) };
    const jouables = c.main.some((_, i) => peutJouer(run, c, i));
    const inc = degatsEntrants(run, c);
    return { i: -1, txt: !jouables ? (c.j.mana ? 'Rien de jouable : finis le tour.' : 'Plus de mana : finis le tour.') : inc > c.j.garde ? `Aucune carte n'aide assez : finis le tour (${inc - c.j.garde} dégâts à encaisser).` : 'Aucune carte ne vaut son coût ici : finis le tour.' };
  }
  // ---------- V8 : Mentor hors combat ----------
  function raisonCarte(run, id) {
    const d = CARTES[id], out = [];
    if (d.cl === run.classe) out.push('carte de ta classe');
    if (d.tr) { const n = tribuCompte(run, d.tr); const l = liens(run).find((x) => x.tribu === d.tr); out.push(`${TRIBUS[d.tr].nom} : ${n + 1} dans ton paquet${l && l.prochain && l.prochain - n === 1 ? ', active un lien' : ''}`); }
    if (d.q) out.push('évolue seule (quête)');
    if (d.or && run.classe === 'nacre') out.push('payée en or');
    if (d.c === 0) out.push('gratuite à jouer');
    if (d.cib === 'tous') out.push('touche tous les ennemis');
    if (d.r === 'E' || d.r === 'L') out.push(RARETES[d.r].nom.toLowerCase());
    const dbl = run.deck.filter((x) => x.id === id).length; if (dbl) out.push(`déjà ${dbl} en paquet`);
    return out.slice(0, 3).join(', ');
  }
  function conseilCartes(run, ids) {
    if (!ids || !ids.length) return null;
    const tri = ids.map((id) => ({ id, s: valeurCarte(run, id) })).sort((a, b) => b.s - a.s);
    const taille = run.deck.length;
    if (taille >= 24 && tri[0].s < 2.6) return { id: null, txt: `Passe (+8 or) : ton paquet a déjà ${taille} cartes, aucune ne le rend plus fort.` };
    return { id: tri[0].id, txt: `${CARTES[tri[0].id].nom} : ${raisonCarte(run, tri[0].id) || 'la plus solide des trois'}.` };
  }
  const RAISON_REL = {
    garderMain: 'tu gardes tes cartes d\'un tour à l\'autre', premiereDouble: 'ta première carte de chaque tour compte double', manaTour: '+1 mana chaque tour, le plus gros gain de tempo',
    gardeGardee: 'ta garde ne fond plus entre deux tours', familierPlus: 'tes familiers évoluent deux fois plus vite', tribuPlus: 'rapproche tous tes liens de tribu',
    statutPlus: 'chaque statut que tu poses compte +1', ressourceClasse: 'nourrit directement ta ressource de classe', coutDeuxPlus: 'renforce tes cartes à 2 mana',
    lameGarde: 'tes Lames protègent aussi', sortDeg: 'tes Sorts blessent aussi', phenix: 'une seconde vie pour la course', immunite: 'te protège des statuts ennemis'
  };
  function conseilRelique(run, ids) {
    if (!ids || !ids.length) return null;
    const bonus = (id) => {
      const r = RELIQUES[id]; let s = -RANG_IA.indexOf(id); if (s > 0) s = -40;
      r.eff.forEach(([k]) => {
        if (k === 'familierPlus' && run.familiers.length) s += 15;
        if (k === 'statutPlus' && ['solen', 'silex', 'fumee', 'ivra'].includes(run.classe)) s += 12;
        if (k === 'ressourceClasse') s += 8;
        if (k === 'coutDeuxPlus' && run.deck.filter((x) => def(x).c >= 2).length >= 3) s += 10;
        if (k === 'lameGarde' && run.deck.filter((x) => def(x).t === 'L').length >= run.deck.length * 0.55) s += 8;
        if (k === 'tribuPlus' && liens(run).some((l) => l.prochain && l.prochain - l.n === 1)) s += 12;
      });
      return s;
    };
    const best = ids.slice().sort((a, b) => bonus(b) - bonus(a))[0];
    const r = RELIQUES[best], k = r.eff.map((e) => e[0]).find((x) => RAISON_REL[x]);
    return { id: best, txt: `${r.nom} : ${k ? RAISON_REL[k] : 'la plus forte pour ce paquet'}.` };
  }
  function conseilMarchand(run) {
    const m = run.marchand; if (!m) return null;
    const cl = CLASSES[run.classe];
    if (run.rang < 3 && !m.services.rang && run.or >= prixService(run, 'rang')) return { k: 'srang', txt: `Monte ta compétence au rang ${run.rang + 1} : ${cl.comp.rangs[run.rang]}` };
    if (run.deck.some((x) => x.id === 'suie') && !m.services.retirer && run.or >= prixService(run, 'retirer')) return { k: 'sretirer', txt: 'Retire une Suie : elle bloque une place dans ta main de 4.' };
    if (run.pv / run.pvMax < 0.45 && !m.services.soin && run.or >= prixService(run, 'soin')) return { k: 'ssoin', txt: `Soigne-toi d'abord : ${run.pv}/${run.pvMax} PV avant la suite.` };
    const tri = m.cartes.map((o, i) => ({ o, i, s: valeurCarte(run, o.id) })).filter((x) => !x.o.vendu && run.or >= x.o.prix).sort((a, b) => b.s - a.s);
    if (tri.length && tri[0].s >= 2.6) return { k: 'c' + tri[0].i, txt: `${CARTES[tri[0].o.id].nom} : ${raisonCarte(run, tri[0].o.id) || 'bon ajout'}.` };
    if (run.deck.length >= 14 && !m.services.retirer && run.or >= prixService(run, 'retirer')) return { k: 'sretirer', txt: 'Retire une Frappe : tes meilleures cartes reviendront plus souvent.' };
    return { k: null, txt: 'Garde ton or : rien ici ne change ton paquet.' };
  }

  // ---------- V9 : chemin planifié (programmation dynamique sur la carte) ----------
  // Estimation grossière, volontairement lisible : un combat coûte des PV, une élite beaucoup plus,
  // un brasero soigne, un trésor et une élite rapportent. Le plan cherche la suite de lieux qui maximise la valeur
  // sans passer sous zéro PV estimés. Sert au joueur automatique, au Mentor et au Conseiller.
  const COUT_PV = { combat: 0.11, elite: 0.24, boss: 0.35, evenement: 0.03, marchand: 0, tresor: 0, brasero: -0.3 };
  function valeurLieu(run, n, hp) {
    const enfl = n.enflamme ? 2 : 0;
    switch (n.type) {
      case 'combat': return 1.2;
      case 'elite': return 3.4 + enfl;
      case 'tresor': return 2.6;
      case 'evenement': return 1.3;
      case 'marchand': return Math.min(3, run.or / 70) + (run.deck.some((x) => x.id === 'suie') ? 0.8 : 0);
      case 'brasero': return hp < 0.55 ? 3.2 : hp < 0.8 ? 1.6 : 0.9;
      default: return 0;
    }
  }
  function planChemin(run, depuis) {
    const N = run.carte.noeuds, memo = {};
    const pas = (id, hp) => {
      const n = N[id]; const h = Math.round(Math.max(0, Math.min(1, hp)) * 20);
      const k = id + ':' + h; if (memo[k]) return memo[k];
      const apres = Math.min(1, hp - (COUT_PV[n.type] || 0) * (run.brasier >= 6 ? 1.15 : 1));
      if (n.type === 'boss') return (memo[k] = { v: apres > 0 ? 6 : -40, chemin: [id] });
      if (apres <= 0.02) return (memo[k] = { v: -40 - (n.r || 0), chemin: [id] });
      let best = null;
      n.liens.forEach((l) => { const r = pas(l, apres); if (!best || r.v > best.v) best = r; });
      const risque = apres < 0.3 ? (0.3 - apres) * 12 : 0;
      return (memo[k] = { v: valeurLieu(run, n, hp) - risque + (best ? best.v : 0), chemin: [id].concat(best ? best.chemin : []) });
    };
    return (depuis || choixCarte(run)).map((id) => Object.assign({ id }, pas(id, run.pv / run.pvMax)));
  }
  function resumeChemin(run, chemin) {
    const N = run.carte.noeuds, t = { elite: 0, brasero: 0, marchand: 0, tresor: 0, evenement: 0, combat: 0 };
    chemin.forEach((id) => { const n = N[id]; if (t[n.type] != null) t[n.type]++; });
    return t;
  }
  // Départage les chemins de même valeur par ce que la voie apporte si tu y restes (selon tes PV).
  function noteVoie(run, id) {
    const N = run.carte.noeuds, n = N[id]; if (!n || n.type === 'boss') return 0;
    const hp = run.pv / run.pvMax, t = resumeChemin(run, Object.values(N).filter((m) => m.c === n.c && m.r >= n.r && m.type !== 'boss').map((m) => m.id));
    return t.elite * (hp > 0.75 ? 1.5 : hp > 0.5 ? 0 : -2) + t.brasero * (hp < 0.6 ? 1.5 : 0.3) + t.tresor + t.marchand * Math.min(1, run.or / 150);
  }
  function plansTries(run) { return planChemin(run).map((p) => Object.assign(p, { note: p.v + 0.1 * noteVoie(run, p.id) })).sort((a, b) => b.note - a.note); }
  const NOM_LIEU = { combat: 'combat', elite: 'élite', brasero: 'brasero', marchand: 'marchand', tresor: 'trésor', evenement: 'événement', boss: 'boss' };
  function conseilChemin(run) {
    if (run.ecran !== 'carte' || !run.carte) return null;
    const plans = plansTries(run);
    if (!plans.length) return null;
    const p = plans[0], N = run.carte.noeuds, n = N[p.id];
    const voie = n.type === 'boss' ? [] : Object.values(N).filter((m) => m.c === n.c && m.r >= n.r && m.type !== 'boss').map((m) => m.id);
    const t = resumeChemin(run, voie);
    const hp = Math.round(100 * run.pv / run.pvMax);
    const L = NOM_LIEU[n.type][0].toUpperCase() + NOM_LIEU[n.type].slice(1);
    if (n.type === 'boss') return { id: p.id, txt: `Boss : ${hp} % de PV, joue tes meilleures cartes en premier.` };
    const pourquoi = n.type === 'elite' && hp >= 70 ? `tu as ${hp} % de PV, l'élite paie une relique`
      : n.type === 'brasero' ? `tu es à ${hp} % de PV` : n.type === 'marchand' ? `tu as ${run.or} or à dépenser` : n.type === 'tresor' ? 'une relique gratuite'
      : n.c > 2 ? `tu as ${hp} % de PV : vise le butin de la voie Audace` : n.c < 1 ? (hp < 60 ? `garde tes PV (${hp} %), cette voie a des braseros` : 'avance sans risque, cette voie a des braseros') : 'un peu de butin sans trop de risque';
    return { id: p.id, txt: `${L} (voie ${n.voie}) : ${pourquoi}. Si tu y restes : ${t.elite} élite${t.elite > 1 ? 's' : ''} et ${t.brasero} brasero${t.brasero > 1 ? 's' : ''} jusqu'au boss.` };
  }

  // ---------- V9 : le Conseiller compare les options, sans décider à ta place ----------
  function conseillerChemin(run) {
    if (!run.carte) return null;
    const plans = plansTries(run); if (!plans.length) return null;
    const N = run.carte.noeuds, meilleurId = plans[0].id;
    plans.sort((a, b) => run.carte.noeuds[a.id].c - run.carte.noeuds[b.id].c);
    const hp = run.pv / run.pvMax;
    return {
      titre: 'Chemins possibles',
      options: plans.map((p) => {
        const n = N[p.id];
        // ce que donne la voie si tu y restes jusqu'au boss (les carrefours permettent d'en changer)
        const voie = n.type === 'boss' ? [p.id] : Object.values(N).filter((m) => m.c === n.c && m.r >= n.r && m.type !== 'boss').sort((x, y) => x.r - y.r).map((m) => m.id);
        const t = resumeChemin(run, voie);
        const pour = [], contre = [];
        if (t.elite) pour.push(`${t.elite} élite${t.elite > 1 ? 's' : ''} : reliques et cartes rares`); if (t.tresor) pour.push(`${t.tresor} trésor`);
        if (t.brasero) pour.push(`${t.brasero} brasero${t.brasero > 1 ? 's' : ''} pour souffler`); if (t.marchand) pour.push(`${t.marchand} marchand${t.marchand > 1 ? 's' : ''}`);
        if (voie.some((id) => N[id].enflamme)) pour.push('passe par l\'élite enflammée (3 reliques)');
        if (t.elite >= 2 && hp < 0.7) contre.push(`${t.elite} élites avec ${Math.round(hp * 100)} % de PV`);
        if (t.brasero <= 1) contre.push(t.brasero ? 'un seul brasero avant le boss' : 'aucun brasero avant le boss');
        if (t.elite <= 1) contre.push('peu de butin : ton paquet grandira moins');
        if (t.combat >= 7) contre.push(`${t.combat} combats : beaucoup d'usure`);
        const risque = t.elite * 2 + t.combat * 0.4 - t.brasero * 1.5 + (hp < 0.5 ? 2 : 0);
        const nomL = NOM_LIEU[n.type];
        return { id: p.id, nom: `${nomL[0].toUpperCase() + nomL.slice(1)}${n.voie ? ' (voie ' + n.voie + ')' : ''}`, suite: voie.slice(0, 5).map((id) => NOM_LIEU[N[id].type]), pour, contre, risque: risque >= 5 ? 'élevé' : risque >= 2.5 ? 'moyen' : 'faible', meilleur: p.id === meilleurId };
      })
    };
  }
  function prosCarte(run, id) {
    const d = CARTES[id], pour = [], contre = [];
    if (d.cl === run.classe) pour.push('nourrit ta mécanique de classe');
    if (d.tr) { const n = tribuCompte(run, d.tr); const l = liens(run).find((x) => x.tribu === d.tr); pour.push(`${TRIBUS[d.tr].nom} : ${n + 1} en paquet${l && l.prochain && l.prochain - n === 1 ? ', active un lien' : ''}`); }
    if (d.c === 0) pour.push('gratuite');
    if (d.cib === 'tous') pour.push('touche tous les ennemis'); else if (d.cib === 'e' && run.acte >= 1) contre.push('une seule cible face aux groupes');
    if (d.exil) contre.push('se consume : une fois par combat');
    if (d.c >= 2) contre.push(`coûte ${d.c} mana`);
    if (d.r === 'L' || d.r === 'E') pour.push(RARETES[d.r].nom.toLowerCase());
    const dbl = run.deck.filter((x) => x.id === id).length; if (dbl) contre.push(`déjà ${dbl} en paquet`);
    const lames = run.deck.filter((x) => def(x).t === 'L').length;
    if (d.t === 'L' && lames > run.deck.length * 0.65) contre.push('ton paquet a déjà beaucoup de Lames');
    if (d.t === 'S' && lames < run.deck.length * 0.35) contre.push('ton paquet manque déjà de dégâts');
    if (run.deck.length >= 20) contre.push(`dilue un paquet de ${run.deck.length} cartes`);
    return { pour, contre };
  }
  function conseillerCartes(run, ids) {
    if (!ids || !ids.length) return null;
    const tri = ids.map((id) => ({ id, s: valeurCarte(run, id) }));
    const max = Math.max(...tri.map((x) => x.s));
    const options = tri.map((x) => Object.assign({ id: x.id, nom: CARTES[x.id].nom, meilleur: x.s === max && !(run.deck.length >= 24 && x.s < 2.6) }, prosCarte(run, x.id)));
    const p = run.pity || 0;
    options.push({ id: null, nom: 'Passer (+8 or)', pour: ['garde ton paquet fin : tes meilleures cartes reviennent plus vite', `jauge de fortune ${Math.min(10, p + 2)}/10 : plus de rares ensuite`], contre: ['aucune nouvelle carte'], meilleur: run.deck.length >= 24 && max < 2.6 });
    return { titre: 'Comparer les cartes', options };
  }
  function conseillerMarchand(run) {
    const m = run.marchand; if (!m) return null;
    const options = [];
    m.cartes.forEach((o, i) => { if (o.vendu) return; const pc = prosCarte(run, o.id); if (run.or < o.prix) pc.contre.unshift(`il te manque ${o.prix - run.or} or`); options.push(Object.assign({ k: 'c' + i, nom: `${CARTES[o.id].nom} (${o.prix} or)`, s: valeurCarte(run, o.id) - (run.or < o.prix ? 9 : 0) }, pc)); });
    if (!m.services.retirer) options.push({ k: 'sretirer', nom: `Retirer une carte (${prixService(run, 'retirer')} or)`, pour: ['affine le paquet : tes combos sortent plus souvent'].concat(run.deck.some((x) => x.id === 'suie') ? ['enlève une Suie'] : []), contre: run.or < prixService(run, 'retirer') ? ['pas assez d\'or'] : [], s: (run.deck.some((x) => x.id === 'suie') ? 3.4 : run.deck.length >= 14 ? 2.5 : 1.2) - (run.or < prixService(run, 'retirer') ? 9 : 0) });
    if (!m.services.soin) options.push({ k: 'ssoin', nom: `Soin (${prixService(run, 'soin')} or)`, pour: [`tu es à ${run.pv}/${run.pvMax} PV`], contre: run.pv / run.pvMax > 0.7 ? ['tu as encore de la marge'] : [], s: (run.pv / run.pvMax < 0.45 ? 4 : 0.6) - (run.or < prixService(run, 'soin') ? 9 : 0) });
    if (run.rang < 3 && !m.services.rang) options.push({ k: 'srang', nom: `Rang ${run.rang + 1} de compétence (${prixService(run, 'rang')} or)`, pour: [CLASSES[run.classe].comp.rangs[run.rang]], contre: run.or < prixService(run, 'rang') ? ['pas assez d\'or'] : ['cher'], s: 3.8 - (run.or < prixService(run, 'rang') ? 9 : 0) });
    options.push({ k: null, nom: 'Garder ton or', pour: ['plus de choix au prochain marchand'], contre: ['l\'or ne sert à rien au boss'], s: 1 });
    options.sort((a, b) => b.s - a.s); const max = options[0].s;
    return { titre: 'Comparer les achats', options: options.slice(0, 5).map((o) => Object.assign(o, { meilleur: o.s === max })) };
  }
  function conseillerCombat(run) {
    const c = run.combat; if (!c || c.fin) return null;
    const base = score(run, c), coups = [];
    c.main.forEach((inst, i) => {
      if (!peutJouer(run, c, i)) return;
      const cibles = besoinCible(inst) ? ciblesValides(c).map((e) => e.u) : [null];
      cibles.forEach((u) => {
        const a = apercu(run, c, i, u); if (!a) return;
        const [r2, c2] = cloner(run, c); jouerCarte(r2, c2, i, u);
        const vals = Object.values(a.ennemis), deg = vals.reduce((s, e) => s + e.deg + e.gardePerdue, 0), g = a.heros.garde1 - a.heros.garde0;
        const pour = [], contre = [];
        if (a.victoire) pour.push('gagne le combat');
        const morts = vals.filter((e) => e.mort && !e.releve); if (morts.length) pour.push('achève ' + morts.map((e) => e.nom).join(' et '));
        if (deg) pour.push(`${deg} dégâts`); if (g) pour.push(`${g} garde`);
        const entr = a.heros.entrants0, couvre = Math.max(0, Math.min(a.heros.garde1, entr) - Math.min(a.heros.garde0, entr));
        if (entr > a.heros.garde1 && !a.victoire) contre.push(`tu prendras encore ${entr - a.heros.garde1} dégâts`);
        if (a.heros.mana1 === 0 && c.main.length > 2) contre.push('vide ton mana');
        if (def(inst).exil) contre.push('se consume');
        if (a.heros.pv1 < a.heros.pv0) contre.push(`coûte ${a.heros.pv0 - a.heros.pv1} PV`);
        coups.push({ i, u, nom: nomCarte(inst) + (u != null ? ' sur ' + c.ennemis.find((e) => e.u === u).nom : ''), s: score(r2, c2) - base, pour, contre, couvre });
      });
    });
    coups.sort((a, b) => b.s - a.s);
    const top = coups.slice(0, 3);
    const inc = degatsEntrants(run, c);
    top.push({ i: -1, nom: 'Finir le tour', pour: c.j.mana ? [] : ['plus de mana de toute façon'], contre: inc > c.j.garde ? [`${inc - c.j.garde} dégâts à encaisser`] : [], s: 0.3 });
    const max = Math.max(...top.map((x) => x.s));
    return { titre: 'Comparer les coups', options: top.map((o) => Object.assign(o, { meilleur: o.s === max })) };
  }

  const RANG_IA = ['echoforge', 'horloge', 'carapace', 'phenix', 'grimoirenoir', 'ancre', 'chaudron', 'oeil', 'pacte', 'lanterneetroite',
    'gardelame', 'pierreetincelle', 'dague', 'herisson', 'braseropoche', 'etincelle', 'coquille', 'poudre', 'manteau', 'calice', 'sablierinverse', 'rouet',
    'dynamo', 'tambour', 'cloche', 'spore', 'faux', 'lunette', 'gantelet', 'encrier', 'urnevide', 'banniere', 'flute', 'mechelente', 'lanterneveille',
    'trefle', 'aimant', 'carnet', 'sifflet', 'pageblanche', 'oeufbraise'];
  function iaCarte(run) {
    const plans = planChemin(run);
    let best = null;
    plans.forEach((p) => { const s = p.v + alea(run) * 1.2; if (!best || s > best.s) best = { id: p.id, s }; });
    return best && best.id;
  }
  function valeurCarte(run, id) {
    const d = CARTES[id];
    let s = { C: 1, P: 2, R: 3.2, E: 3.9, L: 4.6 }[d.r] || 0;
    if (d.or && run.classe === 'nacre') s += 0.6;
    if (d.cl === run.classe) s += 1.4;
    if (d.tr) s += 0.45 * tribuCompte(run, d.tr);
    if (d.q) s += 0.6;
    if (d.id==='purge' && run.deck.some((x)=>x.id==='suie')) s+=1.4;
    if (d.id==='recyclage' && run.deck.some((x)=>def(x).r==='L')) s+=1.5;
    if (d.id==='echange' && run.deck.length>=18) s+=1.2;
    if(d.id==='fourberie' && ['fumee','corvine','ivra'].includes(run.classe)) s+=1.0;
    const doublons = run.deck.filter((x) => x.id === id).length; s -= doublons * 0.8;
    return s;
  }
  function iaRecompense(run, cartes) {
    let best = null; cartes.forEach((id) => { const s = valeurCarte(run, id); if (!best || s > best.s) best = { id, s }; });
    if (!best) return null;
    if (run.deck.length >= 22 && best.s < 2.6) return null;
    return best.id;
  }
  // Télémétrie du simulateur : ce qui est proposé, ce qui est pris, ce qui est joué.
  function noterTele(run, genre, offres, pris) {
    if (!run.tele) return;
    const t = run.tele[genre]; (offres || []).forEach((id) => { t[id] = t[id] || [0, 0]; t[id][0]++; if (id === pris) t[id][1]++; });
  }
  // V8 : le joueur automatique (et le Mentor) pèsent chaque choix d'événement au lieu de prendre le premier.
  function valeurChoix(run, ch) {
    if (!choixPossible(run, ch)) return -1e9;
    const manque = 1 - run.pv / run.pvMax, suies = run.deck.filter((x) => x.id === 'suie').length;
    let s = 0;
    ch.eff.forEach(([k, n]) => {
      switch (k) {
        case 'pv': s += n > 0 ? n * (0.08 + manque * 0.5) : n * (0.15 + manque * 0.6); break;
        case 'pvMax': s += n * 0.55; break;
        case 'or': s += n * 0.03; break;
        case 'eclats': s += n * 0.6; break;
        case 'xp': s += n * 0.05; break;
        case 'relique': s += 6; break;
        case 'carteRare': s += 3.5; break;
        case 'carteClasse': s += 2.5; break;
        case 'talisman': s += 2; break;
        case 'familier': s += run.familiers.length < equipeMax(run) ? 3.5 : 0.5; break;
        case 'evoFam': s += 4; break;
        case 'affute': s += 2.5; break;
        case 'affuteAlea': s += 1.8; break;
        case 'retire': s += run.deck.length > 10 ? 2.5 : 0.5; break;
        case 'retireSuies': s += suies * 2.5; break;
        case 'suies': s -= n * 2.2; break;
        case 'ajoute': s += n === 'suie' ? -2.2 : 1.2; break;
        case 'transforme': s += 0.8; break;
        case 'duplique': s += 1.5; break;
        case 'benir': s += 1.5; break;
        case 'elite': s += run.pv > run.pvMax * 0.7 ? 1.5 : -6; break;
        case 'pari': case 'pariGros': s += 0.3; break;
        case 'pariPV': s += run.pv > run.pvMax * 0.6 ? 0.3 : -3; break;
        default: break;
      }
    });
    return s;
  }
  function iaEvenement(run, ev) {
    let best = ev.choix.length - 1, bs = -1e9;
    ev.choix.forEach((ch, i) => { const v = valeurChoix(run, ch); if (v > bs) { bs = v; best = i; } });
    return best;
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
    evolutionsEnAttente(run).forEach((f) => choisirEvolution(run, f.id, iaVoie(run, f)));
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
        const id = iaRecompense(run, r.cartes); if (id) prendreCarte(run, id); else passerCarte(run);
        noterTele(run, 'c', r.cartes, id);
        if (r.reliquesChoix && r.reliquesChoix.length) { const best = conseilRelique(run, r.reliquesChoix).id; choisirRelique(run, best); noterTele(run, 'r', r.reliquesChoix, best); }
        if (r.familier && run.familiers.length < equipeMax(run)) prendreFamilier(run);
        quitterRecompense(run); return true;
      }
      case 'niveau': { const ch = run.talentChoix; choisirTalent(run, ch[ent(run, ch.length)]); return true; }
      case 'tresor': { ouvrirTresor(run); const id = iaRecompense(run, run.tresor.cartes); if (id) prendreCarte(run, id); noterTele(run, 'c', run.tresor.cartes, id); quitterEcran(run); return true; }
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
          let k = iaEvenement(run, ev);
          choisirEvenement(run, k);
          while (run.ecran === 'selection') iaSelection(run);
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
    run.tele = { c: {}, r: {}, joue: {} };
    let garde = 0;
    while (!run.fini && garde++ < 5000) { if (!iaEcran(run)) break; }
    return { gagne: run.gagne, mort: run.fini && !run.gagne, acte: run.acte + 1, etage: run.etageTotal, niveau: run.niveau, tours: run.stats.tours, pv: run.pv, deckFinal: run.deck.map((x) => x.id), talismans: run.talismans.slice(), reliques: run.reliques.slice(), familiers: run.familiers.map((f) => f.id + ':' + f.stade), talents: run.talents.slice(), bloque: !run.fini, elites: run.stats.elites, renom: renomGagne(run), tele: run.tele };
  }

  // ---------- méta (renom) ----------
  function renomGagne(run) {
    return (run.serments||[]).reduce((n,id)=>n+(D.SERMENTS[id].renom||0)*Math.max(1,run.stats.boss),0)+run.etageTotal * 4 + run.stats.tues * 2 + run.stats.elites * 10 + run.stats.boss * 30 + (run.gagne ? 100 + run.brasier * 15 : 0);
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
    D, alea, SEUILS_XP, RENOM_NIVEAUX, BRASIER, planChemin, conseilChemin, conseillerChemin, conseillerCartes, conseillerMarchand, conseillerCombat, tirerLegendaires,
    nouvelleCourse, choixCarte, entrerNoeud, jouerCarte, finTour, peutJouer, besoinCible, vivants, intentAffiche, degatsEntrants,
    apercu, apercuCibles, raisonCoup, conseilCombat, conseilCartes, conseilRelique, conseilMarchand, degatsEntrants,
    evolutionsEnAttente, choisirEvolution, forcerEvolution, evoluerFamiliers, iaEvenement, valeurChoix, iaVoie, evenementPossible,
    prendreCarte, choisirRelique, prendreFamilier, passerCarte, accueillirFamilier, famStade, equipeMax, coutOr, ciblesValides, tauxTirage, P, gagnerRelique, quitterRecompense, choisirTalent, ouvrirTresor, quitterEcran,
    braseroSoigner, braseroMediter, soinBrasero, demanderSelection, annulerSelection, appliquerSelection, affutable,
    acheterCarte, acheterTalisman, acheterService, prixService, evenementDef, choixPossible, choisirEvenement,
    def, vals, texte, nomCarte, cout, liens, tribuCompte, talentDef, effets, eff, tailleMain,
    conseil, jouerCourse, iaEcran, renomGagne, niveauRenom, classesDebloquees, heritagesDebloques, brasierMax, enregistrerFin
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else racine.BraisesMoteur = M;
})(typeof window !== 'undefined' ? window : globalThis);
