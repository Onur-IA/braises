/* Braises V3 : interface. Le moteur de règles est dans moteur.js.
   Ciblage iOS : pointer/touch, bouton ennemi, attaque auto s'il n'y a qu'une cible. */
(() => {
  const M = window.BraisesMoteur;
  const CLE_META = 'braises-meta';
  const CLE_PARTIE = 'braises-partie';
  const $ = (s, r = document) => r.querySelector(s);
  const app = () => $('#app');
  const ecran = () => $('#ecran');

  let etat = null;
  let meta = chargerMeta();
  let verrouille = false;
  let ignoreClic = 0;
  let glisse = null;

  function chargerMeta() {
    try {
      return Object.assign({
        runs: 0, victoires: 0, defaites: 0, meilleurEtage: 0,
        deblocages: [], tutoVu: false, persoPref: 'solen',
        ascensionActive: 0, ascensionMax: 0
      }, JSON.parse(localStorage.getItem(CLE_META) || '{}'));
    } catch (e) {
      return { runs: 0, victoires: 0, defaites: 0, meilleurEtage: 0, deblocages: [], tutoVu: false, persoPref: 'solen', ascensionActive: 0, ascensionMax: 0 };
    }
  }
  function sauverMeta() { localStorage.setItem(CLE_META, JSON.stringify(meta)); }
  function sauverPartie() {
    if (!etat || etat.ecran === 'titre' || etat.ecran === 'victoire' || etat.ecran === 'defaite') {
      localStorage.removeItem(CLE_PARTIE);
      return;
    }
    localStorage.setItem(CLE_PARTIE, JSON.stringify(etat));
  }
  function chargerPartie() {
    try {
      const p = JSON.parse(localStorage.getItem(CLE_PARTIE) || 'null');
      if (p) { p.flags = p.flags || {}; p.ascension = p.ascension || 0; }
      return p;
    } catch (e) { return null; }
  }

  function perso() { return M.PERSOS[etat && etat.perso] || M.PERSOS.solen; }
  function def(c) { return M.defCarte(c); }
  function artPerso(id) { return 'art/' + (id || 'solen') + '.png'; }
  function artEnnemi(picto) { return 'art/' + picto + '.png'; }
  function artRelique(id) { return 'art/relique-' + id + '.png'; }

  function nouvellePartie(persoId) {
    meta.runs += 1;
    meta.persoPref = persoId;
    sauverMeta();
    etat = M.nouvellePartie(persoId, meta, Math.random);
    sauverPartie();
    montrer();
  }

  function intensiteMusique() {
    if (!etat) return 0.4;
    if (etat.ecran === 'combat' && etat.combat) {
      const t = etat.combat.tour || 1;
      return Math.min(0.95, 0.4 + t * 0.08);
    }
    if (etat.ecran === 'victoire') return 0.7;
    return 0.45;
  }

  function montrer() {
    const fx = document.getElementById('fx');
    if (fx) fx.innerHTML = '';
    const e = etat ? etat.ecran : 'titre';
    if (e === 'titre') rendreTitre();
    else if (e === 'carte') rendreCarte();
    else if (e === 'combat') rendreCombat();
    else if (e === 'recompense') rendreRecompense();
    else if (e === 'relique') rendreRelique();
    else if (e === 'repos') rendreRepos();
    else if (e === 'boutique') rendreBoutique();
    else if (e === 'evenement') rendreEvenement();
    else if (e === 'victoire') rendreFin(true);
    else if (e === 'defaite') rendreFin(false);
    boutonMuet();
    Son.musique(sceneMusique(e), intensiteMusique());
  }

  function sceneMusique(e) {
    if (e === 'combat') {
      const n = etat && etat.carte && etat.carte.actuel ? M.trouverNoeud(etat, etat.carte.actuel) : null;
      return (n && n.type === 'boss') ? 'boss' : 'combat';
    }
    if (e === 'victoire') return 'victoire';
    if (e === 'titre' || e === 'defaite') return 'titre';
    return 'chemin';
  }

  function boutonMuet() {
    let b = $('.muet');
    if (!b) {
      b = document.createElement('button');
      b.className = 'muet';
      b.type = 'button';
      b.addEventListener('pointerup', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
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
    return `<button type="button" class="carte ${d.type} ${d.amelioree ? 'plus' : ''} ${extra}" data-uid="${c.uid || ''}" data-id="${d.id}">
      <div class="carte-cout">${d.cout}</div>
      <div class="carte-type">${d.type}${d.amelioree ? ' +' : ''}</div>
      <div class="carte-nom">${d.nom}</div>
      <div class="carte-texte">${d.texte}</div>
    </button>`;
  }

  /* ---------- Titre / choix de perso ---------- */
  function rendreTitre() {
    const partie = chargerPartie();
    const solen = M.PERSOS.solen, fumee = M.PERSOS.fumee;
    ecran().innerHTML = `<div class="ecran-titre">
      <div class="braise-deco" aria-hidden="true"></div>
      <h1 class="logo">Braises</h1>
      <div class="logo-sous">Deux actes, une flamme</div>
      <p class="accroche">Choisis qui portera la braise. Les deux chemins se jouent au doigt, sur six à huit chambres, en une vingtaine de minutes.</p>
      <div class="choix-persos">
        <button type="button" class="carte-perso" data-perso="solen" data-picto="solen">
          <img class="idle" data-picto="solen" src="${artPerso('solen')}" alt="">
          <strong>${solen.nom}</strong>
          <span>${solen.titre}</span>
          <em>Chaleur</em>
        </button>
        <button type="button" class="carte-perso" data-perso="fumee" data-picto="fumee">
          <img class="idle" data-picto="fumee" src="${artPerso('fumee')}" alt="">
          <strong>${fumee.nom}</strong>
          <span>${fumee.titre}</span>
          <em>Fumée</em>
        </button>
      </div>
      <div class="ascension-bloc">
        <div class="ascension-titre">Ascension</div>
        <div class="ascension-paliers">${Array.from({length: 11}, (_, i) => {
        const ouvert = i <= (meta.ascensionMax || 0);
        const actif = i === (meta.ascensionActive || 0);
        return `<button type="button" class="btn-asc ${actif ? 'actif' : ''} ${ouvert ? '' : 'ferme'}" data-asc="${i}" ${ouvert ? '' : 'disabled'} aria-label="Ascension ${i}">${i}</button>`;
      }).join('')}</div>
        <p class="sous-ecran">Palier ${meta.ascensionActive || 0}. ${(meta.ascensionMax || 0) < 10 ? 'Gagne à ce palier pour ouvrir le suivant.' : 'Tous les paliers sont ouverts.'}</p>
      </div>
      ${partie && partie.ecran && partie.ecran !== 'titre' && partie.ecran !== 'victoire' && partie.ecran !== 'defaite'
        ? `<button type="button" class="btn" data-act="continuer">Continuer</button>` : ''}
      <p class="meta-ligne">${meta.runs} course${meta.runs > 1 ? 's' : ''} · ${meta.victoires} victoire${meta.victoires > 1 ? 's' : ''} · meilleur palier ${meta.meilleurEtage}</p>
    </div>`;
    ecran().onclick = (ev) => {
      const asc = ev.target.closest('[data-asc]');
      if (asc && !asc.disabled) {
        Son.init(); Son.bip('clic');
        meta.ascensionActive = parseInt(asc.dataset.asc, 10) || 0;
        sauverMeta(); rendreTitre(); boutonMuet(); return;
      }
      const p = ev.target.closest('[data-perso]');
      if (p) { Son.init(); Son.bip('clic'); nouvellePartie(p.dataset.perso); return; }
      if (ev.target.closest('[data-act="continuer"]')) { Son.init(); Son.bip('clic'); etat = chargerPartie(); montrer(); }
    };
  }

  /* ---------- Carte ramifiée ---------- */
  function rendreCarte() {
    const p = perso();
    const rangs = etat.carte.rangs.map((rang, i) => {
      const noeuds = rang.map((n) => {
        const fait = etat.carte.faits.includes(n.id);
        const ouvert = etat.carte.ouverts.includes(n.id);
        const classe = fait ? 'fait' : (ouvert ? 'ici ouvert' : '');
        const picto = n.type === 'boss' ? 'S' : n.type === 'elite' ? 'E' : n.type === 'repos' ? 'R' : n.type === 'boutique' ? 'B' : n.type === 'evenement' ? '?' : 'X';
        return `<button type="button" class="noeud ${classe}" data-noeud="${n.id}" ${ouvert ? '' : 'disabled'}>
          <div class="noeud-picto">${picto}</div>
          <div><div class="noeud-nom">${n.nom}</div><div class="noeud-desc">${n.desc}</div></div>
        </button>`;
      }).join('');
      const acte = rang[0] && rang[0].acte === 2 && (i === 4) ? `<div class="acte-label">Acte 2</div>` : (i === 0 ? `<div class="acte-label">Acte 1</div>` : '');
      return `${acte}<div class="rang">${noeuds}</div>`;
    }).join('');
    const rels = (etat.reliques || []).map((r) => {
      const d = M.RELIQUES[r.id || r];
      return `<img class="mini-relique" src="${artRelique(r.id || r)}" alt="${d ? d.nom : ''}" title="${d ? d.nom : ''}">`;
    }).join('');
    ecran().innerHTML = `<div class="ecran-carte">
      <h2 class="titre-ecran">Le chemin</h2>
      <p class="sous-ecran">${p.nom} · ${etat.pv}/${etat.pvMax} pv · ${etat.or} or · ${etat.deck.length} cartes${etat.ascension ? ' · A' + etat.ascension : ''}</p>
      <div class="reliques-ligne">${rels}</div>
      <div class="chemin-rangs">${rangs}</div>
    </div>`;
    ecran().onclick = (ev) => {
      const n = ev.target.closest('[data-noeud]');
      if (!n || n.disabled) return;
      Son.init(); Son.bip('clic');
      const r = M.entrerNoeud(etat, n.dataset.noeud, Math.random, meta);
      if (r && r.ok) { sauverPartie(); montrer(); }
    };
  }

  /* ---------- Combat (saisie iOS-safe) ---------- */
  function rendreCombat() {
    const c = etat.combat;
    const p = perso();
    const resNom = p.ressource === 'fumee' ? 'Fumée' : 'Chaleur';
    const resVal = p.ressource === 'fumee' ? c.fumee : c.chaleur;
    const ennemis = c.ennemis.map((e) => {
      if (e.pv <= 0) return '';
      const pct = Math.max(0, Math.round(100 * e.pv / e.pvMax));
      const visable = c.sel && def(c.sel).degats && !def(c.sel).tous ? 'visable' : '';
      const int = e.intention || { texte: '…', sorte: 'attaque' };
      const btnAtk = (c.sel && def(c.sel).degats && !def(c.sel).tous && c.energie >= def(c.sel).cout)
        ? `<span class="btn-attaquer" data-ennemi="${e.uid}">Attaquer</span>` : '';
      return `<button type="button" class="ennemi ${visable}" data-ennemi="${e.uid}" data-picto="${e.picto}">
        ${e.bloc > 0 ? `<div class="badge-bloc">${e.bloc}</div>` : ''}
        <div class="intention ${int.sorte}">${int.texte}</div>
        <img class="portrait-ennemi idle" data-picto="${e.picto}" src="${artEnnemi(e.picto)}" alt="">
        <div class="nom-ennemi">${e.nom}</div>
        <div class="barre"><i style="width:${pct}%"></i></div>
        <div class="pv-ligne">${e.pv}/${e.pvMax}</div>
        ${btnAtk}
      </button>`;
    }).join('');

    const dSel = c.sel ? def(c.sel) : null;
    const peutJouerSel = dSel && c.energie >= dSel.cout;
    const selfCible = dSel && (dSel.tous || !dSel.degats);
    const vivants = c.ennemis.filter((e) => e.pv > 0);
    const attaqueCiblable = !!(dSel && dSel.degats && !dSel.tous);
    const jouerOk = peutJouerSel && (selfCible || (dSel && dSel.tous) || (attaqueCiblable && vivants.length === 1));
    const cartes = c.main.map((carte) => {
      const d = def(carte);
      const chere = c.energie < d.cout ? 'chere' : '';
      const sel = c.sel && c.sel.uid === carte.uid ? 'sel' : '';
      const syn = (d.eclat && c.chaleur >= 3) || (d.etouffe && c.fumee >= 2) || (d.parChaleur && c.chaleur) || (d.parFumee2 && c.fumee >= 2) ? 'synergie' : '';
      return htmlCarte(carte, (chere + ' ' + sel + ' ' + syn).trim());
    }).join('');

    const etats = [
      c.bloc ? 'Garde ' + c.bloc : '',
      c.chaleur ? 'Chaleur ' + c.chaleur : '',
      c.fumee ? 'Fumée ' + c.fumee : '',
      c.huile ? 'Huile +' + c.huile : '',
      c.frisson ? 'Frisson ' + c.frisson : ''
    ].filter(Boolean).join(' · ') || 'Aucune altération';

    ecran().innerHTML = `<div class="ecran-combat">
      <div class="bandeau">
        <div class="jeton"><b>${etat.pv}/${etat.pvMax}</b><span>${p.nom}</span></div>
        <div class="jeton energie"><b>${c.energie}/${c.energieMax}</b><span>Énergie</span></div>
        <div class="jeton chaleur"><b>${resVal}</b><span>${resNom}</span></div>
        <div class="jeton"><b>${c.pioche.length}</b><span>Pioche</span></div>
      </div>
      <div class="zone-ennemis" data-zone-ennemis="1">${ennemis}</div>
      <div class="zone-joueur">
        <div class="joueur ${selfCible && peutJouerSel ? 'visable' : ''}" data-self="1">
          <img class="portrait idle" data-picto="${p.id}" src="${artPerso(p.id)}" alt="">
          <div class="info-joueur">
            <div class="nom">${p.nom}, ${p.titre}</div>
            <div class="etats">${etats}</div>
            <div class="barre"><i style="width:${Math.round(100 * etat.pv / etat.pvMax)}%"></i></div>
          </div>
        </div>
      </div>
      <div class="preview">${dSel ? M.apercu(etat, dSel) : (c.tuto ? 'Touche une carte. S\'il n\'y a qu\'un ennemi, l\'attaque part ; sinon touche ensuite l\'ennemi.' : '')}</div>
      <div class="main-cartes nombre-${c.main.length}">${cartes}</div>
      <div class="actions-tour">
        <button type="button" class="btn-jouer" data-act="jouer" ${jouerOk ? '' : 'disabled'}>${attaqueCiblable && vivants.length === 1 ? 'Attaquer' : 'Jouer'}</button>
        <button type="button" class="btn-tour" data-act="fin">Fin du tour</button>
      </div>
    </div>`;
    lierCombat();
    if (c.tour >= 2) Son.musique('combat', intensiteMusique());
  }

  function elementSous(ev) {
    let x, y;
    if (ev.changedTouches && ev.changedTouches[0]) {
      x = ev.changedTouches[0].clientX; y = ev.changedTouches[0].clientY;
    } else if (ev.touches && ev.touches[0]) {
      x = ev.touches[0].clientX; y = ev.touches[0].clientY;
    } else { x = ev.clientX; y = ev.clientY; }
    if (x == null || y == null) return ev.target;
    return document.elementFromPoint(x, y) || ev.target;
  }

  function lierCombat() {
    const el = ecran();
    el.onclick = null;
    el.onpointerdown = onCombatDown;
    el.onpointerup = onCombatUp;
    el.ontouchend = onCombatTouch;
    el.onclick = onCombatClic;
  }

  function onCombatDown(ev) {
    if (verrouille || !etat.combat) return;
    const sous = elementSous(ev);
    const carteEl = sous && sous.closest ? sous.closest('.carte') : null;
    if (carteEl && carteEl.dataset.uid) glisse = { uid: carteEl.dataset.uid, x: ev.clientX, y: ev.clientY };
    else glisse = null;
  }

  function onCombatUp(ev) {
    if (verrouille || !etat.combat) return;
    if (glisse) {
      const sous = elementSous(ev);
      const enn = sous && sous.closest ? sous.closest('[data-ennemi]') : null;
      const dx = (ev.clientX || 0) - glisse.x, dy = (ev.clientY || 0) - glisse.y;
      if (enn && Math.hypot(dx, dy) > 20) {
        const carte = etat.combat.main.find((c) => c.uid === glisse.uid);
        glisse = null; ignoreClic = Date.now();
        if (carte) { etat.combat.sel = carte; tenterJouer(enn.dataset.ennemi); }
        return;
      }
    }
    glisse = null;
    if (ev.pointerType === 'touch' || ev.pointerType === 'pen' || ev.pointerType === 'mouse') {
      ignoreClic = Date.now();
      onCombatPointeur(ev);
    }
  }

  function onCombatTouch(ev) {
    if (verrouille || !etat.combat) return;
    if (Date.now() - ignoreClic < 450) return;
    ignoreClic = Date.now();
    onCombatPointeur(ev);
  }

  function onCombatClic(ev) {
    if (verrouille || !etat.combat) return;
    if (Date.now() - ignoreClic < 450) { ev.preventDefault(); ev.stopPropagation(); return; }
    onCombatPointeur(ev);
  }

  function onCombatPointeur(ev) {
    if (verrouille || !etat.combat) return;
    Son.init();
    const sous = elementSous(ev);
    if (!sous || !sous.closest) return;
    const act = sous.closest('[data-act]');
    if (act && act.dataset.act === 'fin') { Son.bip('fin-tour'); finTourJoueur(); return; }
    if (act && act.dataset.act === 'jouer') { tenterJouer(null); return; }
    const enn = sous.closest('[data-ennemi]');
    if (enn && enn.dataset.ennemi) { tenterJouer(enn.dataset.ennemi); return; }
    const carteEl = sous.closest('.carte');
    if (carteEl && carteEl.dataset.uid) {
      const carte = etat.combat.main.find((c) => c.uid === carteEl.dataset.uid);
      if (!carte) return;
      const d = def(carte);
      const deja = etat.combat.sel && etat.combat.sel.uid === carte.uid;
      const vivants = etat.combat.ennemis.filter((e) => e.pv > 0);
      if (deja) { tenterJouer(null); return; }
      etat.combat.sel = carte;
      if (etat.combat.tuto) { etat.combat.tuto = false; meta.tutoVu = true; sauverMeta(); }
      if (d.degats && !d.tous && vivants.length === 1 && etat.combat.energie >= d.cout) {
        Son.bip('clic'); tenterJouer(vivants[0].uid); return;
      }
      Son.bip('clic'); rendreCombat(); return;
    }
    if (sous.closest('[data-self]')) { tenterJouer(null); return; }
    if (sous.closest('[data-zone-ennemis]')) {
      const vivants = etat.combat.ennemis.filter((e) => e.pv > 0);
      if (etat.combat.sel && def(etat.combat.sel).degats && vivants.length === 1) tenterJouer(vivants[0].uid);
    }
  }

  function tenterJouer(cibleUid) {
    const c = etat.combat;
    if (!c || !c.sel) { Son.bip('erreur'); return; }
    const d = def(c.sel);
    if (c.energie < d.cout) { Son.bip('erreur'); return; }
    if (d.degats && !d.tous && !cibleUid) {
      const vivants = c.ennemis.filter((e) => e.pv > 0);
      if (vivants.length === 1) cibleUid = vivants[0].uid;
      else { Son.bip('erreur'); return; }
    }
    jouerCarteUI(c.sel, cibleUid);
  }

  function jouerCarteUI(carte, cibleUid) {
    const evs = M.jouerCarte(etat, carte.uid, cibleUid, Math.random);
    if (!evs || !evs.ok) { Son.bip('erreur'); return; }
    Son.bip('jouer');
    if (evs.garde) { flotter(evs.garde, 'bloc', 0.5, 0.72); Son.bip('bloc'); }
    if (evs.chaleur > 0) { flotter('+' + evs.chaleur + ' chaleur', 'chaleur', 0.5, 0.68); Son.bip('chaleur'); }
    if (evs.fumee > 0) { flotter('+' + evs.fumee + ' fumée', 'chaleur', 0.55, 0.66); Son.bip('chaleur'); }
    evs.hits.forEach((h, i) => {
      setTimeout(() => {
        const el = document.querySelector(`[data-ennemi="${h.uid}"]`);
        if (el) {
          el.classList.add('touche');
          const r = el.getBoundingClientRect(), ar = app().getBoundingClientRect();
          if (h.pv > 0) {
            flotterAbs(h.pv, 'degat', r.left - ar.left + r.width / 2, r.top - ar.top + 36);
            secouer(); Son.bip('degat'); etincelles(r.left - ar.left + r.width / 2, r.top - ar.top + 40, 10);
          } else Son.bip('bloc');
          if (h.mort) { el.classList.add('meurt'); Son.bip('mort'); }
        }
      }, i * 70);
    });
    verrouille = true;
    setTimeout(() => {
      verrouille = false;
      if (!etat.combat) return;
      if (evs.victoire) { terminerCombat(true); return; }
      if (etat.pv <= 0) { terminerCombat(false); return; }
      sauverPartie(); rendreCombat();
    }, 300);
  }

  function finTourJoueur() {
    if (!etat.combat || verrouille) return;
    verrouille = true;
    const evs = M.finTour(etat, Math.random);
    if (evs.linceul) flotter(evs.linceul, 'bloc', 0.5, 0.7);
    let delay = 200;
    (evs.ennemis || []).forEach((en, i) => {
      setTimeout(() => {
        (en.act.hits || []).forEach((h) => {
          if (h.pv > 0) { secouer(); Son.bip('degat'); flotter(h.pv, 'pv', 0.5, 0.62); }
          else if (h.bloque) Son.bip('bloc');
        });
      }, 280 + i * 400);
      delay = 280 + i * 400 + 380;
    });
    setTimeout(() => {
      verrouille = false;
      if (evs.joueurMort || etat.pv <= 0) { terminerCombat(false); return; }
      if (evs.victoire) { terminerCombat(true); return; }
      sauverPartie(); rendreCombat();
    }, delay);
  }

  function terminerCombat(gagne) {
    verrouille = false;
    const r = M.finCombat(etat, gagne, Math.random, meta);
    if (r.fin === 'defaite') {
      meta.defaites += 1; sauverMeta(); localStorage.removeItem(CLE_PARTIE);
      if (Son.stinger) Son.stinger('defaite'); else Son.bip('defaite');
      montrer(); return;
    }
    if (r.fin === 'victoire') {
      meta.victoires += 1;
      meta.meilleurEtage = Math.max(meta.meilleurEtage, etat.etage || 8);
      const a = etat.ascension || 0;
      if (a >= (meta.ascensionMax || 0) && a < 10) meta.ascensionMax = a + 1;
      const reste = [].concat(M.DEBLOCABLES[etat.perso] || [], M.DEBLOCABLES.commun || []).filter((id) => !meta.deblocages.includes(id));
      etat.debloque = reste.length ? M.choix(reste, Math.random) : null;
      if (etat.debloque) meta.deblocages.push(etat.debloque);
      sauverMeta(); localStorage.removeItem(CLE_PARTIE);
      if (Son.stinger) Son.stinger('victoire'); else Son.bip('victoire');
      montrer(); return;
    }
    if (Son.stinger) Son.stinger('victoire'); else Son.bip('victoire');
    sauverPartie(); montrer();
  }


  function rendreEvenement() {
    const ev = etat.evenement || M.EVENEMENTS.chien_errant;
    const choix = (ev.choix || []).map((c) =>
      `<button type="button" class="btn" data-choix="${c.id}">${c.label}</button>`
    ).join('');
    ecran().innerHTML = `<div class="ecran-choix ecran-evenement">
      <h2 class="titre-ecran">${ev.nom}</h2>
      <p class="accroche">${ev.texte}</p>
      <div class="pied" style="flex-direction:column;gap:12px">${choix}</div>
    </div>`;
    ecran().onclick = (evnt) => {
      const b = evnt.target.closest('[data-choix]');
      if (!b) return;
      Son.bip('clic');
      const r = M.appliquerEvenement(etat, ev.id, b.dataset.choix, Math.random, meta);
      const suite = (r && r.suite) || (etat.dernierChoix && etat.dernierChoix.suite) || '';
      ecran().innerHTML = `<div class="ecran-choix ecran-evenement">
        <h2 class="titre-ecran">${ev.nom}</h2>
        <p class="accroche">${suite}</p>
        <div class="pied"><button type="button" class="btn primaire" data-act="continuer-ev">Continuer</button></div>
      </div>`;
      ecran().onclick = (e2) => {
        if (!e2.target.closest('[data-act="continuer-ev"]')) return;
        Son.bip('clic');
        etat.evenement = null;
        apresChoix();
      };
    };
  }

  /* ---------- Récompense, relique, repos, boutique ---------- */
  function rendreRecompense() {
    const cartes = (etat.choix || []).map((c) => htmlCarte(c, 'offre')).join('');
    ecran().innerHTML = `<div class="ecran-choix">
      <h2 class="titre-ecran">La flamme offre</h2>
      <p class="sous-ecran">Choisis une carte à ajouter à ton jeu, ou passe.</p>
      <div class="choix-cartes">${cartes}</div>
      <div class="pied"><button type="button" class="btn fantome" data-act="passer">Passer</button></div>
    </div>`;
    ecran().onclick = (ev) => {
      if (ev.target.closest('[data-act="passer"]')) { Son.bip('clic'); apresChoix(); return; }
      const el = ev.target.closest('.carte');
      if (!el) return;
      const c = (etat.choix || []).find((x) => x.uid === el.dataset.uid);
      if (!c) return;
      Son.bip('jouer'); M.ajouterCarte(etat, c.id, Math.random, false); apresChoix();
    };
  }

  function rendreRelique() {
    const offre = (etat.choixReliques || []).map((r) => {
      const d = M.RELIQUES[r.id];
      return `<button type="button" class="carte-relique" data-relique="${r.id}">
        <img src="${artRelique(r.id)}" alt="">
        <strong>${d ? d.nom : r.id}</strong>
        <span>${d ? d.texte : ''}</span>
      </button>`;
    }).join('');
    ecran().innerHTML = `<div class="ecran-choix">
      <h2 class="titre-ecran">Une relique</h2>
      <p class="sous-ecran">Choisis un objet. Il t'accompagne jusqu'à la fin de la course.</p>
      <div class="choix-reliques">${offre}</div>
      <div class="pied"><button type="button" class="btn fantome" data-act="passer">Laisser</button></div>
    </div>`;
    ecran().onclick = (ev) => {
      const r = ev.target.closest('[data-relique]');
      if (r) { Son.bip('jouer'); M.donnerRelique(etat, r.dataset.relique); if (Son.stinger) Son.stinger('relique'); }
      else if (!ev.target.closest('[data-act="passer"]')) return;
      else Son.bip('clic');
      etat.choixReliques = null;
      if (etat.choix && etat.choix.length) { etat.ecran = 'recompense'; sauverPartie(); montrer(); }
      else apresChoix();
    };
  }

  function rendreRepos() {
    const soin = M.soinRepos(etat);
    ecran().innerHTML = `<div class="ecran-choix">
      <h2 class="titre-ecran">Brasero</h2>
      <p class="sous-ecran">Tes pv : ${etat.pv}/${etat.pvMax}. Tu peux te soigner, affûter une carte, ou en retirer une.</p>
      <div class="pied" style="flex-direction:column;gap:12px">
        <button type="button" class="btn primaire" data-act="soin" ${soin <= 0 ? 'disabled' : ''}>Te soigner (+${soin} pv)</button>
        <button type="button" class="btn" data-act="affuter">Affûter une carte</button>
        <button type="button" class="btn" data-act="retirer">Retirer une carte</button>
        <button type="button" class="btn fantome" data-act="partir">Partir</button>
      </div>
      <div id="liste-retrait"></div>
    </div>`;
    ecran().onclick = (ev) => {
      const liste = $('#liste-retrait');
      const carteEl = ev.target.closest('.carte');
      if (carteEl && liste && liste.contains(carteEl)) {
        if (liste.dataset.mode === 'affuter') {
          if (M.ameliorerCarte(etat, carteEl.dataset.uid)) { Son.bip('jouer'); apresChoix(); }
          else Son.bip('erreur');
        } else {
          if (M.retirerCarte(etat, carteEl.dataset.uid)) { Son.bip('mort'); apresChoix(); }
          else Son.bip('erreur');
        }
        return;
      }
      const a = ev.target.closest('[data-act]');
      if (!a) return;
      Son.bip('clic');
      if (a.dataset.act === 'soin') { M.soigner(etat, M.soinRepos(etat) || 24); Son.bip('soin'); apresChoix(); }
      else if (a.dataset.act === 'partir') apresChoix();
      else if (a.dataset.act === 'affuter') {
        const dispo = etat.deck.filter((c) => !c.plus && M.CARTES[c.id] && M.CARTES[c.id].plus);
        liste.dataset.mode = 'affuter';
        liste.innerHTML = `<p class="sous-ecran">Touche la carte à affûter.</p><div class="paquet-mini">${dispo.map((c) => htmlCarte(c)).join('') || 'Aucune carte à affûter.'}</div>`;
      } else if (a.dataset.act === 'retirer') {
        liste.dataset.mode = 'retirer';
        liste.innerHTML = `<p class="sous-ecran">Touche la carte à retirer (il t'en faut au moins 6).</p><div class="paquet-mini">${etat.deck.map((c) => htmlCarte(c)).join('')}</div>`;
      }
    };
  }

  function rendreBoutique() {
    const pCar = M.prixCarte(etat), pRel = M.prixRelique(etat), pRet = M.prixRetrait(etat);
    const cartes = (etat.choix || []).map((c) => htmlCarte(c, 'offre')).join('');
    const rel = (etat.choixReliques || []).map((r) => {
      const d = M.RELIQUES[r.id];
      return `<button type="button" class="carte-relique" data-acheter-relique="${r.id}">
        <img src="${artRelique(r.id)}" alt="">
        <strong>${d ? d.nom : r.id}</strong>
        <span>${pRel} or — ${d ? d.texte : ''}</span>
      </button>`;
    }).join('');
    ecran().innerHTML = `<div class="ecran-choix">
      <h2 class="titre-ecran">L'étal du ramendeur</h2>
      <p class="sous-ecran">Tu as ${etat.or} or. Une carte coûte ${pCar} or. Retirer une carte coûte ${pRet} or.</p>
      <div class="choix-cartes">${cartes}</div>
      ${rel ? `<div class="choix-reliques">${rel}</div>` : ''}
      <div class="pied" style="flex-wrap:wrap">
        <button type="button" class="btn" data-act="retirer">Retirer une carte (${pRet})</button>
        <button type="button" class="btn fantome" data-act="partir">Partir</button>
      </div>
      <div id="liste-retrait"></div>
    </div>`;
    ecran().onclick = (ev) => {
      const relEl = ev.target.closest('[data-acheter-relique]');
      if (relEl) {
        if (etat.or < pRel) { Son.bip('erreur'); return; }
        etat.or -= pRel; M.donnerRelique(etat, relEl.dataset.acheterRelique);
        etat.choixReliques = []; Son.bip('jouer'); Son.stinger && Son.stinger('relique'); sauverPartie(); rendreBoutique(); return;
      }
      const carteEl = ev.target.closest('.carte');
      if (carteEl && ev.target.closest('.choix-cartes')) {
        if (etat.or < pCar) { Son.bip('erreur'); return; }
        const c = (etat.choix || []).find((x) => x.uid === carteEl.dataset.uid);
        if (!c) return;
        etat.or -= pCar; M.ajouterCarte(etat, c.id, Math.random, false);
        etat.choix = etat.choix.filter((x) => x.uid !== c.uid);
        Son.bip('jouer'); sauverPartie(); rendreBoutique(); return;
      }
      if (carteEl && $('#liste-retrait') && $('#liste-retrait').contains(carteEl)) {
        if (etat.or < pRet || etat.deck.length <= 5) { Son.bip('erreur'); return; }
        if (M.retirerCarte(etat, carteEl.dataset.uid)) { etat.or -= pRet; Son.bip('mort'); apresChoix(); }
        return;
      }
      const a = ev.target.closest('[data-act]');
      if (!a) return;
      Son.bip('clic');
      if (a.dataset.act === 'partir') apresChoix();
      else if (a.dataset.act === 'retirer') {
        $('#liste-retrait').innerHTML = `<p class="sous-ecran">Touche la carte à retirer.</p><div class="paquet-mini">${etat.deck.map((c) => htmlCarte(c)).join('')}</div>`;
      }
    };
  }

  function apresChoix() {
    etat.choix = null;
    M.marquerNoeudFait(etat);
    if (etat.etage) meta.meilleurEtage = Math.max(meta.meilleurEtage, etat.etage);
    sauverMeta(); sauverPartie(); montrer();
  }

  function rendreFin(ok) {
    const p = perso();
    const duree = etat && etat.debut ? Math.round((Date.now() - etat.debut) / 60000) : 0;
    const deb = etat && etat.debloque ? M.CARTES[etat.debloque] : null;
    ecran().innerHTML = `<div class="ecran-fin">
      <img class="portrait-fin" src="${artPerso(p.id)}" alt="">
      <h2 class="fin-grand">${ok ? 'La flamme tient' : 'La flamme s\'éteint'}</h2>
      <p class="accroche">${ok
        ? (p.id === 'fumee'
          ? 'Tu as traversé les deux actes. Le voile se pose sur le dernier foyer, et la braise dure.'
          : 'Tu as traversé les deux actes. Solen pose la braise au dernier foyer. Elle durera jusqu\'à la prochaine course.')
        : 'La chambre redevient noire. La braise se ranimera. Repars, plus habile.'}</p>
      ${deb ? `<p class="sous-ecran">Carte débloquée pour les prochaines courses : ${deb.nom}.</p>` : ''}
      ${typeof (etat && etat.ascension) === 'number' ? `<p class="sous-ecran">Ascension ${etat.ascension}. ${ok && (etat.ascension || 0) < 10 && (meta.ascensionMax || 0) > (etat.ascension || 0) ? 'Le palier suivant est ouvert.' : ''}</p>` : ''}
      ${duree ? `<p class="sous-ecran">Course d'environ ${duree} min.</p>` : ''}
      <button type="button" class="btn primaire" data-act="menu">Retour</button>
    </div>`;
    ecran().onclick = (ev) => {
      if (!ev.target.closest('[data-act="menu"]')) return;
      Son.bip('clic'); etat = null; montrer();
    };
  }

  /* ---------- Effets ---------- */
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
    n.style.left = x + 'px'; n.style.top = y + 'px';
    $('#fx').appendChild(n);
    setTimeout(() => n.remove(), 950);
  }
  function etincelles(x, y, n) {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'particule';
      const a = Math.random() * Math.PI * 2, d = 16 + Math.random() * 36;
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px');
      p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      $('#fx').appendChild(p);
      setTimeout(() => p.remove(), 520);
    }
  }

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
    CARTES: M.CARTES,
    M
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  init();
})();
