/* Braises V2 : moteur de règles, utilisable dans le navigateur et dans Node.
   Jeu original : aucune carte, nom, visuel ou règle copiés d'un autre jeu. */
(function (racine) {
  const CARTES = {
    /* Solen, départ */
    etincelle: { id: 'etincelle', nom: 'Étincelle', type: 'attaque', cout: 1, perso: 'solen', starter: true, texte: 'Inflige 6 dégâts.', degats: 6, plus: { degats: 9, texte: 'Inflige 9 dégâts.' } },
    cendre: { id: 'cendre', nom: 'Cendre', type: 'garde', cout: 1, perso: 'solen', starter: true, texte: 'Gagne 6 de garde.', garde: 6, plus: { garde: 9, texte: 'Gagne 9 de garde.' } },
    soufflet: { id: 'soufflet', nom: 'Soufflet', type: 'art', cout: 1, perso: 'solen', starter: true, texte: 'Gagne 2 Chaleur.', chaleur: 2, plus: { chaleur: 3, texte: 'Gagne 3 Chaleur.' } },
    tisons: { id: 'tisons', nom: 'Tisons', type: 'attaque', cout: 1, perso: 'solen', starter: true, texte: 'Inflige 4 dégâts. Gagne 4 de garde.', degats: 4, garde: 4, plus: { degats: 6, garde: 6, texte: 'Inflige 6 dégâts. Gagne 6 de garde.' } },
    /* Solen, récompenses */
    trait: { id: 'trait', nom: 'Trait de feu', type: 'attaque', cout: 2, perso: 'solen', texte: 'Inflige 13 dégâts.', degats: 13, plus: { degats: 17, texte: 'Inflige 17 dégâts.' } },
    braisevive: { id: 'braisevive', nom: 'Braise vive', type: 'attaque', cout: 1, perso: 'solen', texte: 'Inflige 5 dégâts, plus 3 par Chaleur.', degats: 5, parChaleur: 3, plus: { degats: 6, parChaleur: 4, texte: 'Inflige 6 dégâts, plus 4 par Chaleur.' } },
    souffle: { id: 'souffle', nom: 'Souffle ardent', type: 'attaque', cout: 2, perso: 'solen', texte: 'Inflige 8 dégâts. Gagne 2 Chaleur.', degats: 8, chaleur: 2, plus: { degats: 10, chaleur: 2, texte: 'Inflige 10 dégâts. Gagne 2 Chaleur.' } },
    eclat: { id: 'eclat', nom: 'Éclat', type: 'attaque', cout: 2, perso: 'solen', texte: 'Inflige 7 dégâts. Si tu as au moins 3 Chaleur, inflige 16 et consomme 3 Chaleur.', degats: 7, eclat: true, plus: { degats: 9, eclatSeuil: 3, eclatDegats: 20, texte: 'Inflige 9 dégâts. Si tu as au moins 3 Chaleur, inflige 20 et consomme 3 Chaleur.' } },
    encens: { id: 'encens', nom: 'Encens', type: 'garde', cout: 0, perso: 'solen', texte: 'Gagne 3 de garde et 1 Chaleur.', garde: 3, chaleur: 1, plus: { garde: 5, chaleur: 1, texte: 'Gagne 5 de garde et 1 Chaleur.' } },
    huile: { id: 'huile', nom: 'Huile', type: 'art', cout: 1, perso: 'solen', texte: 'La prochaine attaque inflige 6 dégâts de plus.', huile: 6, plus: { huile: 9, texte: 'La prochaine attaque inflige 9 dégâts de plus.' } },
    /* Fumée, départ */
    haleine: { id: 'haleine', nom: 'Haleine', type: 'attaque', cout: 1, perso: 'fumee', starter: true, texte: 'Inflige 6 dégâts.', degats: 6, plus: { degats: 9, texte: 'Inflige 9 dégâts.' } },
    ecran: { id: 'ecran', nom: 'Écran', type: 'garde', cout: 1, perso: 'fumee', starter: true, texte: 'Gagne 6 de garde.', garde: 6, plus: { garde: 9, texte: 'Gagne 9 de garde.' } },
    fumerolle: { id: 'fumerolle', nom: 'Fumerolle', type: 'art', cout: 1, perso: 'fumee', starter: true, texte: 'Gagne 2 Fumée.', fumee: 2, plus: { fumee: 3, texte: 'Gagne 3 Fumée.' } },
    voilecourt: { id: 'voilecourt', nom: 'Voile court', type: 'garde', cout: 1, perso: 'fumee', starter: true, texte: 'Gagne 4 de garde et 1 Fumée.', garde: 4, fumee: 1, plus: { garde: 6, fumee: 1, texte: 'Gagne 6 de garde et 1 Fumée.' } },
    /* Fumée, récompenses */
    etouffement: { id: 'etouffement', nom: 'Étouffement', type: 'attaque', cout: 2, perso: 'fumee', texte: 'Inflige 7 dégâts et 1 Frisson. Si tu as au moins 2 Fumée, inflige 12, 2 Frisson, et consomme 2 Fumée.', degats: 7, frissonDonne: 1, etouffe: true, plus: { degats: 9, etouffeDegats: 15, texte: 'Inflige 9 dégâts et 1 Frisson. Si tu as au moins 2 Fumée, inflige 15, 2 Frisson, et consomme 2 Fumée.' } },
    nuage: { id: 'nuage', nom: 'Nuage', type: 'attaque', cout: 1, perso: 'fumee', texte: 'Inflige 4 dégâts à tous les ennemis. Gagne 1 Fumée.', degats: 4, tous: true, fumee: 1, plus: { degats: 6, fumee: 1, texte: 'Inflige 6 dégâts à tous les ennemis. Gagne 1 Fumée.' } },
    disparition: { id: 'disparition', nom: 'Disparition', type: 'garde', cout: 1, perso: 'fumee', texte: 'Gagne 8 de garde. Si tu as au moins 2 Fumée, consomme 2 et pioche 2 cartes.', garde: 8, disparait: true, plus: { garde: 11, texte: 'Gagne 11 de garde. Si tu as au moins 2 Fumée, consomme 2 et pioche 2 cartes.' } },
    suie: { id: 'suie', nom: 'Suie', type: 'art', cout: 0, perso: 'fumee', texte: 'Gagne 2 Fumée.', fumee: 2, plus: { fumee: 3, texte: 'Gagne 3 Fumée.' } },
    emprise: { id: 'emprise', nom: 'Emprise', type: 'attaque', cout: 1, perso: 'fumee', texte: 'Inflige 6 dégâts, plus 3 par 2 Fumée.', degats: 6, parFumee2: 3, plus: { degats: 7, parFumee2: 4, texte: 'Inflige 7 dégâts, plus 4 par 2 Fumée.' } },
    courant: { id: 'courant', nom: 'Courant d\'air', type: 'art', cout: 1, perso: 'fumee', texte: 'Pioche 2 cartes. Gagne 1 Fumée.', pioche: 2, fumee: 1, plus: { pioche: 2, fumee: 2, texte: 'Pioche 2 cartes. Gagne 2 Fumée.' } },
    /* Communes */
    gerbe: { id: 'gerbe', nom: 'Gerbe', type: 'attaque', cout: 1, perso: 'commun', texte: 'Inflige 4 dégâts à tous les ennemis.', degats: 4, tous: true, plus: { degats: 6, texte: 'Inflige 6 dégâts à tous les ennemis.' } },
    mur: { id: 'mur', nom: 'Mur de cendres', type: 'garde', cout: 2, perso: 'commun', texte: 'Gagne 12 de garde.', garde: 12, plus: { garde: 16, texte: 'Gagne 16 de garde.' } },
    voile: { id: 'voile', nom: 'Voile de fumée', type: 'garde', cout: 1, perso: 'commun', texte: 'Gagne 5 de garde. Pioche 1 carte.', garde: 5, pioche: 1, plus: { garde: 8, pioche: 1, texte: 'Gagne 8 de garde. Pioche 1 carte.' } },
    flamme: { id: 'flamme', nom: 'Flamme double', type: 'art', cout: 1, perso: 'commun', texte: 'Pioche 2 cartes.', pioche: 2, plus: { pioche: 2, garde: 3, texte: 'Pioche 2 cartes. Gagne 3 de garde.' } },
    resine: { id: 'resine', nom: 'Résine', type: 'art', cout: 0, perso: 'commun', texte: 'Au prochain tour, gagne 1 énergie de plus.', resine: 1, plus: { resine: 1, garde: 3, texte: 'Au prochain tour, gagne 1 énergie de plus et 3 de garde tout de suite.' } }
  };

  const DEBLOCABLES = {
    solen: ['eclat', 'huile'],
    fumee: ['etouffement', 'disparition'],
    commun: ['resine']
  };

  const RELIQUES = {
    anneau: { id: 'anneau', nom: 'Anneau de veille', texte: 'Gagne 8 pv maximum (et 8 pv maintenant).', rare: 'commune' },
    meche: { id: 'meche', nom: 'Mèche longue', texte: 'La première attaque de chaque combat inflige 4 dégâts de plus.', rare: 'commune' },
    bol: { id: 'bol', nom: 'Bol de résine', texte: 'Au deuxième tour de chaque combat, gagne 1 énergie.', rare: 'commune' },
    cendrex: { id: 'cendrex', nom: 'Cendre ancestrale', texte: 'Au début de ton tour, gagne 2 de garde.', rare: 'commune' },
    souffletcuivre: { id: 'souffletcuivre', nom: 'Soufflet de cuivre', texte: 'Quand tu gagnes de la Chaleur ou de la Fumée, gagne 2 de garde.', rare: 'rare' },
    linceul: { id: 'linceul', nom: 'Linceul de suie', texte: 'La première fois par combat que tu termines un tour à 0 énergie, gagne 4 de garde.', rare: 'rare' },
    pierre: { id: 'pierre', nom: 'Pierre d\'étincelle', texte: 'La première carte à 0 coût jouée chaque tour pioche 1 carte.', rare: 'rare' },
    coeur: { id: 'coeur', nom: 'Cœur encore chaud', texte: 'Au début de chaque combat, gagne 1 Chaleur ou 1 Fumée, selon ton personnage.', rare: 'rare' }
  };

  const PERSOS = {
    solen: {
      id: 'solen', nom: 'Solen', titre: 'le Porte-flamme', ressource: 'chaleur',
      pv: 70, accroche: 'Une flamme vivante tient encore dans tes paumes. Traverse les chambres, construis ton jeu, et ne la laisse pas s\'éteindre.',
      depart: ['etincelle', 'etincelle', 'etincelle', 'etincelle', 'cendre', 'cendre', 'cendre', 'cendre', 'soufflet', 'tisons']
    },
    fumee: {
      id: 'fumee', nom: 'Fumée', titre: 'la Voile-grise', ressource: 'fumee',
      pv: 70, accroche: 'Tu glisses d\'une chambre à l\'autre. Ce qui reste derrière toi n\'est qu\'un voile, et tes ennemis frappent dans le vide.',
      depart: ['haleine', 'haleine', 'haleine', 'haleine', 'ecran', 'ecran', 'ecran', 'ecran', 'fumerolle', 'voilecourt']
    }
  };

  function intentionTexte(int) {
    if (!int) return '…';
    if (int.texte) return int.texte;
    return '…';
  }

  function creerIntentions() {
    return {
      chien(e, rng) {
        const r = rng();
        const f = e.force || 0;
        if ((e.force || 0) < 2 && r < 0.26) return { sorte: 'buff', texte: 'Se renforce +2', force: 2 };
        if (r < 0.58) return { sorte: 'attaque', texte: (7 + f) + ' dégâts', degats: 7 };
        return { sorte: 'attaque', texte: '2 × ' + (4 + f), coups: 2, degats: 4 };
      },
      statue(e, rng) {
        e.cycle = (e.cycle || 0) + 1;
        const f = e.force || 0;
        const c = e.cycle % 3;
        if (c === 1) return { sorte: 'buff', texte: 'Frisson 2', frisson: 2 };
        if (c === 2) return { sorte: 'garde', texte: '8 de garde', garde: 8 };
        return { sorte: 'attaque', texte: (12 + f) + ' dégâts', degats: 12 };
      },
      rampant(e, rng) {
        const r = rng();
        const f = e.force || 0;
        if (r < 0.3) return { sorte: 'buff', texte: 'Frisson 1 et +1 force', frisson: 1, force: 1 };
        if (r < 0.65) return { sorte: 'attaque', texte: '3 × ' + (3 + f), coups: 3, degats: 3 };
        return { sorte: 'attaque', texte: (10 + f) + ' dégâts', degats: 10 };
      },
      matrone(e, rng) {
        if (e.charge) {
          e.charge = false;
          const f = e.force || 0;
          return { sorte: 'charge', texte: (15 + f) + ' dégâts', degats: 15 };
        }
        e.cycle = (e.cycle || 0) + 1;
        const f = e.force || 0;
        const c = e.cycle % 4;
        if (c === 1) return { sorte: 'buff', texte: 'Frisson 2', frisson: 2 };
        if (c === 2) return { sorte: 'garde', texte: '10 de garde', garde: 10 };
        if (c === 3) { e.charge = true; return { sorte: 'charge', texte: 'Se charge', rien: true }; }
        return { sorte: 'attaque', texte: '2 × ' + (6 + f), coups: 2, degats: 6 };
      },
      souffleur(e, rng) {
        if (e.charge) {
          e.charge = false;
          const f = e.force || 0;
          return { sorte: 'charge', texte: (16 + f) + ' dégâts', degats: 16 };
        }
        const r = rng();
        const f = e.force || 0;
        if (r < 0.32) { e.charge = true; return { sorte: 'charge', texte: 'Se charge', rien: true }; }
        if (r < 0.66) return { sorte: 'attaque', texte: '3 × ' + (4 + f), coups: 3, degats: 4 };
        return { sorte: 'attaque', texte: (11 + f) + ' dégâts', degats: 11 };
      },
      falot(e, rng) {
        const r = rng();
        const f = e.force || 0;
        if (r < 0.30) return { sorte: 'buff', texte: 'La lanterne s\'enflamme +2', force: 2 };
        if (r < 0.65) return { sorte: 'attaque', texte: (7 + f) + ' dégâts', degats: 7 };
        return { sorte: 'attaque', texte: '2 × ' + (3 + f), coups: 2, degats: 3 };
      },
      urne(e, rng) {
        if (e.charge) {
          e.charge = false;
          const f = e.force || 0;
          return { sorte: 'charge', texte: (13 + f) + ' dégâts', degats: 13 };
        }
        const r = rng();
        const f = e.force || 0;
        if (r < 0.28) { e.charge = true; return { sorte: 'charge', texte: 'L\'urne se fend', rien: true }; }
        if (r < 0.6) return { sorte: 'buff', texte: 'Suie : Frisson 1', frisson: 1 };
        return { sorte: 'attaque', texte: (8 + f) + ' dégâts', degats: 8 };
      },
      cloche(e, rng) {
        if (e.charge) {
          e.charge = false;
          const f = e.force || 0;
          return { sorte: 'charge', texte: (17 + f) + ' dégâts', degats: 17 };
        }
        e.cycle = (e.cycle || 0) + 1;
        const f = e.force || 0;
        const c = e.cycle % 4;
        if (c === 1) return { sorte: 'buff', texte: 'Glas : Frisson 2', frisson: 2 };
        if (c === 2) return { sorte: 'garde', texte: '10 de garde', garde: 10 };
        if (c === 3) { e.charge = true; return { sorte: 'charge', texte: 'La cloche s\'arme', rien: true }; }
        return { sorte: 'attaque', texte: '2 × ' + (6 + f), coups: 2, degats: 6 };
      }
    };
  }

  const INTENTS = creerIntentions();

  const ENNEMIS = {
    chien: { type: 'chien', nom: 'Chien de cendre', pv: 34, picto: 'chien' },
    statue: { type: 'statue', nom: 'Statue de givre', pv: 42, picto: 'statue' },
    rampant: { type: 'rampant', nom: 'Rampant de suie', pv: 50, picto: 'rampant' },
    falot: { type: 'falot', nom: 'Falot', pv: 28, picto: 'falot' },
    urne: { type: 'urne', nom: 'Urne fêlée', pv: 38, picto: 'urne' },
    matrone: { type: 'matrone', nom: 'Matrone de givre', pv: 68, picto: 'matrone' },
    souffleur: { type: 'souffleur', nom: 'Souffleur', pv: 94, picto: 'souffleur' },
    cloche: { type: 'cloche', nom: 'Cloche de suie', pv: 96, picto: 'cloche' }
  };

  const EVENEMENTS = {
    chien_errant: {
      id: 'chien_errant', nom: 'Chien errant',
      texte: 'Un chien de cendre, presque éteint, s\'approche et attend. Sa braise vacille.',
      choix: [
        { id: 'nourrir', label: 'Lui laisser un peu de flamme (−5 pv)', effet: { pv: -5, flag: 'chiensAmis' }, suite: 'Plus tard, les chiens de cendre te reconnaîtront et seront plus faibles.' },
        { id: 'chasser', label: 'Le chasser (+8 or)', effet: { or: 8, flag: 'chiensHostiles' }, suite: 'Il part, rancunier. Les prochains chiens seront plus durs.' }
      ]
    },
    fissure: {
      id: 'fissure', nom: 'Fissure dans le givre',
      texte: 'Une statue déjà fendue. Un coup la briserait. La laisser intacte calmerait peut-être ce qui vient.',
      choix: [
        { id: 'briser', label: 'La briser (+14 or)', effet: { or: 14, flag: 'matroneColere' }, suite: 'La Matrone de givre s\'en souviendra.' },
        { id: 'respecter', label: 'La laisser (2 de garde au début de chaque combat)', effet: { flag: 'gardeDepart' }, suite: 'Une mince plaque de givre te couvre au début de chaque combat.' }
      ]
    },
    coupe_huile: {
      id: 'coupe_huile', nom: 'La coupe d\'huile',
      texte: 'Une coupe d\'huile encore chaude, oubliée sur l\'étal. La prendre te ferait du bien maintenant. Le ramendeur le saurait.',
      choix: [
        { id: 'prendre', label: 'La prendre (huile au prochain combat, boutiques plus chères)', effet: { flag: 'huileVolee' }, suite: 'La prochaine attaque du prochain combat sera plus forte. Les étals demandent davantage.' },
        { id: 'laisser', label: 'La laisser (+8 pv)', effet: { soin: 8, flag: 'honnete' }, suite: 'Tu te reposes un instant. Les prix restent ce qu\'ils sont.' }
      ]
    },
    serment: {
      id: 'serment', nom: 'Serment de veille',
      texte: 'Une inscription : « Jure de veiller, et la flamme t\'élargit. Mais le givre te touchera aux portes. »',
      choix: [
        { id: 'jurer', label: 'Jurer (+6 pv max)', effet: { pvMax: 6, flag: 'bossFrisson' }, suite: 'Ta réserve s\'élargit. Aux combats de boss, un Frisson t\'attend.' },
        { id: 'refuser', label: 'Passer mon chemin (+12 or)', effet: { or: 12 }, suite: 'Tu continues, les poches un peu plus lourdes.' }
      ]
    },
    urne_scellee: {
      id: 'urne_scellee', nom: 'Urne scellée',
      texte: 'Une urne fermée, encore chaude. L\'ouvrir, c\'est risquer ce qui dort. La sceller, c\'est laisser tomber une récompense.',
      choix: [
        { id: 'ouvrir', label: 'L\'ouvrir (une relique, les urnes plus tard sont plus dures)', effet: { flag: 'urneOuverte', relique: true }, suite: 'Tu prends ce qui brille. Les urnes suivantes seront plus pleines, et plus lourdes.' },
        { id: 'sceller', label: 'La sceller (plus tard, les urnes sont plus faibles)', effet: { flag: 'urneScellee' }, suite: 'Le couvercle tient. Tu n\'emportes rien.' }
      ]
    }
  };

  /* ---------- utilitaires ---------- */
  function creerRng(graine) {
    if (graine == null) return Math.random;
    let s = (graine >>> 0) || 1;
    return function () {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function choix(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }
  function melanger(a, rng) {
    const r = rng || Math.random;
    const t = a.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  }
  function uid(rng) { return Math.floor((rng || Math.random)() * 1e9).toString(36) + Math.floor((rng || Math.random)() * 1e9).toString(36); }
  function instancier(id, rng, plus) { const c = { uid: uid(rng), id }; if (plus) c.plus = true; return c; }

  function defCarte(c) {
    const base = CARTES[typeof c === 'string' ? c : c.id];
    if (!base) return { id: '?', nom: '?', type: 'art', cout: 0, texte: '' };
    if (c && c.plus && base.plus) {
      const m = Object.assign({}, base, base.plus);
      m.nom = base.nom + '+';
      m.amelioree = true;
      m.texte = base.plus.texte || base.texte;
      return m;
    }
    return base;
  }

  function aRelique(etat, id) { return (etat.reliques || []).some((r) => (r.id || r) === id); }

  /* ---------- partie et carte ---------- */
  function deckDepart(persoId, rng) {
    const p = PERSOS[persoId] || PERSOS.solen;
    return p.depart.map((id) => instancier(id, rng));
  }

  function poolRecompense(etat, meta) {
    const perso = etat.perso || 'solen';
    const ids = Object.keys(CARTES).filter((id) => {
      const c = CARTES[id];
      if (c.starter && c.perso === perso) return false;
      if (c.perso === perso || c.perso === 'commun') return true;
      return false;
    });
    const locks = new Set();
    const liste = [].concat(DEBLOCABLES[perso] || [], DEBLOCABLES.commun || []);
    const debloques = (meta && meta.deblocages) || [];
    liste.forEach((id) => { if (!debloques.includes(id)) locks.add(id); });
    return ids.filter((id) => !locks.has(id));
  }

  function genererCarte(rng) {
    let n = 0;
    const noeud = (type, acte, vague, nom, desc) => {
      const id = 'n' + (n++);
      return { id, type, acte, vague: vague || '', nom, desc, sorties: [] };
    };
    const c1 = [
      noeud('combat', 1, 'intro', 'Premier seuil', 'Un chien de cendre veille encore.')
    ];
    const c2 = [
      noeud('combat', 1, 'mixte', 'Salle de suie', 'La flamme vacille.'),
      noeud('combat', 1, 'froid', 'Couloir froid', 'Le givre rampe sur les murs.')
    ];
    const ev1 = choix(['chien_errant', 'fissure', 'coupe_huile'], rng);
    const c3 = [
      noeud('repos', 1, '', 'Brasero bas', 'Un peu de chaleur. Tu peux te soigner ou affûter une carte.'),
      noeud('evenement', 1, ev1, 'Une trace', 'Quelque chose t\'attend, et tes choix reviendront.'),
      noeud('combat', 1, 'dure', 'Chambre noire', 'Ils sont plus nombreux.'),
      noeud('boutique', 1, '', 'Étal du ramendeur', 'Une carte, une relique, une carte à laisser.')
    ];
    const c4 = [
      noeud('boss', 1, 'matrone', 'Matrone de givre', 'Elle garde la porte entre les deux actes.')
    ];
    const c5 = [
      noeud('combat', 2, 'mixte2', 'Cour des cendres', 'L\'air se fait plus lourd.'),
      noeud('elite', 2, 'rampant', 'Remonte de suie', 'Quelque chose rampe, trop large pour un chien.')
    ];
    const ev2 = choix(['serment', 'urne_scellee', 'coupe_huile'], rng);
    const c6 = [
      noeud('repos', 2, '', 'Brasero haut', 'Dernière halte avant la chambre du boss.'),
      noeud('evenement', 2, ev2, 'Un seuil', 'Un choix, dont la suite se verra dans la dernière chambre.'),
      noeud('boutique', 2, '', 'Atelier du ramendeur', 'Il a suivi la chaleur jusqu\'ici.')
    ];
    const c7 = [
      noeud('combat', 2, 'dure2', 'Vestibule', 'On entend déjà ce qui garde la porte.')
    ];
    const boss2 = rng() < 0.5 ? 'souffleur' : 'cloche';
    const c8 = [
      noeud('boss', 2, boss2, boss2 === 'cloche' ? 'Cloche de suie' : 'Le souffleur',
        boss2 === 'cloche' ? 'Une cloche noire barre la dernière chambre.' : 'La dernière chambre.')
    ];
    const rangs = [c1, c2, c3, c4, c5, c6, c7, c8];
    // Liaisons : chaque nœud rejoint 1 ou 2 nœuds du rang suivant, sans trop croiser.
    for (let i = 0; i < rangs.length - 1; i++) {
      const a = rangs[i], b = rangs[i + 1];
      a.forEach((nd, k) => {
        if (b.length === 1) nd.sorties = [b[0].id];
        else if (a.length === 1) nd.sorties = b.map((x) => x.id);
        else {
          const i0 = Math.min(k, b.length - 1);
          const i1 = Math.min(i0 + 1, b.length - 1);
          nd.sorties = i0 === i1 ? [b[i0].id] : [b[i0].id, b[i1].id];
          // Le nœud du milieu (s'il y en a un) peut aussi mener au dernier.
          if (k === a.length - 1 && !nd.sorties.includes(b[b.length - 1].id)) nd.sorties.push(b[b.length - 1].id);
        }
      });
      // Garantir que chaque nœud suivant a une entrée.
      b.forEach((nd) => {
        if (!a.some((p) => p.sorties.includes(nd.id))) {
          a[Math.min(a.length - 1, Math.floor(rng() * a.length))].sorties.push(nd.id);
        }
      });
    }
    return {
      rangs,
      tous: rangs.reduce((acc, r) => acc.concat(r), []),
      ouverts: [c1[0].id],
      faits: [],
      actuel: null
    };
  }

  function trouverNoeud(etat, id) {
    return etat.carte.tous.find((n) => n.id === id);
  }

  function nouvellePartie(persoId, meta, rng) {
    const r = rng || Math.random;
    const p = PERSOS[persoId] || PERSOS.solen;
    const asc = (meta && meta.ascensionActive) || 0;
    const pvMax = p.pv - (asc >= 7 ? 5 : 0);
    return {
      ecran: 'carte',
      perso: p.id,
      etage: 0,
      or: 40 - (asc >= 3 ? 10 : 0),
      pv: pvMax,
      pvMax,
      deck: deckDepart(p.id, r),
      reliques: [],
      flags: {},
      ascension: asc,
      difficulte: 1,
      combat: null,
      choix: null,
      choixReliques: null,
      carte: genererCarte(r),
      debut: Date.now(),
      historique: [],
      rngSeed: null
    };
  }

  /* ---------- combat ---------- */
  function ajusterPv(etat, base, elite) {
    const d = etat.difficulte || 1;
    const acte = (etat._acteEnCours) || 1;
    const asc = etat.ascension || 0;
    let v = base * d * (acte === 2 ? 1.16 : 1);
    if (elite) v *= 1.12 + (asc >= 1 ? 0.06 : 0) + (asc >= 9 ? 0.10 : 0);
    if (asc >= 1) v *= 1.04;
    if (asc >= 6) v *= 1.06;
    if (asc >= 9) v *= 1.05;
    return Math.max(16, Math.round(v));
  }

  function creerEnnemi(etat, type, rng, elite) {
    const m = ENNEMIS[type];
    const e = {
      uid: uid(rng), type, nom: m.nom, picto: m.picto,
      pv: ajusterPv(etat, m.pv, elite), pvMax: 0,
      bloc: 0, force: 0, charge: false, cycle: 0, elite: !!elite,
      intention: null
    };
    e.pvMax = e.pv;
    const fl = etat.flags || {};
    if (type === 'chien' && fl.chiensAmis) { e.pv = Math.max(10, e.pv - 7); e.pvMax = e.pv; }
    if (type === 'chien' && fl.chiensHostiles) { e.pv += 6; e.pvMax = e.pv; e.force += 1; }
    if (type === 'matrone' && fl.matroneColere) e.force += 2;
    if (type === 'urne' && fl.urneOuverte) { e.pv += 8; e.pvMax = e.pv; }
    if (type === 'urne' && fl.urneScellee) { e.pv = Math.max(12, e.pv - 8); e.pvMax = e.pv; }
    const asc = etat.ascension || 0;
    if (elite && asc >= 2) e.force += 1;
    if ((type === 'matrone' || type === 'souffleur' || type === 'cloche') && asc >= 4) { e.pv = Math.round(e.pv * 1.06); e.pvMax = e.pv; }
    if ((type === 'matrone' || type === 'souffleur' || type === 'cloche') && asc >= 10) { e.bloc += 5; e.force += 1; }
    e.intention = INTENTS[type](e, rng);
    return e;
  }

  function composerVague(etat, vague, rng) {
    etat._acteEnCours = (vague === 'souffleur' || vague === 'cloche' || vague === 'rampant' || (vague && String(vague).includes('2'))) ? 2 : 1;
    if (vague === 'intro') return [creerEnnemi(etat, 'chien', rng)];
    if (vague === 'mixte') {
      const r = rng();
      if (r < 0.34) return [creerEnnemi(etat, 'statue', rng)];
      if (r < 0.62) return [creerEnnemi(etat, 'chien', rng), creerEnnemi(etat, 'chien', rng)];
      return [creerEnnemi(etat, 'falot', rng), creerEnnemi(etat, 'chien', rng)];
    }
    if (vague === 'froid') return rng() < 0.55 ? [creerEnnemi(etat, 'statue', rng)] : [creerEnnemi(etat, 'urne', rng)];
    if (vague === 'dure') return rng() < 0.5 ? [creerEnnemi(etat, 'statue', rng), creerEnnemi(etat, 'chien', rng)] : [creerEnnemi(etat, 'falot', rng), creerEnnemi(etat, 'urne', rng)];
    if (vague === 'matrone') return [creerEnnemi(etat, 'matrone', rng, true)];
    if (vague === 'mixte2') return rng() < 0.4 ? [creerEnnemi(etat, 'statue', rng), creerEnnemi(etat, 'falot', rng)] : (rng() < 0.5 ? [creerEnnemi(etat, 'rampant', rng)] : [creerEnnemi(etat, 'urne', rng), creerEnnemi(etat, 'chien', rng)]);
    if (vague === 'rampant') return rng() < 0.5 ? [creerEnnemi(etat, 'rampant', rng, true)] : [creerEnnemi(etat, 'urne', rng, true), creerEnnemi(etat, 'falot', rng)];
    if (vague === 'dure2') return rng() < 0.5 ? [creerEnnemi(etat, 'statue', rng), creerEnnemi(etat, 'urne', rng)] : [creerEnnemi(etat, 'rampant', rng), creerEnnemi(etat, 'falot', rng)];
    if (vague === 'souffleur') return [creerEnnemi(etat, 'souffleur', rng, true)];
    if (vague === 'cloche') return [creerEnnemi(etat, 'cloche', rng, true)];
    return [creerEnnemi(etat, 'chien', rng)];
  }

  function appliquerReliquesDebutCombat(etat) {
    const c = etat.combat;
    if (aRelique(etat, 'coeur')) {
      if (etat.perso === 'fumee') c.fumee += 1;
      else c.chaleur += 1;
    }
    c.mecheDispo = aRelique(etat, 'meche');
    c.pierreDispo = aRelique(etat, 'pierre');
    c.linceulUtilise = false;
    const fl = etat.flags || {};
    if (fl.gardeDepart) c.bloc += 2;
    if (fl.braiseOfferte) {
      if (etat.perso === 'fumee') c.fumee += 1; else c.chaleur += 1;
    }
    if (fl.huileVolee && !fl._huileConsommee) { c.huile += 6; fl._huileConsommee = true; }
    const noeud = etat.carte && etat.carte.actuel ? trouverNoeud(etat, etat.carte.actuel) : null;
    if (fl.bossFrisson && noeud && noeud.type === 'boss') c.frisson += 1;
    if ((etat.ascension || 0) >= 8) {
      c.ennemis.forEach((e) => { e.force = (e.force || 0) + 1; });
    }
  }

  function demarrerCombat(etat, vague, rng, meta) {
    const r = rng || Math.random;
    const pioche = melanger(etat.deck.map((c) => ({ uid: c.uid, id: c.id, plus: !!c.plus })), r);
    etat.combat = {
      ennemis: composerVague(etat, vague, r),
      pioche, defausse: [], main: [],
      energie: 3, energieMax: 3, bonusEnergie: 0,
      bloc: 0, chaleur: 0, fumee: 0, huile: 0, frisson: 0,
      sel: null, tour: 0,
      tuto: meta ? !meta.tutoVu : false,
      mecheDispo: false, pierreDispo: false,
      vague
    };
    appliquerReliquesDebutCombat(etat);
    debutTourJoueur(etat, r);
    etat.ecran = 'combat';
    return etat;
  }

  function piocher(etat, n, rng) {
    const c = etat.combat;
    const r = rng || Math.random;
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (!c.pioche.length) {
        if (!c.defausse.length) break;
        c.pioche = melanger(c.defausse, r);
        c.defausse = [];
      }
      c.main.push(c.pioche.pop());
      k++;
    }
    return k;
  }

  function debutTourJoueur(etat, rng) {
    const c = etat.combat;
    c.tour += 1;
    c.bloc = 0;
    c.energie = c.energieMax + (c.bonusEnergie || 0);
    c.bonusEnergie = 0;
    if (aRelique(etat, 'bol') && c.tour === 2) c.energie += 1;
    if (aRelique(etat, 'cendrex')) c.bloc += 2;
    if (c.tour > 1 && c.chaleur > 0) c.chaleur = Math.max(0, c.chaleur - 1);
    if (c.tour > 1 && c.fumee > 0) c.fumee = Math.max(0, c.fumee - 1);
    c.sel = null;
    c.pierreDispo = aRelique(etat, 'pierre');
    piocher(etat, 5, rng);
  }

  function degatsCarte(d, c, etat) {
    let n = d.degats || 0;
    if (d.parChaleur) n += d.parChaleur * (c.chaleur || 0);
    if (d.parFumee2) n += d.parFumee2 * Math.floor((c.fumee || 0) / 2);
    let consommeChaleur = 0, consommeFumee = 0;
    const seuilE = d.eclatSeuil || 3;
    const degE = d.eclatDegats || 16;
    if (d.eclat && c.chaleur >= seuilE) { n = degE; consommeChaleur = seuilE; }
    if (d.etouffe && c.fumee >= 2) { n = d.etouffeDegats || 12; consommeFumee = 2; }
    if (c.huile) n += c.huile;
    if (etat && c.mecheDispo) n += 4;
    if (c.frisson > 0) n = Math.floor(n * 0.75);
    return { n, consommeChaleur, consommeFumee };
  }

  function apercu(etat, d) {
    const c = etat.combat;
    if (!c || !d) return '';
    const bits = [];
    if (d.degats) {
      const calc = degatsCarte(d, c, etat);
      bits.push(d.tous ? ('Infligera ' + calc.n + ' dégâts à tous') : ('Infligera ' + calc.n + ' dégâts'));
      if (d.parChaleur) bits.push('(+' + d.parChaleur + ' par Chaleur, tu en as ' + c.chaleur + ')');
      if (d.parFumee2) bits.push('(+' + d.parFumee2 + ' par 2 Fumée, tu en as ' + c.fumee + ')');
      if (d.eclat) bits.push(c.chaleur >= (d.eclatSeuil || 3) ? ('Éclat allumé, consomme ' + (d.eclatSeuil || 3) + ' Chaleur') : ('Il te faut 3 Chaleur pour l\'éclat (tu en as ' + c.chaleur + ')'));
      if (d.etouffe) bits.push(c.fumee >= 2 ? 'Étouffement allumé, consomme 2 Fumée' : ('Il te faut 2 Fumée (tu en as ' + c.fumee + ')'));
      if (c.huile) bits.push('dont +' + c.huile + ' d\'huile');
      if (c.mecheDispo) bits.push('dont +4 de mèche');
      if (c.frisson > 0) bits.push('réduit par Frisson');
    }
    if (d.garde) bits.push('+' + d.garde + ' garde');
    if (d.disparait && c.fumee >= 2) bits.push('pioche 2 (consomme 2 Fumée)');
    if (d.chaleur) bits.push('+' + d.chaleur + ' Chaleur');
    if (d.fumee && !d.disparait) bits.push('+' + d.fumee + ' Fumée');
    if (d.pioche && !d.disparait) bits.push('pioche ' + d.pioche);
    if (d.huile) bits.push('prochaine attaque +' + d.huile);
    if (d.resine) bits.push('+1 énergie au prochain tour');
    if (d.frissonDonne) bits.push('Frisson ' + d.frissonDonne);
    return bits.filter(Boolean).join(' · ');
  }

  function infligerEnnemi(e, n) {
    let reste = n, bloque = 0, pv = 0;
    if (e.bloc > 0) {
      const a = Math.min(e.bloc, reste);
      e.bloc -= a; reste -= a; bloque = a;
    }
    if (reste > 0) { e.pv = Math.max(0, e.pv - reste); pv = reste; }
    return { bloque, pv, mort: e.pv <= 0 };
  }

  function infligerJoueur(etat, n) {
    const c = etat.combat;
    let reste = n, bloque = 0, pv = 0;
    if (c.bloc > 0) {
      const a = Math.min(c.bloc, reste);
      c.bloc -= a; reste -= a; bloque = a;
    }
    if (reste > 0) { etat.pv = Math.max(0, etat.pv - reste); pv = reste; }
    return { bloque, pv, mort: etat.pv <= 0 };
  }

  function gagnerRessource(etat, chaleur, fumee) {
    const c = etat.combat;
    let garde = 0;
    if (chaleur) c.chaleur += chaleur;
    if (fumee) c.fumee += fumee;
    if ((chaleur || fumee) && aRelique(etat, 'souffletcuivre')) {
      c.bloc += 2; garde = 2;
    }
    return garde;
  }

  /* Joue une carte. Retourne des événements pour l'interface, ou {ok:false, raison}. */
  function jouerCarte(etat, carteUid, cibleUid, rng) {
    const c = etat.combat;
    const r = rng || Math.random;
    const carte = c.main.find((x) => x.uid === carteUid);
    if (!carte) return { ok: false, raison: 'carte' };
    const d = defCarte(carte);
    if (c.energie < d.cout) return { ok: false, raison: 'energie' };
    if (d.degats && !d.tous && !cibleUid) return { ok: false, raison: 'cible' };
    c.energie -= d.cout;
    const idx = c.main.findIndex((x) => x.uid === carteUid);
    if (idx >= 0) c.main.splice(idx, 1);
    c.defausse.push(carte);
    c.sel = null;

    const evts = { ok: true, garde: 0, chaleur: 0, fumee: 0, pioche: 0, hits: [], pierre: false };

    if (d.cout === 0 && c.pierreDispo) {
      c.pierreDispo = false;
      evts.pioche += piocher(etat, 1, r);
      evts.pierre = true;
    }
    if (d.garde) { c.bloc += d.garde; evts.garde += d.garde; }
    if (d.chaleur) { evts.garde += gagnerRessource(etat, d.chaleur, 0); evts.chaleur += d.chaleur; }
    if (d.fumee) { evts.garde += gagnerRessource(etat, 0, d.fumee); evts.fumee += d.fumee; }
    if (d.huile) c.huile += d.huile;
    if (d.resine) c.bonusEnergie += d.resine;
    if (d.pioche && !d.disparait) evts.pioche += piocher(etat, d.pioche, r);
    if (d.disparait && c.fumee >= 2) {
      c.fumee -= 2;
      evts.fumee -= 2;
      evts.pioche += piocher(etat, 2, r);
    }

    if (d.degats) {
      const calc = degatsCarte(d, c, etat);
      if (calc.consommeChaleur) c.chaleur -= calc.consommeChaleur;
      if (calc.consommeFumee) c.fumee -= calc.consommeFumee;
      if (c.huile) c.huile = 0;
      if (c.mecheDispo) c.mecheDispo = false;
      const cibles = d.tous ? c.ennemis.filter((e) => e.pv > 0) : [c.ennemis.find((e) => e.uid === cibleUid)].filter(Boolean);
      let fris = d.frissonDonne || 0;
      if (d.etouffe && calc.consommeFumee) fris = 2;
      cibles.forEach((e) => {
        const hit = infligerEnnemi(e, calc.n);
        if (fris) e._frissonJoueur = (e._frissonJoueur || 0) + fris; // not used; frisson is on player from enemies
        evts.hits.push({ uid: e.uid, n: calc.n, ...hit });
      });
      // etouffement applies Frisson to... the design said apply Frisson. In our game Frisson is on the player (weakness). For enemies, we could reduce their next attack. I'll apply a "froid" mark: reduce enemy force or next attack. Simpler: apply as player-side? That doesn't make sense. Apply a weakness to the ENEMY: their next attack deals 25% less. I'll store e.frisson.
      if (fris) cibles.forEach((e) => { e.frisson = (e.frisson || 0) + fris; });
    }

    evts.vivants = c.ennemis.filter((e) => e.pv > 0).length;
    evts.joueurMort = etat.pv <= 0;
    evts.victoire = evts.vivants === 0;
    return evts;
  }

  function agirEnnemi(etat, e) {
    if (!e || e.pv <= 0 || !etat.combat) return { hits: [] };
    const int = e.intention || {};
    const evts = { hits: [], force: 0, garde: 0, frisson: 0 };
    if (int.force) { e.force += int.force; evts.force = int.force; }
    if (int.garde) { e.bloc += int.garde; evts.garde = int.garde; }
    if (int.frisson) { etat.combat.frisson += int.frisson; evts.frisson = int.frisson; }
    if (int.rien) return evts;
    const coups = int.coups || (int.degats ? 1 : 0);
    let dmg = (int.degats || 0) + (e.force || 0);
    if (e.frisson > 0) { dmg = Math.floor(dmg * 0.75); e.frisson -= 1; }
    for (let i = 0; i < coups; i++) {
      evts.hits.push(infligerJoueur(etat, dmg));
    }
    return evts;
  }

  function finTour(etat, rng) {
    const c = etat.combat;
    const r = rng || Math.random;
    const evts = { linceul: 0, ennemis: [], joueurMort: false, nouveauTour: false };
    c.sel = null;
    if (c.frisson > 0) c.frisson -= 1;
    if (aRelique(etat, 'linceul') && c.energie === 0 && !c.linceulUtilise) { c.bloc += 4; c.linceulUtilise = true; evts.linceul = 4; }
    while (c.main.length) c.defausse.push(c.main.pop());
    const vivants = c.ennemis.filter((e) => e.pv > 0);
    vivants.forEach((e) => evts.ennemis.push({ uid: e.uid, act: agirEnnemi(etat, e) }));
    evts.joueurMort = etat.pv <= 0;
    evts.victoire = c.ennemis.every((e) => e.pv <= 0);
    if (!evts.joueurMort && !evts.victoire) {
      c.ennemis.filter((e) => e.pv > 0).forEach((e) => {
        e.bloc = 0;
        e.intention = INTENTS[e.type](e, r);
      });
      debutTourJoueur(etat, r);
      evts.nouveauTour = true;
    }
    return evts;
  }

  /* ---------- après combat, repos, boutique, reliques ---------- */
  function orDuNoeud(noeud) {
    if (!noeud) return 14;
    if (noeud.type === 'boss') return 36;
    if (noeud.type === 'elite') return 24;
    return 16;
  }

  function finCombat(etat, gagne, rng, meta) {
    const r = rng || Math.random;
    if (!gagne) {
      etat.ecran = 'defaite';
      etat.combat = null;
      return { fin: 'defaite' };
    }
    const noeud = etat.carte && etat.carte.actuel ? trouverNoeud(etat, etat.carte.actuel) : null;
    const ratio = etat.pv / etat.pvMax;
    if (ratio > 0.85) etat.difficulte = Math.min(1.18, (etat.difficulte || 1) + 0.04);
    else if (ratio < 0.35) etat.difficulte = Math.max(0.9, (etat.difficulte || 1) - 0.05);
    etat.or += orDuNoeud(noeud) + Math.floor(r() * 7);
    etat.combat = null;

    const estBoss = noeud && noeud.type === 'boss';
    const estElite = noeud && noeud.type === 'elite';
    const estFinal = noeud && (noeud.vague === 'souffleur' || noeud.vague === 'cloche');
    if (estFinal) {
      etat.ecran = 'victoire';
      return { fin: 'victoire' };
    }
    // Relique après elite ou boss d'acte 1
    if (estBoss || estElite) {
      etat.choixReliques = tirerReliques(etat, 3, r);
      etat.ecran = 'relique';
      etat._apresRelique = 'recompense';
      etat.choix = tirerOffre(etat, meta, 3, r);
      return { fin: 'relique' };
    }
    etat.ecran = 'recompense';
    etat.choix = tirerOffre(etat, meta, 3, r);
    return { fin: 'recompense' };
  }

  function tirerOffre(etat, meta, n, rng) {
    const pool = poolRecompense(etat, meta);
    let ids = melanger(pool, rng).slice(0, n);
    while (ids.length < n) ids.push(choix(pool.length ? pool : Object.keys(CARTES), rng));
    // Éviter les doublons dans l'offre
    ids = [...new Set(ids)];
    while (ids.length < n) ids.push(choix(Object.keys(CARTES), rng));
    return ids.slice(0, n).map((id) => instancier(id, rng));
  }

  function tirerReliques(etat, n, rng) {
    const tenues = new Set((etat.reliques || []).map((r) => r.id || r));
    const pool = Object.keys(RELIQUES).filter((id) => !tenues.has(id));
    if (!pool.length) return [];
    return melanger(pool, rng).slice(0, n).map((id) => ({ id }));
  }

  function donnerRelique(etat, id) {
    if (aRelique(etat, id)) return;
    etat.reliques.push({ id });
    if (id === 'anneau') {
      etat.pvMax += 8;
      etat.pv = Math.min(etat.pvMax, etat.pv + 8);
    }
  }

  function ajouterCarte(etat, id, rng, plus) {
    etat.deck.push(instancier(id, rng, plus));
  }

  function retirerCarte(etat, uidCarte) {
    const i = etat.deck.findIndex((c) => c.uid === uidCarte);
    if (i < 0 || etat.deck.length <= 5) return false;
    etat.deck.splice(i, 1);
    return true;
  }

  function ameliorerCarte(etat, uidCarte) {
    const c = etat.deck.find((x) => x.uid === uidCarte);
    if (!c || c.plus) return false;
    if (!CARTES[c.id] || !CARTES[c.id].plus) return false;
    c.plus = true;
    return true;
  }

  function soigner(etat, n) {
    const avant = etat.pv;
    etat.pv = Math.min(etat.pvMax, etat.pv + n);
    return etat.pv - avant;
  }

  function marquerNoeudFait(etat) {
    const carte = etat.carte;
    if (!carte.actuel) return;
    if (!carte.faits.includes(carte.actuel)) carte.faits.push(carte.actuel);
    const n = trouverNoeud(etat, carte.actuel);
    carte.ouverts = (n && n.sorties) ? n.sorties.slice() : [];
    carte.actuel = null;
    etat.etage = carte.faits.length;
    if (!carte.ouverts.length) {
      etat.ecran = 'victoire';
    } else {
      etat.ecran = 'carte';
    }
  }

  function entrerNoeud(etat, id, rng, meta) {
    const n = trouverNoeud(etat, id);
    if (!n) return { ok: false };
    if (!etat.carte.ouverts.includes(id)) return { ok: false };
    etat.carte.actuel = id;
    etat._acteEnCours = n.acte;
    if (n.type === 'combat' || n.type === 'elite' || n.type === 'boss') {
      demarrerCombat(etat, n.vague, rng, meta);
      return { ok: true, ecran: 'combat' };
    }
    if (n.type === 'repos') { etat.ecran = 'repos'; return { ok: true, ecran: 'repos' }; }
    if (n.type === 'boutique') {
      etat.ecran = 'boutique';
      etat.choix = tirerOffre(etat, meta, 3, rng);
      etat.choixReliques = tirerReliques(etat, 1, rng);
      return { ok: true, ecran: 'boutique' };
    }
    if (n.type === 'evenement') {
      etat.ecran = 'evenement';
      etat.evenement = EVENEMENTS[n.vague] || EVENEMENTS.chien_errant;
      return { ok: true, ecran: 'evenement' };
    }
    return { ok: false };
  }


  function soinRepos(etat) {
    const base = (etat.ascension || 0) >= 5 ? 18 : 22;
    return Math.min(base, etat.pvMax - etat.pv);
  }
  function prixCarte(etat) { return 40 + ((etat.ascension || 0) >= 8 ? 15 : 0) + ((etat.flags || {}).huileVolee || (etat.flags || {}).shopsChers ? 15 : 0); }
  function prixRelique(etat) { return 70 + ((etat.ascension || 0) >= 8 ? 15 : 0) + ((etat.flags || {}).huileVolee ? 15 : 0); }
  function prixRetrait(etat) { return 30 + ((etat.flags || {}).huileVolee ? 10 : 0); }

  function appliquerEvenement(etat, evId, choixId, rng, meta) {
    const ev = EVENEMENTS[evId] || etat.evenement;
    if (!ev) return { ok: false };
    const ch = (ev.choix || []).find((c) => c.id === choixId);
    if (!ch) return { ok: false };
    etat.flags = etat.flags || {};
    const ef = ch.effet || {};
    if (ef.pv) etat.pv = Math.max(1, etat.pv + ef.pv);
    if (ef.soin) soigner(etat, ef.soin);
    if (ef.or) etat.or += ef.or;
    if (ef.pvMax) { etat.pvMax += ef.pvMax; etat.pv += ef.pvMax; }
    if (ef.flag) etat.flags[ef.flag] = true;
    if (ef.relique) {
      const off = tirerReliques(etat, 1, rng);
      if (off[0]) donnerRelique(etat, off[0].id);
    }
    etat.dernierChoix = { ev: ev.id, choix: ch.id, suite: ch.suite };
    return { ok: true, suite: ch.suite };
  }

  function choisirEvenementAuto(etat, ev) {
    const ratio = etat.pv / etat.pvMax;
    const evn = ev || etat.evenement;
    if (!evn) return null;
    // éviter de payer des pv si on est bas ; sinon prendre l'option qui pose un flag utile
    const options = evn.choix || [];
    const sure = options.find((c) => !c.effet || !c.effet.pv || (c.effet.pv + etat.pv > etat.pvMax * 0.4));
    if (ratio < 0.45) {
      const doux = options.find((c) => !c.effet || !c.effet.pv);
      return (doux || options[options.length - 1]).id;
    }
    const rel = options.find((c) => c.effet && c.effet.relique);
    if (rel) return rel.id;
    const garde = options.find((c) => c.effet && c.effet.flag === 'gardeDepart');
    if (garde) return garde.id;
    return (sure || options[0]).id;
  }

  /* ---------- IA du joueur automatique ---------- */
  function degatsEntrants(etat) {
    return etat.combat.ennemis.filter((e) => e.pv > 0).reduce((s, e) => {
      const int = e.intention || {};
      if (!int.degats) return s;
      const coups = int.coups || 1;
      let d = (int.degats + (e.force || 0));
      if (e.frisson > 0) d = Math.floor(d * 0.75);
      return s + d * coups;
    }, 0);
  }

  function scoreCarte(etat, carte) {
    const c = etat.combat;
    const d = defCarte(carte);
    if (c.energie < d.cout) return -Infinity;
    const incoming = degatsEntrants(etat);
    const besoinGarde = Math.max(0, incoming - c.bloc);
    let s = 0;
    if (d.degats) {
      const calc = degatsCarte(d, c, etat);
      const cibles = d.tous ? c.ennemis.filter((e) => e.pv > 0) : [c.ennemis.filter((e) => e.pv > 0).sort((a, b) => a.pv - b.pv)[0]].filter(Boolean);
      cibles.forEach((e) => {
        const réel = Math.min(e.pv + e.bloc, calc.n);
        s += réel * 1.1;
        if (calc.n >= e.pv + e.bloc) s += 8; // kill
      });
    }
    if (d.garde) {
      const utile = Math.min(d.garde, Math.max(0, besoinGarde));
      s += utile * 1.5 + (besoinGarde > 0 ? 1 : d.garde * 0.25);
      if (besoinGarde >= 10) s += 6;
    }
    if (d.chaleur) s += d.chaleur * (2.2);
    if (d.fumee) s += d.fumee * (2.2);
    if (d.huile) s += d.huile * 0.7;
    if (d.resine) s += 4.5;
    if (d.pioche) s += d.pioche * 2.2;
    if (d.disparait && c.fumee >= 2) s += 5;
    if (d.eclat && c.chaleur >= 3) s += 6;
    if (d.etouffe && c.fumee >= 2) s += 6;
    // Préférer dépenser l'énergie, légèrement
    s += (3 - d.cout) * 0.1;
    return s;
  }

  function choisirCible(etat, d) {
    const vivants = etat.combat.ennemis.filter((e) => e.pv > 0);
    if (!vivants.length) return null;
    if (d.tous) return null;
    // Viser celui qu'on peut tuer, sinon le plus faible
    const calc = degatsCarte(d, etat.combat, etat);
    const tuable = vivants.filter((e) => e.pv + e.bloc <= calc.n).sort((a, b) => b.pv - a.pv);
    if (tuable.length) return tuable[0].uid;
    return vivants.slice().sort((a, b) => (a.pv + a.bloc) - (b.pv + b.bloc))[0].uid;
  }

  function jouerTourAuto(etat, rng) {
    const r = rng || Math.random;
    let gardeFou = 0;
    while (gardeFou++ < 20) {
      const c = etat.combat;
      if (!c || etat.pv <= 0) break;
      if (c.ennemis.every((e) => e.pv <= 0)) break;
      const jouables = c.main.filter((carte) => {
        const d = defCarte(carte);
        if (c.energie < d.cout) return false;
        return scoreCarte(etat, carte) > 0.2;
      });
      if (!jouables.length) break;
      jouables.sort((a, b) => scoreCarte(etat, b) - scoreCarte(etat, a));
      const carte = jouables[0];
      const d = defCarte(carte);
      const cible = (d.degats && !d.tous) ? choisirCible(etat, d) : null;
      if (d.degats && !d.tous && !cible) break;
      const ev = jouerCarte(etat, carte.uid, cible, r);
      if (!ev.ok) break;
      if (ev.victoire || ev.joueurMort) return ev;
    }
    return { ok: true, finTour: true };
  }

  function choisirRecompenseAuto(etat, offre) {
    // Préférer les cartes de synergie déjà présentes, puis les attaques efficaces
    const idsDeck = etat.deck.map((c) => c.id);
    const aChaleur = idsDeck.some((id) => ['soufflet', 'encens', 'souffle', 'braisevive', 'eclat'].includes(id));
    const aFumee = idsDeck.some((id) => ['fumerolle', 'suie', 'emprise', 'etouffement', 'voilecourt', 'courant'].includes(id));
    function sc(c) {
      const d = defCarte(c);
      let s = 1;
      if (d.eclat && aChaleur) s += 8;
      if (d.parChaleur && aChaleur) s += 7;
      if (d.etouffe && aFumee) s += 8;
      if (d.parFumee2 && aFumee) s += 7;
      if (d.chaleur || d.fumee) s += 3;
      if (d.pioche) s += 3;
      if (d.resine) s += 4;
      if (d.tous) s += 2;
      if (d.degats >= 10) s += 2;
      // Pénaliser les doublons excessifs
      const nb = idsDeck.filter((id) => id === d.id).length;
      s -= nb * 1.5;
      return s;
    }
    return offre.slice().sort((a, b) => sc(b) - sc(a))[0];
  }

  function choisirReliqueAuto(etat, offre) {
    const ordre = ['bol', 'coeur', 'cendrex', 'anneau', 'meche', 'pierre', 'souffletcuivre', 'linceul'];
    for (const id of ordre) {
      const t = offre.find((r) => (r.id || r) === id);
      if (t) return t;
    }
    return offre[0];
  }

  function choisirReposAuto(etat) {
    const ratio = etat.pv / etat.pvMax;
    const ameliorable = etat.deck.find((c) => !c.plus && CARTES[c.id] && CARTES[c.id].plus);
    if (ratio <= 0.45) return 'soin';
    if (ameliorable) return { acte: 'ameliorer', uid: choisirCarteAAmeliorer(etat) };
    if (etat.deck.length > 12) {
      const uidr = choisirCarteARetirer(etat);
      if (uidr) return { acte: 'retirer', uid: uidr };
    }
    if (ratio < 0.8) return 'soin';
    if (ameliorable) return { acte: 'ameliorer', uid: choisirCarteAAmeliorer(etat) };
    return 'partir';
  }

  function choisirCarteAAmeliorer(etat) {
    const prio = ['eclat', 'braisevive', 'etouffement', 'emprise', 'trait', 'souffle', 'mur', 'voile', 'tisons', 'encens', 'suie', 'etincelle', 'haleine', 'cendre', 'ecran'];
    for (const id of prio) {
      const c = etat.deck.find((x) => x.id === id && !x.plus);
      if (c) return c.uid;
    }
    const c = etat.deck.find((x) => !x.plus && CARTES[x.id] && CARTES[x.id].plus);
    return c ? c.uid : null;
  }

  function choisirCarteARetirer(etat) {
    if (etat.deck.length <= 5) return null;
    const prio = ['etincelle', 'haleine', 'cendre', 'ecran'];
    for (const id of prio) {
      const c = etat.deck.find((x) => x.id === id);
      if (c) return c.uid;
    }
    return etat.deck[0].uid;
  }

  function choisirNoeudAuto(etat) {
    const ids = etat.carte.ouverts || [];
    const noeuds = ids.map((id) => trouverNoeud(etat, id)).filter(Boolean);
    if (!noeuds.length) return null;
    const ratio = etat.pv / etat.pvMax;
    const score = (n) => {
      if (n.type === 'repos' && ratio < 0.7) return 10;
      if (n.type === 'boss') return 6;
      if (n.type === 'elite' && ratio > 0.55) return 8;
      if (n.type === 'elite') return 3;
      if (n.type === 'boutique' && etat.or >= 40) return 7;
      if (n.type === 'boutique') return 4;
      if (n.type === 'combat') return 5;
      if (n.type === 'evenement') return 6;
      return 1;
    };
    return noeuds.slice().sort((a, b) => score(b) - score(a))[0].id;
  }

  /* Une course complète, sans interface. Retourne un rapport. */
  function jouerCourse(persoId, meta, rng, options) {
    const r = rng || Math.random;
    const opt = options || {};
    const maxTours = opt.maxTours || 80;
    const m = Object.assign({ deblocages: [], tutoVu: true, runs: 0, victoires: 0, defaites: 0, meilleurEtage: 0 }, meta || {});
    const etat = nouvellePartie(persoId, m, r);
    const rapport = { perso: persoId, gagne: false, mort: false, etage: 0, tours: 0, noeuds: [], deckFinal: [], reliques: [], pv: etat.pv, raison: '' };
    let garde = 0;
    while (garde++ < 60) {
      if (etat.ecran === 'victoire') { rapport.gagne = true; break; }
      if (etat.ecran === 'defaite') { rapport.mort = true; break; }
      if (etat.ecran === 'carte') {
        const id = choisirNoeudAuto(etat);
        if (!id) { rapport.raison = 'aucun-noeud'; break; }
        const n = trouverNoeud(etat, id);
        rapport.noeuds.push(n ? n.nom : id);
        entrerNoeud(etat, id, r, m);
        continue;
      }
      if (etat.ecran === 'combat') {
        let t = 0;
        while (etat.ecran === 'combat' && t++ < maxTours) {
          rapport.tours++;
          const ev = jouerTourAuto(etat, r);
          if (etat.combat && etat.combat.ennemis.every((e) => e.pv <= 0)) {
            finCombat(etat, true, r, m);
            break;
          }
          if (etat.pv <= 0) {
            finCombat(etat, false, r, m);
            break;
          }
          if (ev && ev.finTour) {
            const ft = finTour(etat, r);
            if (ft.joueurMort) { finCombat(etat, false, r, m); break; }
            if (ft.victoire) { finCombat(etat, true, r, m); break; }
          }
        }
        if (etat.ecran === 'combat') { rapport.raison = 'combat-blocage'; finCombat(etat, false, r, m); }
        continue;
      }
      if (etat.ecran === 'relique') {
        const offre = etat.choixReliques || [];
        if (offre.length) {
          const ch = choisirReliqueAuto(etat, offre);
          if (ch) donnerRelique(etat, ch.id || ch);
        }
        etat.choixReliques = null;
        if (etat.choix && etat.choix.length) etat.ecran = 'recompense';
        else { marquerNoeudFait(etat); }
        continue;
      }
      if (etat.ecran === 'recompense') {
        const offre = etat.choix || [];
        if (offre.length) {
          const ch = choisirRecompenseAuto(etat, offre);
          if (ch) ajouterCarte(etat, ch.id, r, false);
        }
        etat.choix = null;
        marquerNoeudFait(etat);
        continue;
      }
      if (etat.ecran === 'evenement') {
        const idc = choisirEvenementAuto(etat, etat.evenement);
        if (idc) appliquerEvenement(etat, etat.evenement.id, idc, r, m);
        etat.evenement = null;
        marquerNoeudFait(etat);
        continue;
      }
      if (etat.ecran === 'repos') {
        const choixR = choisirReposAuto(etat);
        if (choixR === 'soin') soigner(etat, soinRepos(etat) || 24);
        else if (choixR && choixR.acte === 'ameliorer') ameliorerCarte(etat, choixR.uid);
        else if (choixR && choixR.acte === 'retirer') retirerCarte(etat, choixR.uid);
        marquerNoeudFait(etat);
        continue;
      }
      if (etat.ecran === 'boutique') {
        // Acheter la meilleure carte si or >= 40, parfois une relique (70)
        const pRel = prixRelique(etat), pCar = prixCarte(etat);
        if (etat.choixReliques && etat.choixReliques.length && etat.or >= pRel) {
          donnerRelique(etat, etat.choixReliques[0].id);
          etat.or -= pRel;
        }
        if (etat.choix && etat.choix.length && etat.or >= pCar) {
          const ch = choisirRecompenseAuto(etat, etat.choix);
          if (ch) { ajouterCarte(etat, ch.id, r, false); etat.or -= pCar; }
        }
        etat.choix = null;
        etat.choixReliques = null;
        marquerNoeudFait(etat);
        continue;
      }
      rapport.raison = 'ecran-inconnu:' + etat.ecran;
      break;
    }
    rapport.etage = etat.etage || (etat.carte && etat.carte.faits.length) || 0;
    rapport.pv = etat.pv;
    rapport.deckFinal = etat.deck.map((c) => c.id + (c.plus ? '+' : ''));
    rapport.reliques = (etat.reliques || []).map((r) => r.id || r);
    rapport.or = etat.or;
    rapport.ecran = etat.ecran;
    rapport.flags = Object.keys(etat.flags || {});
    rapport.ascension = etat.ascension || 0;
    return rapport;
  }

  const api = {
    CARTES, RELIQUES, PERSOS, ENNEMIS, DEBLOCABLES, INTENTS,
    creerRng, choix, melanger, uid, instancier, defCarte, aRelique,
    nouvellePartie, genererCarte, trouverNoeud, entrerNoeud, marquerNoeudFait,
    demarrerCombat, debutTourJoueur, piocher, degatsCarte, apercu,
    jouerCarte, finTour, agirEnnemi, finCombat,
    tirerOffre, tirerReliques, donnerRelique, ajouterCarte, retirerCarte, ameliorerCarte, soigner,
    jouerCourse, jouerTourAuto, choisirRecompenseAuto, choisirReliqueAuto, choisirReposAuto, choisirNoeudAuto,
    EVENEMENTS, appliquerEvenement, choisirEvenementAuto, soinRepos, prixCarte, prixRelique, prixRetrait,
    degatsEntrants, scoreCarte, poolRecompense
  };
  racine.BraisesMoteur = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
