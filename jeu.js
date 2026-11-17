/* Braises : jeu original. Aucune carte, nom, visuel ou règle copiés d'un autre jeu. */
(() => {
  const CLE_META = 'braises-meta';
  const CLE_PARTIE = 'braises-partie';

  const CARTES = {
    etincelle: { id: 'etincelle', nom: 'Étincelle', type: 'attaque', cout: 1, texte: 'Inflige 6 dégâts.', degats: 6, starter: true },
    cendre: { id: 'cendre', nom: 'Cendre', type: 'garde', cout: 1, texte: 'Gagne 5 de garde.', garde: 5, starter: true },
    soufflet: { id: 'soufflet', nom: 'Soufflet', type: 'art', cout: 1, texte: 'Gagne 2 Chaleur.', chaleur: 2, starter: true },
    tisons: { id: 'tisons', nom: 'Tisons', type: 'attaque', cout: 1, texte: 'Inflige 4 dégâts. Gagne 4 de garde.', degats: 4, garde: 4, starter: true },
    trait: { id: 'trait', nom: 'Trait de feu', type: 'attaque', cout: 2, texte: 'Inflige 13 dégâts.', degats: 13 },
    gerbe: { id: 'gerbe', nom: 'Gerbe', type: 'attaque', cout: 1, texte: 'Inflige 4 dégâts à tous les ennemis.', degats: 4, tous: true },
    braisevive: { id: 'braisevive', nom: 'Braise vive', type: 'attaque', cout: 1, texte: 'Inflige 5 dégâts, plus 3 par Chaleur.', degats: 5, parChaleur: 3 },
    souffle: { id: 'souffle', nom: 'Souffle ardent', type: 'attaque', cout: 2, texte: 'Inflige 8 dégâts. Gagne 2 Chaleur.', degats: 8, chaleur: 2 },
    eclat: { id: 'eclat', nom: 'Éclat', type: 'attaque', cout: 2, texte: 'Inflige 7 dégâts. Si tu as au moins 3 Chaleur, inflige 16 et consomme 3 Chaleur.', degats: 7, eclat: true },
    mur: { id: 'mur', nom: 'Mur de cendres', type: 'garde', cout: 2, texte: 'Gagne 12 de garde.', garde: 12 },
    voile: { id: 'voile', nom: 'Voile de fumée', type: 'garde', cout: 1, texte: 'Gagne 5 de garde. Pioche 1 carte.', garde: 5, pioche: 1 },
    encens: { id: 'encens', nom: 'Encens', type: 'garde', cout: 0, texte: 'Gagne 3 de garde et 1 Chaleur.', garde: 3, chaleur: 1 },
    huile: { id: 'huile', nom: 'Huile', type: 'art', cout: 1, texte: 'La prochaine attaque inflige 6 dégâts de plus.', huile: 6 },
    flamme: { id: 'flamme', nom: 'Flamme double', type: 'art', cout: 1, texte: 'Pioche 2 cartes.', pioche: 2 },
    resine: { id: 'resine', nom: 'Résine', type: 'art', cout: 0, texte: 'Au prochain tour, gagne 1 énergie de plus.', resine: 1 }
  };

  const DEBLOCABLES = ['eclat', 'gerbe', 'huile', 'resine'];

  const ENNEMIS = {
    chien: {
      type: 'chien', nom: 'Chien de cendre', pv: 30, picto: 'chien',
      intentions(e) {
        const r = alea();
        if (e.force < 2 && r < 0.28) return { sorte: 'buff', texte: 'Se renforce +2', force: 2 };
        if (r < 0.55) return { sorte: 'attaque', texte: (8 + (e.force || 0)) + ' dégâts', degats: 8 };
        return { sorte: 'attaque', texte: '2 × ' + (4 + (e.force || 0)), coups: 2, degats: 4 };
      }
    },
    statue: {
      type: 'statue', nom: 'Statue de givre', pv: 40, picto: 'statue',
      intentions(e) {
        e.cycle = (e.cycle || 0) + 1;
        const c = e.cycle % 3;
        if (c === 1) return { sorte: 'buff', texte: 'Frisson 2', frisson: 2 };
        if (c === 2) return { sorte: 'garde', texte: '8 de garde', garde: 8 };
        return { sorte: 'attaque', texte: (14 + (e.force || 0)) + ' dégâts', degats: 14 };
      }
    },
    souffleur: {
      type: 'souffleur', nom: 'Souffleur', pv: 66, picto: 'souffleur',
      intentions(e) {
        if (e.charge) {
          e.charge = false;
          return { sorte: 'charge', texte: (18 + (e.force || 0)) + ' dégâts', degats: 18 };
        }
        const r = alea();
        if (r < 0.34) { e.charge = true; return { sorte: 'charge', texte: 'Se charge', rien: true }; }
        if (r < 0.67) return { sorte: 'attaque', texte: '3 × ' + (4 + (e.force || 0)), coups: 3, degats: 4 };
        return { sorte: 'attaque', texte: (11 + (e.force || 0)) + ' dégâts', degats: 11 };
      }
    }
  };

  const CHEMIN = [
    { id: 0, type: 'combat', vague: 'chien', nom: 'Premier foyer', desc: 'Un chien de cendre veille encore.' },
    { id: 1, type: 'combat', vague: 'mixte', nom: 'Salle froide', desc: 'La flamme vacille.' },
    { id: 2, type: 'repos', vague: '', nom: 'Brasero', desc: 'Un peu de chaleur. Tu peux te soigner.' },
    { id: 3, type: 'combat', vague: 'dure', nom: 'Couloir de suie', desc: 'Ils sont plus nombreux.' },
    { id: 4, type: 'boutique', vague: '', nom: 'Étal du ramendeur', desc: 'Un choix, une carte à laisser.' },
    { id: 5, type: 'combat', vague: 'souffleur', nom: 'Le souffleur', desc: 'La dernière chambre.' }
  ];

  let etat = null;
  let meta = chargerMeta();
  let verrouille = false;
  const $ = (s, r = document) => r.querySelector(s);
  const app = () => $('#app');
  const ecran = () => $('#ecran');

  function alea() { return Math.random(); }
  function choix(arr) { return arr[Math.floor(alea() * arr.length)]; }
  function melanger(a) {
    const t = a.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(alea() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function instancier(id) { return { uid: uid(), id }; }
  function def(c) { return CARTES[typeof c === 'string' ? c : c.id]; }

  function chargerMeta() {
    try {
      return Object.assign({
        runs: 0, victoires: 0, defaites: 0, meilleurEtage: 0,
        deblocages: [], tutoVu: false
      }, JSON.parse(localStorage.getItem(CLE_META) || '{}'));
    } catch (e) { return { runs: 0, victoires: 0, defaites: 0, meilleurEtage: 0, deblocages: [], tutoVu: false }; }
  }
  function sauverMeta() { localStorage.setItem(CLE_META, JSON.stringify(meta)); }
  function sauverPartie() {
    if (!etat || etat.ecran === 'titre') {
      localStorage.removeItem(CLE_PARTIE);
      return;
    }
    localStorage.setItem(CLE_PARTIE, JSON.stringify(etat));
  }
  function chargerPartie() {
    try { return JSON.parse(localStorage.getItem(CLE_PARTIE) || 'null'); }
    catch (e) { return null; }
  }

  function deckDepart() {
    const d = [];
    for (let i = 0; i < 4; i++) d.push(instancier('etincelle'));
    for (let i = 0; i < 4; i++) d.push(instancier('cendre'));
    d.push(instancier('soufflet'));
    d.push(instancier('tisons'));
    return d;
  }

  function poolRecompense() {
    const ids = Object.keys(CARTES).filter((id) => !CARTES[id].starter);
    const locks = new Set(DEBLOCABLES.filter((id) => !meta.deblocages.includes(id)));
    return ids.filter((id) => !locks.has(id));
  }

  function nouvellePartie() {
    meta.runs += 1;
    sauverMeta();
    etat = {
      ecran: 'carte',
      etage: 0,
      or: 40,
      pv: 70, pvMax: 70,
      deck: deckDepart(),
      reliques: [],
      historique: [],
      difficulte: 1,
      combat: null,
      choix: null,
      debut: Date.now()
    };
    sauverPartie();
    montrer();
  }

  /* ---------- Affichage général ---------- */
  function montrer() {
    const fx = document.getElementById('fx');
    if (fx) fx.innerHTML = '';
    const e = etat ? etat.ecran : 'titre';
    if (e === 'titre') rendreTitre();
    else if (e === 'carte') rendreCarte();
    else if (e === 'combat') rendreCombat();
    else if (e === 'recompense') rendreRecompense();
    else if (e === 'repos') rendreRepos();
    else if (e === 'boutique') rendreBoutique();
    else if (e === 'victoire') rendreFin(true);
    else if (e === 'defaite') rendreFin(false);
    boutonMuet();
    if (e === 'combat') Son.musique('combat');
    else if (e === 'repos') Son.musique('repos');
    else if (e === 'boutique' || e === 'recompense') Son.musique('boutique');
    else if (e === 'victoire') Son.musique('victoire');
    else if (e === 'defaite') Son.musique('titre');
    else if (e === 'carte') Son.musique('carte');
    else Son.musique('titre');
  }

  function boutonMuet() {
    let b = $('.muet');
    if (!b) {
      b = document.createElement('button');
      b.className = 'muet';
      b.type = 'button';
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        Son.init();
        const off = Son.bascule();
        b.textContent = off ? 'Son' : 'Muet';
        b.setAttribute('aria-label', off ? 'Remettre le son' : 'Couper le son');
      });
      app().appendChild(b);
    }
    b.textContent = Son.estMuet() ? 'Son' : 'Muet';
  }

  function htmlCarte(c, extra = '') {
    const d = def(c);
    return `<article class="carte ${d.type} ${extra}" data-uid="${c.uid || ''}" data-id="${d.id}">
      <div class="carte-cout">${d.cout}</div>
      <div class="carte-type">${d.type}</div>
      <div class="carte-nom">${d.nom}</div>
      <div class="carte-texte">${d.texte}</div>
    </article>`;
  }

  /* ---------- Titre ---------- */
  function rendreTitre() {
    const partie = chargerPartie();
    ecran().innerHTML = `<div class="ecran-titre">
      <div class="braise-deco" aria-hidden="true"></div>
      <h1 class="logo">Braises</h1>
      <div class="logo-sous">Le porte-flamme</div>
      <p class="accroche">Tu es Solen. Une flamme vivante tient encore dans tes paumes. Traverse six chambres, construis ton jeu, et ne la laisse pas s'éteindre.</p>
      <button class="btn primaire" data-act="nouvelle">Nouvelle partie</button>
      ${partie && partie.ecran !== 'titre' && partie.ecran !== 'victoire' && partie.ecran !== 'defaite'
        ? `<button class="btn" data-act="continuer">Continuer</button>` : ''}
      <p class="meta-ligne">${meta.runs} course${meta.runs > 1 ? 's' : ''} · ${meta.victoires} victoire${meta.victoires > 1 ? 's' : ''} · meilleur palier ${meta.meilleurEtage}/6
      ${meta.deblocages.length ? `<br>Cartes débloquées : ${meta.deblocages.length}` : ''}</p>
    </div>`;
    ecran().onclick = (ev) => {
      const a = ev.target.closest('[data-act]');
      if (!a) return;
      Son.init(); Son.bip('clic');
      if (a.dataset.act === 'nouvelle') nouvellePartie();
      if (a.dataset.act === 'continuer') { etat = chargerPartie(); montrer(); }
    };
  }

  /* ---------- Carte du chemin ---------- */
  function rendreCarte() {
    const nodes = CHEMIN.map((n, i) => {
      const classe = i < etat.etage ? 'fait' : (i === etat.etage ? 'ici' : '');
      const picto = n.type === 'combat' ? (n.vague === 'souffleur' ? 'S' : 'X') : (n.type === 'repos' ? 'R' : 'B');
      return `<div class="noeud ${classe}">
        <div class="noeud-picto">${picto}</div>
        <div><div class="noeud-nom">${n.nom}</div><div class="noeud-desc">${n.desc}</div></div>
      </div>`;
    }).join('');
    ecran().innerHTML = `<div class="ecran-carte">
      <h2 class="titre-ecran">Le chemin</h2>
      <p class="sous-ecran">Solen · ${etat.pv}/${etat.pvMax} pv · ${etat.or} or · ${etat.deck.length} cartes</p>
      <div class="chemin">${nodes}</div>
      <div class="pied"><button class="btn primaire" data-act="avancer">Entrer</button></div>
    </div>`;
    ecran().onclick = (ev) => {
      if (!ev.target.closest('[data-act="avancer"]')) return;
      Son.init(); Son.bip('clic');
      entrerNoeud();
    };
  }

  function entrerNoeud() {
    const n = CHEMIN[etat.etage];
    if (!n) { victoire(); return; }
    if (n.type === 'combat') demarrerCombat(n.vague);
    else if (n.type === 'repos') { etat.ecran = 'repos'; sauverPartie(); montrer(); }
    else if (n.type === 'boutique') { etat.ecran = 'boutique'; etat.choix = tirerOffre(3); sauverPartie(); montrer(); }
  }

  function avancer() {
    meta.meilleurEtage = Math.max(meta.meilleurEtage, etat.etage + 1);
    sauverMeta();
    etat.etage += 1;
    if (etat.etage >= CHEMIN.length) { victoire(); return; }
    etat.ecran = 'carte';
    etat.combat = null;
    etat.choix = null;
    sauverPartie();
    montrer();
  }

  /* ---------- Combat ---------- */
  function ajusterPv(base) {
    // Ennemis qui s'adaptent : si tu finis les combats très haut, ils durcissent.
    const d = etat.difficulte || 1;
    return Math.max(18, Math.round(base * d));
  }

  function creerEnnemi(type) {
    const m = ENNEMIS[type];
    const e = { uid: uid(), type, nom: m.nom, pv: ajusterPv(m.pv), pvMax: ajusterPv(m.pv), bloc: 0, force: 0, charge: false, cycle: 0, picto: m.picto, intention: null };
    e.intention = m.intentions(e);
    return e;
  }

  function composerVague(vague) {
    if (vague === 'chien') return [creerEnnemi('chien')];
    if (vague === 'mixte') return alea() < 0.5 ? [creerEnnemi('statue')] : [creerEnnemi('chien'), creerEnnemi('chien')];
    if (vague === 'dure') return alea() < 0.5 ? [creerEnnemi('statue'), creerEnnemi('chien')] : [creerEnnemi('chien'), creerEnnemi('chien')];
    return [creerEnnemi('souffleur')];
  }

  function demarrerCombat(vague) {
    const pioche = melanger(etat.deck.map((c) => ({ ...c })));
    etat.combat = {
      ennemis: composerVague(vague),
      pioche,
      defausse: [],
      main: [],
      energie: 3,
      energieMax: 3,
      bonusEnergie: 0,
      bloc: 0,
      chaleur: 0,
      huile: 0,
      frisson: 0,
      sel: null,
      tour: 0,
      tuto: !meta.tutoVu
    };
    etat.ecran = 'combat';
    debutTourJoueur();
    sauverPartie();
    montrer();
  }

  function debutTourJoueur() {
    const c = etat.combat;
    c.tour += 1;
    c.bloc = 0;
    c.energie = c.energieMax + (c.bonusEnergie || 0);
    c.bonusEnergie = 0;
    if (c.tour > 1 && c.chaleur > 0) c.chaleur = Math.max(0, c.chaleur - 1);
    c.sel = null;
    piocher(5);
  }

  function piocher(n) {
    const c = etat.combat;
    for (let i = 0; i < n; i++) {
      if (!c.pioche.length) {
        if (!c.defausse.length) break;
        c.pioche = melanger(c.defausse);
        c.defausse = [];
      }
      c.main.push(c.pioche.pop());
    }
  }

  function degatsCarte(d, c) {
    let n = d.degats || 0;
    if (d.parChaleur) n += d.parChaleur * (c.chaleur || 0);
    let consomme = 0;
    if (d.eclat && c.chaleur >= 3) { n = 16; consomme = 3; }
    if (c.huile) n += c.huile;
    if (c.frisson > 0) n = Math.floor(n * 0.75);
    return { n, consomme };
  }

  function apercu(d) {
    const c = etat.combat;
    if (!c || !d) return '';
    const bits = [];
    if (d.degats) {
      const { n, consomme } = degatsCarte(d, c);
      if (d.tous) bits.push('Infligera ' + n + ' dégâts à tous');
      else bits.push('Infligera ' + n + ' dégâts');
      if (d.parChaleur) bits.push('(+3 par Chaleur, tu en as ' + c.chaleur + ')');
      if (d.eclat) bits.push(c.chaleur >= 3 ? 'Éclat allumé, consomme 3 Chaleur' : 'Il te faut 3 Chaleur pour l\'éclat (tu en as ' + c.chaleur + ')');
      if (c.huile) bits.push('dont +' + c.huile + ' d\'huile');
      if (c.frisson > 0) bits.push('réduit par Frisson');
      if (consomme) bits.push('');
    }
    if (d.garde) bits.push('+' + d.garde + ' garde');
    if (d.chaleur) bits.push('+' + d.chaleur + ' Chaleur');
    if (d.pioche) bits.push('pioche ' + d.pioche);
    if (d.huile) bits.push('prochaine attaque +' + d.huile);
    if (d.resine) bits.push('+1 énergie au prochain tour');
    return bits.filter(Boolean).join(' · ');
  }

  function rendreCombat() {
    const c = etat.combat;
    const ennemis = c.ennemis.map((e) => {
      if (e.pv <= 0) return '';
      const pct = Math.max(0, Math.round(100 * e.pv / e.pvMax));
      const visable = c.sel && def(c.sel).degats && !def(c.sel).tous ? 'visable' : '';
      const int = e.intention || { texte: '…', sorte: 'attaque' };
      return `<div class="ennemi ${visable}" data-ennemi="${e.uid}">
        ${e.bloc > 0 ? `<div class="badge-bloc">${e.bloc}</div>` : ''}
        <div class="intention ${int.sorte}">${int.texte}</div>
        <div class="corps-ennemi corps-${e.picto}"></div>
        <div class="nom-ennemi">${e.nom}</div>
        <div class="barre"><i style="width:${pct}%"></i></div>
        <div class="pv-ligne">${e.pv}/${e.pvMax}</div>
      </div>`;
    }).join('');

    const dSel = c.sel ? def(c.sel) : null;
    const peutJouerSel = dSel && c.energie >= dSel.cout;
    const selfCible = dSel && (dSel.tous || !dSel.degats);
    const cartes = c.main.map((carte) => {
      const d = def(carte);
      const chere = c.energie < d.cout ? 'chere' : '';
      const sel = c.sel && c.sel.uid === carte.uid ? 'sel' : '';
      return htmlCarte(carte, chere + ' ' + sel);
    }).join('');

    const etats = [
      c.bloc ? 'Garde ' + c.bloc : '',
      c.chaleur ? 'Chaleur ' + c.chaleur : '',
      c.huile ? 'Huile +' + c.huile : '',
      c.frisson ? 'Frisson ' + c.frisson : '',
      c.bonusEnergie ? '' : ''
    ].filter(Boolean).join(' · ') || 'Aucune altération';

    ecran().innerHTML = `<div class="ecran-combat">
      <div class="bandeau">
        <div class="jeton"><b>${etat.pv}/${etat.pvMax}</b><span>Solen</span></div>
        <div class="jeton energie"><b>${c.energie}/${c.energieMax}</b><span>Énergie</span></div>
        <div class="jeton chaleur"><b>${c.chaleur}</b><span>Chaleur</span></div>
        <div class="jeton"><b>${c.pioche.length}</b><span>Pioche</span></div>
      </div>
      <div class="zone-ennemis">${ennemis}</div>
      <div class="zone-joueur">
        <div class="joueur ${selfCible && peutJouerSel ? 'visable' : ''}" data-self="1">
          <div class="portrait"></div>
          <div class="info-joueur">
            <div class="nom">Solen, le Porte-flamme</div>
            <div class="etats">${etats}${c.bloc ? '' : ''}</div>
            <div class="barre"><i style="width:${Math.round(100 * etat.pv / etat.pvMax)}%"></i></div>
          </div>
        </div>
      </div>
      <div class="preview">${dSel ? apercu(dSel) : (c.tuto ? 'Touche une carte, puis sa cible.' : '')}</div>
      <div class="main-cartes nombre-${c.main.length}">${cartes}</div>
      <div class="actions-tour">
        <button class="btn-jouer" data-act="jouer" ${peutJouerSel && (selfCible || (dSel && dSel.tous)) ? '' : 'disabled'}>Jouer</button>
        <button class="btn-tour" data-act="fin">Fin du tour</button>
      </div>
    </div>`;

    ecran().onclick = onCombatClic;
  }

  function onCombatClic(ev) {
    if (verrouille || !etat.combat) return;
    Son.init();
    const act = ev.target.closest('[data-act]');
    if (act && act.dataset.act === 'fin') { Son.bip('fin-tour'); finTour(); return; }
    if (act && act.dataset.act === 'jouer') { tenterJouer(null); return; }
    const carteEl = ev.target.closest('.carte');
    if (carteEl && carteEl.dataset.uid) {
      const carte = etat.combat.main.find((c) => c.uid === carteEl.dataset.uid);
      if (!carte) return;
      if (etat.combat.sel && etat.combat.sel.uid === carte.uid) {
        const d = def(carte);
        if (d.tous || !d.degats) tenterJouer(null);
        return;
      }
      etat.combat.sel = carte;
      if (etat.combat.tuto) { etat.combat.tuto = false; meta.tutoVu = true; sauverMeta(); }
      Son.bip('clic');
      rendreCombat();
      return;
    }
    const enn = ev.target.closest('[data-ennemi]');
    if (enn) { tenterJouer(enn.dataset.ennemi); return; }
    if (ev.target.closest('[data-self]')) { tenterJouer(null); return; }
  }

  function tenterJouer(cibleUid) {
    const c = etat.combat;
    if (!c || !c.sel) { Son.bip('erreur'); return; }
    const d = def(c.sel);
    if (c.energie < d.cout) { Son.bip('erreur'); return; }
    if (d.degats && !d.tous && !cibleUid) { Son.bip('erreur'); return; }
    if (!d.degats && cibleUid) {
      // jouer sur soi même si on a touché un ennemi par erreur : on ignore
    }
    jouerCarte(c.sel, cibleUid);
  }

  function jouerCarte(carte, cibleUid) {
    const c = etat.combat;
    const d = def(carte);
    if (c.energie < d.cout) return;
    c.energie -= d.cout;
    const idx = c.main.findIndex((x) => x.uid === carte.uid);
    if (idx >= 0) c.main.splice(idx, 1);
    c.defausse.push(carte);
    c.sel = null;
    if (c.tuto) { c.tuto = false; meta.tutoVu = true; sauverMeta(); }

    Son.bip('jouer');

    if (d.garde) {
      c.bloc += d.garde;
      flotter(d.garde, 'bloc', 0.5, 0.72);
      Son.bip('bloc');
    }
    if (d.chaleur) {
      c.chaleur += d.chaleur;
      flotter('+' + d.chaleur + ' chaleur', 'chaleur', 0.5, 0.68);
      Son.bip('chaleur');
    }
    if (d.huile) c.huile += d.huile;
    if (d.resine) c.bonusEnergie += d.resine;
    if (d.pioche) piocher(d.pioche);

    if (d.degats) {
      const calc = degatsCarte(d, c);
      if (d.eclat && calc.consomme) c.chaleur -= calc.consomme;
      if (c.huile && (d.degats || d.parChaleur || d.eclat)) c.huile = 0;
      const cibles = d.tous ? c.ennemis.filter((e) => e.pv > 0) : [c.ennemis.find((e) => e.uid === cibleUid)].filter(Boolean);
      cibles.forEach((e, i) => setTimeout(() => infliger(e, calc.n), i * 80));
    }

    verrouille = true;
    setTimeout(() => {
      verrouille = false;
      if (!etat.combat) return;
      const vivants = c.ennemis.filter((e) => e.pv > 0);
      if (!vivants.length) { finCombat(true); return; }
      if (etat.pv <= 0) { finCombat(false); return; }
      sauverPartie();
      rendreCombat();
    }, 280);
  }

  function infliger(e, n) {
    if (!e || e.pv <= 0) return;
    let reste = n;
    if (e.bloc > 0) {
      const a = Math.min(e.bloc, reste);
      e.bloc -= a;
      reste -= a;
    }
    if (reste > 0) {
      e.pv = Math.max(0, e.pv - reste);
      secouer();
      Son.bip('degat');
      const el = document.querySelector(`[data-ennemi="${e.uid}"]`);
      if (el) {
        el.classList.add('touche');
        const r = el.getBoundingClientRect();
        const ar = app().getBoundingClientRect();
        flotterAbs(reste, 'degat', r.left - ar.left + r.width / 2, r.top - ar.top + 30);
      }
    } else {
      Son.bip('bloc');
    }
    if (e.pv <= 0) Son.bip('mort');
  }

  function infligerJoueur(n) {
    const c = etat.combat;
    let reste = n;
    if (c.bloc > 0) {
      const a = Math.min(c.bloc, reste);
      c.bloc -= a;
      reste -= a;
      Son.bip('bloc');
    }
    if (reste > 0) {
      etat.pv = Math.max(0, etat.pv - reste);
      secouer();
      Son.bip('degat');
      flotter(reste, 'pv', 0.5, 0.62);
    }
  }

  function finTour() {
    const c = etat.combat;
    if (!c || verrouille) return;
    verrouille = true;
    c.sel = null;
    if (c.frisson > 0) c.frisson -= 1;
    while (c.main.length) c.defausse.push(c.main.pop());
    const vivants = c.ennemis.filter((e) => e.pv > 0);
    let attente = 200;
    vivants.forEach((e, i) => {
      setTimeout(() => agirEnnemi(e), 280 + i * 420);
      attente = 280 + i * 420 + 400;
    });
    setTimeout(() => {
      if (etat.pv <= 0) { verrouille = false; finCombat(false); return; }
      const encore = c.ennemis.filter((x) => x.pv > 0);
      encore.forEach((e) => {
        e.bloc = 0;
        e.intention = ENNEMIS[e.type].intentions(e);
      });
      debutTourJoueur();
      verrouille = false;
      sauverPartie();
      rendreCombat();
    }, attente);
    rendreCombat();
  }

  function agirEnnemi(e) {
    if (!e || e.pv <= 0 || !etat.combat) return;
    const int = e.intention || {};
    if (int.force) e.force += int.force;
    if (int.garde) e.bloc += int.garde;
    if (int.frisson) etat.combat.frisson += int.frisson;
    if (int.rien) return;
    const coups = int.coups || (int.degats ? 1 : 0);
    const dmg = (int.degats || 0) + (e.force || 0);
    for (let i = 0; i < coups; i++) infligerJoueur(dmg);
  }

  function finCombat(gagne) {
    verrouille = false;
    if (!gagne) {
      etat.ecran = 'defaite';
      meta.defaites += 1;
      sauverMeta();
      localStorage.removeItem(CLE_PARTIE);
      Son.bip('defaite');
      montrer();
      return;
    }
    Son.bip('victoire');
    // Adaptation : si tu sors très haut en vie, le prochain combat durcit un peu.
    const ratio = etat.pv / etat.pvMax;
    if (ratio > 0.8) etat.difficulte = Math.min(1.35, (etat.difficulte || 1) + 0.08);
    else if (ratio < 0.35) etat.difficulte = Math.max(0.85, (etat.difficulte || 1) - 0.08);
    etat.or += 16 + Math.floor(alea() * 8);
    if (etat.etage === CHEMIN.length - 1) {
      victoire();
      return;
    }
    etat.ecran = 'recompense';
    etat.choix = tirerOffre(3);
    etat.combat = null;
    sauverPartie();
    montrer();
  }

  function victoire() {
    etat.ecran = 'victoire';
    meta.victoires += 1;
    meta.meilleurEtage = 6;
    // Débloque une carte nouvelle à chaque victoire
    const reste = DEBLOCABLES.filter((id) => !meta.deblocages.includes(id));
    const nouveau = reste.length ? choix(reste) : null;
    if (nouveau) meta.deblocages.push(nouveau);
    etat.debloque = nouveau;
    sauverMeta();
    localStorage.removeItem(CLE_PARTIE);
    montrer();
  }

  function tirerOffre(n) {
    const pool = poolRecompense();
    const ids = melanger(pool).slice(0, n);
    while (ids.length < n) {
      const tout = Object.keys(CARTES);
      ids.push(choix(tout));
    }
    return ids.map((id) => instancier(id));
  }

  /* ---------- Récompense / repos / boutique ---------- */
  function rendreRecompense() {
    const cartes = (etat.choix || []).map((c) => htmlCarte(c, 'offre')).join('');
    ecran().innerHTML = `<div class="ecran-choix">
      <h2 class="titre-ecran">La flamme offre</h2>
      <p class="sous-ecran">Choisis une carte à ajouter à ton jeu, ou passe.</p>
      <div class="choix-cartes">${cartes}</div>
      <div class="pied"><button class="btn fantome" data-act="passer">Passer</button></div>
    </div>`;
    ecran().onclick = (ev) => {
      const passer = ev.target.closest('[data-act="passer"]');
      if (passer) { Son.bip('clic'); avancer(); return; }
      const el = ev.target.closest('.carte');
      if (!el) return;
      const c = (etat.choix || []).find((x) => x.uid === el.dataset.uid);
      if (!c) return;
      Son.bip('jouer');
      etat.deck.push({ uid: uid(), id: c.id });
      avancer();
    };
  }

  function rendreRepos() {
    const soin = Math.min(25, etat.pvMax - etat.pv);
    ecran().innerHTML = `<div class="ecran-choix">
      <h2 class="titre-ecran">Brasero</h2>
      <p class="sous-ecran">Tes pv : ${etat.pv}/${etat.pvMax}. Tu peux reprendre 25 pv, ou affûter le jeu en retirant une carte.</p>
      <div class="pied" style="flex-direction:column;gap:12px">
        <button class="btn primaire" data-act="soin" ${soin <= 0 ? 'disabled' : ''}>Te soigner (+${soin} pv)</button>
        <button class="btn" data-act="retirer">Retirer une carte</button>
        <button class="btn fantome" data-act="partir">Partir</button>
      </div>
      <div id="liste-retrait"></div>
    </div>`;
    ecran().onclick = (ev) => {
      const a = ev.target.closest('[data-act]');
      const carteEl = ev.target.closest('.carte');
      if (carteEl && $('#liste-retrait').contains(carteEl)) {
        const uidC = carteEl.dataset.uid;
        const i = etat.deck.findIndex((c) => c.uid === uidC);
        if (i >= 0 && etat.deck.length > 5) {
          Son.bip('mort');
          etat.deck.splice(i, 1);
          avancer();
        } else Son.bip('erreur');
        return;
      }
      if (!a) return;
      Son.bip('clic');
      if (a.dataset.act === 'soin') {
        const n = Math.min(25, etat.pvMax - etat.pv);
        etat.pv += n;
        Son.bip('soin');
        avancer();
      } else if (a.dataset.act === 'partir') avancer();
      else if (a.dataset.act === 'retirer') {
        $('#liste-retrait').innerHTML = `<p class="sous-ecran">Touche la carte à retirer (il t'en faut au moins 6).</p><div class="paquet-mini">${etat.deck.map((c) => htmlCarte(c)).join('')}</div>`;
      }
    };
  }

  function rendreBoutique() {
    const cartes = (etat.choix || []).map((c) => htmlCarte(c, 'offre')).join('');
    ecran().innerHTML = `<div class="ecran-choix">
      <h2 class="titre-ecran">L'étal du ramendeur</h2>
      <p class="sous-ecran">Tu as ${etat.or} or. Une carte coûte 40 or. Retirer une carte coûte 30 or.</p>
      <div class="choix-cartes">${cartes}</div>
      <div class="pied" style="flex-wrap:wrap">
        <button class="btn" data-act="retirer">Retirer une carte (30)</button>
        <button class="btn fantome" data-act="partir">Partir</button>
      </div>
      <div id="liste-retrait"></div>
    </div>`;
    ecran().onclick = (ev) => {
      const a = ev.target.closest('[data-act]');
      const carteEl = ev.target.closest('.carte');
      if (carteEl && ev.target.closest('.choix-cartes')) {
        if (etat.or < 40) { Son.bip('erreur'); return; }
        const c = (etat.choix || []).find((x) => x.uid === carteEl.dataset.uid);
        if (!c) return;
        etat.or -= 40;
        etat.deck.push({ uid: uid(), id: c.id });
        etat.choix = etat.choix.filter((x) => x.uid !== c.uid);
        Son.bip('jouer');
        rendreBoutique();
        return;
      }
      if (carteEl && $('#liste-retrait') && $('#liste-retrait').contains(carteEl)) {
        if (etat.or < 30 || etat.deck.length <= 5) { Son.bip('erreur'); return; }
        const i = etat.deck.findIndex((c) => c.uid === carteEl.dataset.uid);
        if (i >= 0) {
          etat.or -= 30;
          etat.deck.splice(i, 1);
          Son.bip('mort');
          avancer();
        }
        return;
      }
      if (!a) return;
      Son.bip('clic');
      if (a.dataset.act === 'partir') avancer();
      else if (a.dataset.act === 'retirer') {
        $('#liste-retrait').innerHTML = `<p class="sous-ecran">Touche la carte à retirer.</p><div class="paquet-mini">${etat.deck.map((c) => htmlCarte(c)).join('')}</div>`;
      }
    };
  }

  function rendreFin(ok) {
    const duree = etat && etat.debut ? Math.round((Date.now() - etat.debut) / 60000) : 0;
    const deb = etat && etat.debloque ? CARTES[etat.debloque] : null;
    ecran().innerHTML = `<div class="ecran-fin">
      <div class="braise-deco"></div>
      <h2 class="fin-grand">${ok ? 'La flamme tient' : 'La flamme s\'éteint'}</h2>
      <p class="accroche">${ok
        ? 'Tu as traversé les six chambres. Solen pose la braise au dernier foyer. Elle durera jusqu\'à la prochaine course.'
        : 'La chambre redevient noire. La braise se ranimera. Repars, plus habile.'}</p>
      ${deb ? `<p class="sous-ecran">Carte débloquée pour les prochaines courses : ${deb.nom}.</p>` : ''}
      ${duree ? `<p class="sous-ecran">Course d'environ ${duree} min.</p>` : ''}
      <button class="btn primaire" data-act="menu">Retour</button>
    </div>`;
    ecran().onclick = (ev) => {
      if (!ev.target.closest('[data-act="menu"]')) return;
      Son.bip('clic');
      etat = null;
      montrer();
    };
  }

  /* ---------- Effets visuels ---------- */
  function secouer() {
    app().classList.remove('secoue');
    void app().offsetWidth;
    app().classList.add('secoue');
    setTimeout(() => app().classList.remove('secoue'), 360);
  }
  function flotter(texte, classe, xRel, yRel) {
    const a = app().getBoundingClientRect();
    flotterAbs(texte, classe, a.width * xRel, a.height * yRel);
  }
  function flotterAbs(texte, classe, x, y) {
    const n = document.createElement('div');
    n.className = 'flottant ' + classe;
    n.textContent = (typeof texte === 'number' && texte > 0 && classe !== 'bloc' && classe !== 'soin' && classe !== 'chaleur') ? '−' + texte : texte;
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    $('#fx').appendChild(n);
    setTimeout(() => n.remove(), 950);
  }

  /* ---------- Démarrage ---------- */
  function init() {
    document.addEventListener('pointerdown', () => Son.init(), { once: true });
    etat = null;
    montrer();
  }

  window.braises = {
    nouvelle: nouvellePartie,
    etat: () => etat,
    meta: () => meta,
    montrer,
    _force: (patch) => { Object.assign(etat, patch); sauverPartie(); montrer(); },
    _entrer: entrerNoeud,
    CARTES
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  init();
})();
