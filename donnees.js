/* Braises V6 : données du jeu (classes, cartes, ennemis, talismans, événements).
   Jeu original. Mécaniques inspirées du genre deckbuilder roguelike ; aucun nom, texte ni visuel repris d'un autre jeu.
   Les valeurs v[niveau] : niveau 0 = de base, 1 = affûtée (ou ★★ pour les cartes à quête), 2 = ★★★. */
(function (racine) {
  const TRIBUS = {
    forge: { nom: 'Forgés', couleur: '#c9a26a', paliers: [3, 5, 7], txt: ['+4 garde en début de combat', '+9 garde en début de combat', '+15 garde en début de combat'], val: [4, 9, 15] },
    bete: { nom: 'Bêtes', couleur: '#d97a4a', paliers: [3, 5, 7], txt: ['Lames +1 dégât', 'Lames +2 dégâts', 'Lames +3 dégâts'], val: [1, 2, 3] },
    luciole: { nom: 'Lucioles', couleur: '#e8e070', paliers: [3, 5, 7], txt: ['Soigne 3 après chaque combat', 'Soigne 6 après chaque combat', 'Soigne 10 après chaque combat'], val: [3, 6, 10] },
    cendre: { nom: 'Cendrés', couleur: '#e0563a', paliers: [3, 5, 7], txt: ['Ennemis : 3 Brûlure au départ', 'Ennemis : 6 Brûlure au départ', 'Ennemis : 10 Brûlure au départ'], val: [3, 6, 10] },
    givre: { nom: 'Givrins', couleur: '#7cc8ee', paliers: [3, 5, 7], txt: ['Ennemis : 1 Gel au départ', 'Ennemis : 2 Gel au départ', 'Ennemis : 4 Gel au départ'], val: [1, 2, 4] }
  };

  const STATUTS = {
    force: { nom: 'Force', txt: 'Chaque coup inflige +1 dégât par point.', bon: true },
    robustesse: { nom: 'Robustesse', txt: 'Chaque gain de garde est augmenté d\'autant.', bon: true },
    faible: { nom: 'Faiblesse', txt: 'Inflige 25 % de dégâts en moins. Baisse de 1 par tour.' },
    expose: { nom: 'Exposé', txt: 'Subit 50 % de dégâts en plus. Baisse de 1 par tour.' },
    brulure: { nom: 'Brûlure', txt: 'Perd autant de PV à la fin de son tour, puis baisse de 1.' },
    poison: { nom: 'Poison', txt: 'Perd autant de PV au début de son tour, puis baisse de 1.' },
    gel: { nom: 'Gel', txt: 'Ses attaques infligent 1 dégât de moins par Gel (au plus la moitié). Ne fond pas tout seul.' },
    epines: { nom: 'Épines', txt: 'Qui te frappe subit autant de dégâts.', bon: true },
    brume: { nom: 'Brume', txt: 'Le prochain coup subi est réduit de moitié.', bon: true },
    esquive: { nom: 'Esquive', txt: 'Le prochain coup subi est annulé.', bon: true },
    chaleur: { nom: 'Chaleur', txt: 'Ressource de Solen.', bon: true },
    fleches: { nom: 'Flèches', txt: 'À la fin du tour, chaque Flèche touche un ennemi au hasard.', bon: true },
    seve: { nom: 'Sève', txt: 'Ressource de Lierre : déclenche la Forme sauvage.', bon: true },
    rage: { nom: 'Rage', txt: 'Lames +1 dégât par Rage (au plus 5).', bon: true },
    ames: { nom: 'Âmes', txt: 'Ressource d\'Ossian, gagnée en consumant des cartes.', bon: true },
    rouages: { nom: 'Rouages', txt: 'À 4 Rouages, Bram forge un Rivet.', bon: true },
    sauvage: { nom: 'Forme sauvage', txt: '+1 Force et +2 Épines pour le combat.', bon: true }
  };

  // ---------- classes ----------
  const CLASSES = {
    solen: {
      nom: 'Solen', titre: 'la Gardienne de l\'âtre', pv: 64, couleur: '#f08a3c', sprite: 'h-solen', renom: 1,
      resume: 'Chaque Sort attise la Chaleur, que ses Lames dépensent.',
      comp: { nom: 'Foyer', rangs: ['Chaque Sort joué donne 1 Chaleur.', 'Les Lames infligent +1 dégât par 2 Chaleur.', 'Début de tour : +1 Chaleur.'] },
      depart: ['frappe', 'frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'soufflet', 'soufflet', 'braise'],
      heritages: [
        { nom: 'Charbon ardent', txt: '+2 Chaleur au début des combats.', eff: [['debutCombat', 'chaleur', 2]] },
        { nom: 'Âtre fidèle', txt: 'Soigne 4 PV à la fin de chaque combat.', eff: [['finCombatSoin', 4]] },
        { nom: 'Grand soufflet', txt: '+1 mana au premier tour de chaque combat.', eff: [['premierTourMana', 1]] }
      ],
      talents: [
        { id: 't-solen1', nom: 'Tirage ardent', txt: '+3 Chaleur au début des combats.', eff: [['debutCombat', 'chaleur', 3]] },
        { id: 't-solen2', nom: 'Peau de braise', txt: 'Début de tour : 2 garde par tranche de 3 Chaleur.', eff: [['gardeParChaleur', 1]] }
      ]
    },
    fumee: {
      nom: 'Fumée', titre: 'la Voile-grise', pv: 62, couleur: '#9fb0c8', sprite: 'h-fumee', renom: 1,
      resume: 'Se dérobe dans la Brume et affaiblit tout ce qui l\'approche.',
      comp: { nom: 'Voile', rangs: ['La 3e carte jouée chaque tour donne 1 Brume.', 'Gagner de la Brume inflige 1 Faiblesse à tous les ennemis.', 'La 2e carte du tour suffit.'] },
      depart: ['frappe', 'frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'voile', 'voile', 'suffocation'],
      heritages: [
        { nom: 'Cendre aux yeux', txt: 'Les ennemis commencent avec 1 Faiblesse.', eff: [['debutCombatEnnemis', 'faible', 1]] },
        { nom: 'Pas feutré', txt: '+1 Esquive au début des combats.', eff: [['debutCombat', 'esquive', 1]] },
        { nom: 'Linceul', txt: '+1 Brume au début des combats et +6 PV max.', eff: [['debutCombat', 'brume', 1], ['pvMax', 6]] }
      ],
      talents: [
        { id: 't-fumee1', nom: 'Brouillard', txt: '+2 Brume au début des combats.', eff: [['debutCombat', 'brume', 2]] },
        { id: 't-fumee2', nom: 'Lame sournoise', txt: 'Tes coups contre un ennemi Faible infligent +3.', eff: [['bonusFaible', 3]] }
      ]
    },
    silex: {
      nom: 'Silex', titre: 'le Brisegivre', pv: 66, couleur: '#7cc8ee', sprite: 'h-silex', renom: 1,
      resume: 'Entasse le Gel avec ses Lames, puis le brise d\'un coup.',
      comp: { nom: 'Givre', rangs: ['Chaque Lame applique 1 Gel à sa cible.', 'Briser du Gel donne 2 garde par Gel.', 'Début de combat : 2 Gel à tous les ennemis.'] },
      depart: ['frappe', 'frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'parade', 'givrelame', 'briser'],
      heritages: [
        { nom: 'Bise', txt: 'Les ennemis commencent avec 1 Gel.', eff: [['debutCombatEnnemis', 'gel', 1]] },
        { nom: 'Carapace de glace', txt: '+8 garde au début des combats.', eff: [['debutCombat', 'garde', 8]] },
        { nom: 'Cœur froid', txt: '+10 PV max.', eff: [['pvMax', 10]] }
      ],
      talents: [
        { id: 't-silex1', nom: 'Morsure', txt: 'Début de tour : 1 Gel à un ennemi au hasard.', eff: [['debutTourEnnemiAlea', 'gel', 1]] },
        { id: 't-silex2', nom: 'Éclats', txt: 'Briser inflige +2 par Gel.', eff: [['briserPlus', 2]] }
      ]
    },
    ivra: {
      nom: 'Ivra', titre: 'la Tireuse de cendres', pv: 60, couleur: '#6fd6b8', sprite: 'h-ivra', renom: 2,
      resume: 'Chaque Lame encoche une Flèche, qui part toute seule en fin de tour.',
      comp: { nom: 'Carquois', rangs: ['Chaque Lame donne 1 Flèche. Fin de tour : chaque Flèche inflige 2 dégâts.', 'Les Flèches infligent 3 dégâts.', 'Les Sorts donnent aussi 1 Flèche.'] },
      depart: ['frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'parade', 'tir', 'tir', 'encoche'],
      heritages: [
        { nom: 'Flèches de rechange', txt: '+2 Flèches au début des combats.', eff: [['debutCombat', 'fleches', 2]] },
        { nom: 'Œil de faucon', txt: 'Les ennemis commencent Exposés (1).', eff: [['debutCombatEnnemis', 'expose', 1]] },
        { nom: 'Bourse de chasse', txt: '+30 % d\'or.', eff: [['orBonus', 30]] }
      ],
      talents: [
        { id: 't-ivra1', nom: 'Double encoche', txt: 'Début de tour : +1 Flèche.', eff: [['debutTour', 'fleches', 1]] },
        { id: 't-ivra2', nom: 'Pointes de fer', txt: 'Les Flèches infligent +1 dégât.', eff: [['flechePlus', 1]] }
      ]
    },
    bram: {
      nom: 'Bram', titre: 'le Forgeron', pv: 62, couleur: '#c9a26a', sprite: 'h-bram', renom: 3,
      resume: 'Ses cartes font tourner les Rouages, qui forgent des Rivets.',
      comp: { nom: 'Forge', rangs: ['Chaque carte donne 1 Rouage. À 4, ajoute un Rivet en main.', 'Le Rivet devient un Rivet trempé.', 'Les cartes Forgés donnent 2 Rouages.'] },
      depart: ['frappe', 'frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'marteau', 'marteau', 'enclume'],
      heritages: [
        { nom: 'Tablier de cuir', txt: '+6 garde au début des combats.', eff: [['debutCombat', 'garde', 6]] },
        { nom: 'Rouage d\'avance', txt: '+2 Rouages au début des combats.', eff: [['debutCombat', 'rouages', 2]] },
        { nom: 'Lingot', txt: '+60 or au départ.', eff: [['orDepart', 60]] }
      ],
      talents: [
        { id: 't-bram1', nom: 'Trempe', txt: '+1 Robustesse au début des combats.', eff: [['debutCombat', 'robustesse', 1]] },
        { id: 't-bram2', nom: 'Maître d\'atelier', txt: 'Les Rivets infligent +3 dégâts.', eff: [['rivetPlus', 3]] }
      ]
    },
    lierre: {
      nom: 'Lierre', titre: 'la Sauvage', pv: 58, couleur: '#7ccf5a', sprite: 'h-lierre', renom: 4,
      resume: 'Se couvre d\'Épines, accumule la Sève et passe en Forme sauvage.',
      comp: { nom: 'Sauvagerie', rangs: ['Chaque carte donne 1 Sève. À 9 Sève : Forme sauvage (+1 Force, +2 Épines).', 'Chaque Sort donne aussi 1 Épine.', 'La Forme sauvage vient dès 6 Sève.'] },
      depart: ['frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'ronce', 'ronce', 'griffe', 'griffe'],
      heritages: [
        { nom: 'Écorce', txt: '+3 Épines au début des combats.', eff: [['debutCombat', 'epines', 3]] },
        { nom: 'Racines', txt: '+3 Sève au début des combats.', eff: [['debutCombat', 'seve', 3]] },
        { nom: 'Rosée', txt: 'Soigne 5 PV à la fin de chaque combat.', eff: [['finCombatSoin', 5]] }
      ],
      talents: [
        { id: 't-lierre1', nom: 'Croissance', txt: 'Début de tour : +1 Sève.', eff: [['debutTour', 'seve', 1]] },
        { id: 't-lierre2', nom: 'Bois dur', txt: '+2 Épines au début des combats.', eff: [['debutCombat', 'epines', 2]] }
      ]
    },
    grenat: {
      nom: 'Grenat', titre: 'la Furieuse', pv: 62, couleur: '#e05a4a', sprite: 'h-grenat', renom: 5,
      resume: 'Plus elle saigne, plus elle frappe fort.',
      comp: { nom: 'Furie', rangs: ['Chaque perte de PV donne 1 Rage (Lames +1 par Rage, au plus 5).', 'Sous la moitié de tes PV : +1 mana par tour.', 'Achever un ennemi rend 5 PV.'] },
      depart: ['frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'parade', 'hache', 'hache', 'saignee'],
      heritages: [
        { nom: 'Sang chaud', txt: '+2 Rage au début des combats.', eff: [['debutCombat', 'rage', 2]] },
        { nom: 'Cuir épais', txt: '+12 PV max.', eff: [['pvMax', 12]] },
        { nom: 'Trophées', txt: '+1 Force au début des combats.', eff: [['debutCombat', 'force', 1]] }
      ],
      talents: [
        { id: 't-grenat1', nom: 'Soif', txt: 'Fin de combat : soigne 1 PV par Rage.', eff: [['soinRage', 1]] },
        { id: 't-grenat2', nom: 'Hurlement', txt: 'Début de combat : 1 Faiblesse à tous les ennemis.', eff: [['debutCombatEnnemis', 'faible', 1]] }
      ]
    },
    ossian: {
      nom: 'Ossian', titre: 'le Veilleur des cendres', pv: 68, couleur: '#a97ce0', sprite: 'h-ossian', renom: 6,
      resume: 'Consume ses cartes pour en tirer des Âmes, puis les libère.',
      comp: { nom: 'Veille', rangs: ['Chaque carte consumée donne 1 Âme.', 'Début de combat : +2 Âmes.', 'Chaque Âme gagnée inflige 2 dégâts à un ennemi au hasard.'] },
      depart: ['frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'osbrise', 'osbrise', 'ritefunebre', 'liberation'],
      heritages: [
        { nom: 'Reliquaire', txt: '+2 Âmes au début des combats.', eff: [['debutCombat', 'ames', 2]] },
        { nom: 'Suaire', txt: '+5 garde au début des combats.', eff: [['debutCombat', 'garde', 5]] },
        { nom: 'Pacte', txt: '+1 mana au premier tour de chaque combat.', eff: [['premierTourMana', 1]] }
      ],
      talents: [
        { id: 't-ossian1', nom: 'Ossuaire vivant', txt: '+3 Âmes au début des combats.', eff: [['debutCombat', 'ames', 3]] },
        { id: 't-ossian2', nom: 'Chant des morts', txt: 'Libération inflige +2 par Âme.', eff: [['liberationPlus', 2]] }
      ]
    }
  };

  // ---------- cartes ----------
  // t : 'L' (Lame) ou 'S' (Sort). c : coût. r : C, P, R. cl : classe. tr : tribu. cib : 'e' (un ennemi), 'tous', 'soi'.
  const C = {};
  function carte(o) { C[o.id] = Object.assign({ c: 1, r: 'C', cl: null, tr: null, cib: 'soi', v: [[0], [0]] }, o); }

  // Neutres de départ
  carte({ id: 'frappe', nom: 'Frappe', t: 'L', cib: 'e', depart: true, v: [[6], [9]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'parade', nom: 'Parade', t: 'S', depart: true, v: [[5], [8]], txt: (v) => `Gagne ${v[0]} garde.`, f: (x, v) => x.garde(v[0]) });
  carte({ id: 'suie', nom: 'Suie', t: 'S', r: 'M', exil: true, v: [[0], [0]], txt: () => 'Ne fait rien. Consumer.', f: () => {} });
  carte({ id: 'rivet', nom: 'Rivet', t: 'L', c: 0, r: 'G', cib: 'alea', exil: true, v: [[4, 4], [6, 6]], txt: (v) => `Gagne ${v[0]} garde, inflige ${v[1]} dégâts à un ennemi au hasard. Consumer.`, f: (x, v) => { x.garde(v[0]); x.degAlea(v[1] + x.eff('rivetPlus')); } });

  // Neutres communes
  carte({ id: 'entaille', nom: 'Entaille', t: 'L', cib: 'e', v: [[5, 1], [7, 2]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Exposé.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'expose', v[1]); } });
  carte({ id: 'balayage', nom: 'Balayage', t: 'L', cib: 'tous', v: [[5], [7]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis.`, f: (x, v) => x.degTous(v[0]) });
  carte({ id: 'soufflecourt', nom: 'Second souffle', t: 'S', c: 0, exil: true, v: [[2], [3]], txt: (v) => `Pioche ${v[0]} cartes. Consumer.`, f: (x, v) => x.pioche(v[0]) });
  carte({ id: 'garde2', nom: 'Pas de côté', t: 'S', v: [[4, 1], [6, 1]], txt: (v) => `Gagne ${v[0]} garde. Pioche ${v[1]} carte.`, f: (x, v) => { x.garde(v[0]); x.pioche(v[1]); } });
  carte({ id: 'crocs', nom: 'Crocs', t: 'L', tr: 'bete', cib: 'e', v: [[3, 2], [4, 2]], txt: (v) => `Inflige ${v[0]} dégâts ${v[1]} fois.`, f: (x, v) => { for (let i = 0; i < v[1]; i++) x.deg(v[0]); } });
  carte({ id: 'estoc', nom: 'Estoc de meute', t: 'L', tr: 'bete', cib: 'e', v: [[4, 1], [5, 2]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par Bête dans ton paquet.`, f: (x, v) => x.deg(v[0] + v[1] * x.tribu('bete')) });
  carte({ id: 'boucliefer', nom: 'Écu de fer', t: 'S', tr: 'forge', v: [[5, 1], [7, 2]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Forgé dans ton paquet.`, f: (x, v) => x.garde(v[0] + v[1] * x.tribu('forge')) });
  carte({ id: 'engrenage', nom: 'Engrenage', t: 'S', tr: 'forge', v: [[4, 1], [7, 1]], txt: (v) => `Gagne ${v[0]} garde. Pioche ${v[1]} carte.`, f: (x, v) => { x.garde(v[0]); x.pioche(v[1]); } });
  carte({ id: 'luciole', nom: 'Luciole', t: 'S', tr: 'luciole', v: [[3, 3], [4, 5]], txt: (v) => `Soigne ${v[0]} PV. Gagne ${v[1]} garde.`, f: (x, v) => { x.soin(v[0]); x.garde(v[1]); } });
  carte({ id: 'poussiere', nom: 'Poussière d\'aile', t: 'S', tr: 'luciole', cib: 'e', v: [[2], [3]], txt: (v) => `Applique ${v[0]} Faiblesse. Pioche 1 carte.`, f: (x, v) => { x.statut(x.cible, 'faible', v[0]); x.pioche(1); } });
  carte({ id: 'tison', nom: 'Tison', t: 'L', tr: 'cendre', cib: 'e', v: [[4, 3], [5, 5]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Brûlure.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'brulure', v[1]); } });
  carte({ id: 'fumerolle', nom: 'Fumerolle', t: 'S', tr: 'cendre', cib: 'tous', v: [[4], [6]], txt: (v) => `Applique ${v[0]} Brûlure à tous les ennemis.`, f: (x, v) => x.statutTous('brulure', v[0]) });
  carte({ id: 'givrure', nom: 'Givrure', t: 'S', tr: 'givre', cib: 'e', v: [[4, 2], [6, 3]], txt: (v) => `Gagne ${v[0]} garde. Applique ${v[1]} Gel.`, f: (x, v) => { x.garde(v[0]); x.statut(x.cible, 'gel', v[1]); } });
  carte({ id: 'stalactite', nom: 'Stalactite', t: 'L', tr: 'givre', cib: 'e', v: [[7, 3], [9, 4]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} si la cible a du Gel.`, f: (x, v) => x.deg(v[0] + ((x.cible && x.cible.st.gel) ? v[1] : 0)) });
  carte({ id: 'apprenti', nom: 'Lame de l\'apprenti', t: 'L', cib: 'e', q: { k: 'tue', s: [3, 9], txt: 'achever des ennemis' }, v: [[5], [8], [12]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'novice', nom: 'Écu du novice', t: 'S', q: { k: 'garde', s: [30, 90], txt: 'bloquer des dégâts' }, v: [[5], [8], [12]], txt: (v) => `Gagne ${v[0]} garde.`, f: (x, v) => x.garde(v[0]) });

  // Neutres peu communes
  carte({ id: 'charge', nom: 'Charge', t: 'L', r: 'P', c: 2, cib: 'e', v: [[15], [20]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'rafale', nom: 'Rafale', t: 'L', r: 'P', cib: 'e', v: [[2, 4], [2, 5]], txt: (v) => `Inflige ${v[0]} dégâts ${v[1]} fois.`, f: (x, v) => { for (let i = 0; i < v[1]; i++) x.deg(v[0]); } });
  carte({ id: 'rempart', nom: 'Dernier rempart', t: 'S', r: 'P', c: 2, v: [[14], [19]], txt: (v) => `Gagne ${v[0]} garde.`, f: (x, v) => x.garde(v[0]) });
  carte({ id: 'elan', nom: 'Élan', t: 'S', r: 'P', c: 0, v: [[1, 0], [1, 1]], txt: (v) => `Gagne ${v[0]} mana (Surcharge)${v[1] ? '. Pioche 1 carte' : ''}.`, f: (x, v) => { x.mana(v[0]); if (v[1]) x.pioche(1); } });
  carte({ id: 'concentration', nom: 'Concentration', t: 'S', r: 'P', v: [[1, 0], [1, 4]], txt: (v) => `Gagne ${v[0]} Force${v[1] ? ' et ' + v[1] + ' garde' : ''}.`, f: (x, v) => { x.soi('force', v[0]); if (v[1]) x.garde(v[1]); } });
  carte({ id: 'meute', nom: 'Appel de la meute', t: 'L', r: 'P', tr: 'bete', cib: 'e', v: [[2], [3]], txt: (v) => `Inflige ${v[0]} dégâts par Bête dans ton paquet (au moins 2 Bêtes comptées).`, f: (x, v) => x.deg(v[0] * Math.max(2, x.tribu('bete'))) });
  carte({ id: 'rivetage', nom: 'Rivetage', t: 'S', r: 'P', tr: 'forge', exil: true, v: [[2], [3]], txt: (v) => `Gagne ${v[0]} Robustesse. Consumer.`, f: (x, v) => x.soi('robustesse', v[0]) });
  carte({ id: 'essaim', nom: 'Essaim', t: 'S', r: 'P', tr: 'luciole', exil: true, v: [[2], [3]], txt: (v) => `Soigne ${v[0]} PV par Luciole dans ton paquet (au moins 2 comptées). Consumer.`, f: (x, v) => x.soin(v[0] * Math.max(2, x.tribu('luciole'))) });
  carte({ id: 'brasier', nom: 'Brasier', t: 'L', r: 'P', c: 2, tr: 'cendre', cib: 'tous', v: [[7, 3], [9, 4]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Brûlure à tous les ennemis.`, f: (x, v) => { x.degTous(v[0]); x.statutTous('brulure', v[1]); } });
  carte({ id: 'cendresvives', nom: 'Cendres vives', t: 'S', r: 'P', tr: 'cendre', cib: 'e', v: [[1], [0]], c: 1, txt: () => 'Double la Brûlure de la cible.', f: (x) => { if (x.cible) x.statut(x.cible, 'brulure', x.cible.st.brulure || 0); } });
  carte({ id: 'blizzard', nom: 'Blizzard', t: 'S', r: 'P', c: 2, tr: 'givre', cib: 'tous', v: [[3], [4]], txt: (v) => `Applique ${v[0]} Gel à tous les ennemis.`, f: (x, v) => x.statutTous('gel', v[0]) });
  carte({ id: 'eclatgivre', nom: 'Éclat de givre', t: 'L', r: 'P', tr: 'givre', cib: 'e', v: [[2], [3]], txt: (v) => `Inflige ${v[0]} dégâts par Gel de la cible (au moins 3).`, f: (x, v) => x.deg(v[0] * Math.max(3, (x.cible && x.cible.st.gel) || 0)) });
  carte({ id: 'grimoire', nom: 'Grimoire', t: 'S', r: 'P', q: { k: 'sort', s: [12, 35], txt: 'jouer des Sorts' }, v: [[1, 3], [2, 4], [2, 8]], txt: (v) => `Pioche ${v[0]} carte${v[0] > 1 ? 's' : ''}. Gagne ${v[1]} garde.`, f: (x, v) => { x.pioche(v[0]); x.garde(v[1]); } });
  carte({ id: 'lignee', nom: 'Croc de lignée', t: 'L', r: 'P', tr: 'bete', cib: 'e', q: { k: 'deg', s: [120, 360], txt: 'infliger des dégâts' }, v: [[4], [6], [9]], txt: (v) => `Inflige ${v[0]} dégâts 2 fois.`, f: (x, v) => { x.deg(v[0]); x.deg(v[0]); } });

  // Neutres rares
  carte({ id: 'execution', nom: 'Exécution', t: 'L', r: 'R', c: 2, cib: 'e', v: [[10], [14]], txt: (v) => `Inflige ${v[0]} dégâts, le triple si la cible a moins de 30 % de ses PV.`, f: (x, v) => x.deg(x.cible && x.cible.pv < x.cible.pvMax * 0.3 ? v[0] * 3 : v[0]) });
  carte({ id: 'forteresse', nom: 'Forteresse', t: 'S', r: 'R', c: 2, tr: 'forge', v: [[6, 3], [10, 3]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Forgé dans ton paquet.`, f: (x, v) => x.garde(v[0] + v[1] * x.tribu('forge')) });
  carte({ id: 'roimeute', nom: 'Roi de la meute', t: 'S', r: 'R', tr: 'bete', exil: true, v: [[2], [3]], txt: (v) => `Gagne ${v[0]} Force. Consumer.`, f: (x, v) => x.soi('force', v[0]) });
  carte({ id: 'phenix', nom: 'Plume de phénix', t: 'S', r: 'R', c: 2, tr: 'luciole', exil: true, v: [[12], [16]], txt: (v) => `Soigne ${v[0]} PV. Consumer.`, f: (x, v) => x.soin(v[0]) });
  carte({ id: 'incendie', nom: 'Incendie', t: 'S', r: 'R', tr: 'cendre', cib: 'tous', exil: true, v: [[10], [14]], txt: (v) => `Applique ${v[0]} Brûlure à tous les ennemis. Consumer.`, f: (x, v) => x.statutTous('brulure', v[0]) });
  carte({ id: 'hiver', nom: 'Hiver sans fin', t: 'S', r: 'R', tr: 'givre', cib: 'tous', exil: true, v: [[1], [2]], txt: (v) => `Double le Gel de tous les ennemis${v[0] > 1 ? ', puis +2' : ''}. Consumer.`, f: (x, v) => { x.ennemisVivants().forEach((e) => x.statut(e, 'gel', (e.st.gel || 0) + (v[0] > 1 ? 2 : 0))); } });
  carte({ id: 'secondvent', nom: 'Second vent', t: 'S', r: 'R', exil: true, v: [[2], [3]], txt: (v) => `Gagne ${v[0]} mana (Surcharge). Consumer.`, f: (x, v) => x.mana(v[0]) });
  carte({ id: 'couronneep', nom: 'Couronne d\'épines', t: 'S', r: 'R', v: [[4], [6]], txt: (v) => `Gagne ${v[0]} Épines.`, f: (x, v) => x.soi('epines', v[0]) });

  // Solen
  carte({ id: 'soufflet', nom: 'Soufflet', t: 'S', cl: 'solen', depart: true, v: [[2, 3], [3, 5]], txt: (v) => `Gagne ${v[0]} Chaleur et ${v[1]} garde.`, f: (x, v) => { x.soi('chaleur', v[0]); x.garde(v[1]); } });
  carte({ id: 'braise', nom: 'Braise', t: 'L', cl: 'solen', cib: 'e', depart: true, v: [[5, 2], [6, 3]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par Chaleur.`, f: (x, v) => x.deg(v[0] + v[1] * x.st('chaleur')) });
  carte({ id: 'etincelles', nom: 'Étincelles', t: 'L', cl: 'solen', cib: 'tous', v: [[3, 1], [5, 1]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis. Gagne ${v[1]} Chaleur.`, f: (x, v) => { x.degTous(v[0]); x.soi('chaleur', v[1]); } });
  carte({ id: 'foyerardent', nom: 'Foyer ardent', t: 'S', cl: 'solen', r: 'P', v: [[4, 2], [6, 3]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Chaleur.`, f: (x, v) => x.garde(v[0] + v[1] * x.st('chaleur')) });
  carte({ id: 'embrasement', nom: 'Embrasement', t: 'L', cl: 'solen', r: 'R', c: 2, cib: 'e', v: [[6, 4], [8, 5]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par Chaleur. Dépense toute la Chaleur.`, f: (x, v) => { const ch = x.st('chaleur'); x.deg(v[0] + v[1] * ch); x.soi('chaleur', -ch); } });
  // Fumée
  carte({ id: 'voile', nom: 'Voile', t: 'S', cl: 'fumee', depart: true, v: [[5, 1], [7, 1]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Brume.`, f: (x, v) => { x.garde(v[0]); x.soi('brume', v[1]); } });
  carte({ id: 'suffocation', nom: 'Suffocation', t: 'L', cl: 'fumee', cib: 'e', depart: true, v: [[5, 1], [7, 2]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Faiblesse.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'faible', v[1]); } });
  carte({ id: 'nuee', nom: 'Nuée grise', t: 'S', cl: 'fumee', cib: 'tous', v: [[2], [3]], txt: (v) => `Applique ${v[0]} Faiblesse à tous les ennemis.`, f: (x, v) => x.statutTous('faible', v[0]) });
  carte({ id: 'ombre', nom: 'Coup de l\'ombre', t: 'L', cl: 'fumee', r: 'P', cib: 'e', v: [[6], [8]], txt: (v) => `Inflige ${v[0]} dégâts, le double si la cible est Faible.`, f: (x, v) => x.deg(x.cible && x.cible.st.faible ? v[0] * 2 : v[0]) });
  carte({ id: 'disparition', nom: 'Disparition', t: 'S', cl: 'fumee', r: 'R', v: [[1, 1], [1, 0]], txt: (v) => `Gagne ${v[0]} Esquive.${v[1] ? ' Consumer.' : ''}`, exilSi: (v) => !!v[1], f: (x, v) => x.soi('esquive', v[0]) });
  // Silex
  carte({ id: 'givrelame', nom: 'Givre-lame', t: 'L', cl: 'silex', cib: 'e', depart: true, v: [[5, 1], [7, 1]], txt: (v) => `Inflige ${v[0]} dégâts. Applique ${v[1]} Gel de plus.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'gel', v[1]); } });
  carte({ id: 'briser', nom: 'Briser', t: 'L', cl: 'silex', cib: 'e', depart: true, sansGel: true, v: [[4], [5]], txt: (v) => `Inflige ${v[0]} dégâts par Gel de la cible (au moins 1), puis retire son Gel.`, f: (x, v) => x.briser(v[0]) });
  carte({ id: 'gangue', nom: 'Gangue', t: 'S', cl: 'silex', cib: 'tous', v: [[6, 1], [8, 1]], txt: (v) => `Gagne ${v[0]} garde. Applique ${v[1]} Gel à tous les ennemis.`, f: (x, v) => { x.garde(v[0]); x.statutTous('gel', v[1]); } });
  carte({ id: 'cristal', nom: 'Cristallisation', t: 'S', cl: 'silex', r: 'P', cib: 'e', v: [[0], [2]], txt: (v) => `Double le Gel de la cible${v[0] ? ', puis +' + v[0] : ''}.`, f: (x, v) => { if (x.cible) x.statut(x.cible, 'gel', (x.cible.st.gel || 0) + v[0]); } });
  carte({ id: 'avalanche', nom: 'Avalanche', t: 'L', cl: 'silex', r: 'R', c: 2, cib: 'tous', sansGel: true, v: [[3], [4]], txt: (v) => `Inflige à chaque ennemi ${v[0]} dégâts par Gel qu'il porte (au moins 2), sans le retirer.`, f: (x, v) => { x.ennemisVivants().forEach((e) => x.deg(v[0] * Math.max(2, e.st.gel || 0), e)); } });
  // Ivra
  carte({ id: 'tir', nom: 'Tir', t: 'L', cl: 'ivra', cib: 'e', depart: true, v: [[5], [8]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'encoche', nom: 'Encoche', t: 'S', cl: 'ivra', depart: true, v: [[2, 3], [3, 4]], txt: (v) => `Gagne ${v[0]} Flèches et ${v[1]} garde.`, f: (x, v) => { x.soi('fleches', v[0]); x.garde(v[1]); } });
  carte({ id: 'volee', nom: 'Volée', t: 'S', cl: 'ivra', v: [[4], [6]], txt: (v) => `Gagne ${v[0]} Flèches.`, f: (x, v) => x.soi('fleches', v[0]) });
  carte({ id: 'percant', nom: 'Tir perçant', t: 'L', cl: 'ivra', r: 'P', cib: 'e', v: [[8, 1], [11, 2]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Exposé.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'expose', v[1]); } });
  carte({ id: 'cielacier', nom: 'Ciel d\'acier', t: 'S', cl: 'ivra', r: 'R', v: [[1, 1], [1, 0]], txt: (v) => `Décoche tes Flèches tout de suite, deux fois (elles restent encochées).${v[1] ? ' Consumer.' : ''}`, exilSi: (v) => !!v[1], f: (x) => { x.decocher(); x.decocher(); } });
  // Bram
  carte({ id: 'marteau', nom: 'Marteau', t: 'L', cl: 'bram', tr: 'forge', cib: 'e', depart: true, v: [[6], [9]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'enclume', nom: 'Enclume', t: 'S', cl: 'bram', tr: 'forge', depart: true, v: [[6], [9]], txt: (v) => `Gagne ${v[0]} garde.`, f: (x, v) => x.garde(v[0]) });
  carte({ id: 'soufflerie', nom: 'Soufflerie', t: 'L', cl: 'bram', tr: 'forge', cib: 'tous', v: [[4], [6]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis.`, f: (x, v) => x.degTous(v[0]) });
  carte({ id: 'mecanisme', nom: 'Mécanisme', t: 'S', cl: 'bram', tr: 'forge', r: 'P', c: 0, v: [[2, 1], [3, 1]], txt: (v) => `Gagne ${v[0]} Rouages. Pioche ${v[1]} carte.`, f: (x, v) => { x.rouages(v[0]); x.pioche(v[1]); } });
  carte({ id: 'golem', nom: 'Golem de forge', t: 'S', cl: 'bram', tr: 'forge', r: 'R', c: 2, exil: true, v: [[12, 2], [16, 3]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Robustesse. Consumer.`, f: (x, v) => { x.garde(v[0]); x.soi('robustesse', v[1]); } });
  // Lierre
  carte({ id: 'ronce', nom: 'Ronce', t: 'S', cl: 'lierre', depart: true, v: [[3, 1], [5, 2]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Épine${v[1] > 1 ? 's' : ''}.`, f: (x, v) => { x.garde(v[0]); x.soi('epines', v[1]); } });
  carte({ id: 'griffe', nom: 'Griffe', t: 'L', cl: 'lierre', tr: 'bete', cib: 'e', depart: true, v: [[6], [9]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'sevemontante', nom: 'Sève montante', t: 'S', cl: 'lierre', v: [[3, 2], [4, 3]], txt: (v) => `Gagne ${v[0]} Sève. Soigne ${v[1]} PV.`, f: (x, v) => { x.seve(v[0]); x.soin(v[1]); } });
  carte({ id: 'ecorce', nom: 'Écorce', t: 'S', cl: 'lierre', r: 'P', v: [[3, 2], [5, 2]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Épine.`, f: (x, v) => x.garde(v[0] + v[1] * x.st('epines')) });
  carte({ id: 'rugissement', nom: 'Rugissement', t: 'L', cl: 'lierre', tr: 'bete', r: 'R', c: 2, cib: 'tous', v: [[6, 11], [8, 15]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis (${v[1]} en Forme sauvage).`, f: (x, v) => x.degTous(x.st('sauvage') ? v[1] : v[0]) });
  // Grenat
  carte({ id: 'hache', nom: 'Hache', t: 'L', cl: 'grenat', cib: 'e', depart: true, v: [[6], [9]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'saignee', nom: 'Saignée', t: 'L', cl: 'grenat', cib: 'e', depart: true, v: [[2, 10], [2, 14]], txt: (v) => `Perds ${v[0]} PV. Inflige ${v[1]} dégâts.`, f: (x, v) => { x.perdPV(v[0]); x.deg(v[1]); } });
  carte({ id: 'crideguerre', nom: 'Cri de guerre', t: 'S', cl: 'grenat', c: 0, v: [[3, 1], [2, 1]], txt: (v) => `Perds ${v[0]} PV. Gagne ${v[1]} mana (Surcharge).`, f: (x, v) => { x.perdPV(v[0]); x.mana(v[1]); } });
  carte({ id: 'frenesie', nom: 'Frénésie', t: 'L', cl: 'grenat', r: 'P', cib: 'e', v: [[3], [4]], txt: (v) => `Inflige ${v[0]} dégâts, une fois de plus par 2 Rage.`, f: (x, v) => { const n = 1 + Math.floor(x.st('rage') / 2); for (let i = 0; i < n; i++) x.deg(v[0]); } });
  carte({ id: 'derniersouffle', nom: 'Dernier souffle', t: 'L', cl: 'grenat', r: 'R', c: 2, cib: 'e', v: [[2], [1.5]], txt: (v) => `Inflige des dégâts égaux à tes PV manquants divisés par ${v[0]}.`, f: (x, v) => x.deg(Math.floor((x.run.pvMax - x.run.pv) / v[0])) });
  // Ossian
  carte({ id: 'osbrise', nom: 'Os brisé', t: 'L', cl: 'ossian', cib: 'e', depart: true, exil: true, v: [[9], [12]], txt: (v) => `Inflige ${v[0]} dégâts. Consumer.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'liberation', nom: 'Libération', t: 'L', cl: 'ossian', cib: 'e', depart: true, v: [[5], [7]], txt: (v) => `Inflige ${v[0]} dégâts par Âme (au moins 3), puis dépense les Âmes.`, f: (x, v) => { const a = x.st('ames'); x.deg((v[0] + x.eff('liberationPlus')) * Math.max(3, a)); x.soi('ames', -a); } });
  carte({ id: 'ritefunebre', nom: 'Rite funèbre', t: 'S', cl: 'ossian', exil: true, v: [[5, 1], [7, 2]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Âme${v[1] > 1 ? 's' : ''}. Consumer.`, f: (x, v) => { x.garde(v[0]); x.ame(v[1]); } });
  carte({ id: 'ossuaire', nom: 'Ossuaire', t: 'S', cl: 'ossian', r: 'P', v: [[3, 2], [5, 3]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Âme.`, f: (x, v) => x.garde(v[0] + v[1] * x.st('ames')) });
  carte({ id: 'faucheuse', nom: 'Faucheuse', t: 'L', cl: 'ossian', r: 'R', c: 2, cib: 'tous', v: [[2], [3]], txt: (v) => `Inflige à tous les ennemis ${v[0]} dégâts par Âme (au moins 3), sans les dépenser.`, f: (x, v) => x.degTous(v[0] * Math.max(3, x.st('ames'))) });

  // ---------- talismans ----------
  const TALISMANS = {
    pierrechaude: { nom: 'Pierre chaude', txt: '+1 Force au début des combats.', eff: [['debutCombat', 'force', 1]], prix: 3 },
    plastron: { nom: 'Plastron', txt: '+8 garde au début des combats.', eff: [['debutCombat', 'garde', 8]], prix: 2 },
    grelot: { nom: 'Grelot fêlé', txt: 'Les ennemis commencent avec 1 Faiblesse.', eff: [['debutCombatEnnemis', 'faible', 1]], prix: 2 },
    bougie: { nom: 'Bougie de veille', txt: 'Soigne 4 PV à la fin de chaque combat.', eff: [['finCombatSoin', 4]], prix: 2 },
    sablier: { nom: 'Sablier', txt: '+1 mana au premier tour de chaque combat.', eff: [['premierTourMana', 1]], prix: 2 },
    fiole: { nom: 'Fiole de sang', txt: '+10 PV max.', eff: [['pvMax', 10]], prix: 2 },
    bourse: { nom: 'Bourse percée', txt: '+30 % d\'or.', eff: [['orBonus', 30]], prix: 1 },
    ruche: { nom: 'Ruche', txt: 'Début de tour : +2 garde.', eff: [['debutTour', 'garde', 2]], prix: 3 },
    sixdoigt: { nom: 'Sixième doigt', txt: 'Ta main compte une carte de plus (5).', eff: [['mainPlus', 1]], prix: 4 },
    aiguisoir: { nom: 'Pierre à aiguiser', txt: 'Tes Lames infligent +1 dégât.', eff: [['lamePlus', 1]], prix: 3 },
    rembourrage: { nom: 'Rembourrage', txt: 'Chaque gain de garde +1.', eff: [['gardePlus', 1]], prix: 3 },
    braiseeternelle: { nom: 'Braise éternelle', txt: 'Les ennemis commencent avec 4 Brûlure.', eff: [['debutCombatEnnemis', 'brulure', 4]], prix: 2 },
    flocon: { nom: 'Flocon', txt: 'Les ennemis commencent avec 1 Gel.', eff: [['debutCombatEnnemis', 'gel', 1]], prix: 2 },
    epineronce: { nom: 'Épine de ronce', txt: '+3 Épines au début des combats.', eff: [['debutCombat', 'epines', 3]], prix: 2 },
    oreiller: { nom: 'Oreiller de mousse', txt: 'Le brasero soigne 15 % de plus.', eff: [['soinRepos', 15]], prix: 1 },
    lanterne: { nom: 'Lanterne sourde', txt: '+1 Esquive au début des combats.', eff: [['debutCombat', 'esquive', 1]], prix: 3 },
    couronnefelee: { nom: 'Couronne fêlée', txt: '+1 mana à chaque tour, mais les ennemis commencent avec 1 Force.', eff: [['manaTour', 1], ['debutCombatEnnemis', 'force', 1]], prix: 4 },
    carte3: { nom: 'Carte du cartographe', txt: 'Les récompenses proposent 4 cartes.', eff: [['choixCartes', 1]], prix: 1 }
  };

  // ---------- ennemis ----------
  // m : liste de coups joués en cycle (ou au hasard si alea). Types : atk, def, buf, deb, atkdeb, soin, inv, atkdef.
  const ENNEMIS = {
    // Acte 1, Caves de suie
    chapardeur: { nom: 'Chapardeur', sprite: 'm-chapardeur', pv: [16, 20], m: [{ t: 'atk', v: 5 }, { t: 'atk', v: 4, n: 2 }, { t: 'def', v: 5 }], alea: true },
    diablotin: { nom: 'Diablotin', sprite: 'm-diablotin', pv: [12, 15], m: [{ t: 'atkdeb', v: 3, s: 'brulure', n2: 2 }, { t: 'atk', v: 6 }] },
    petitmort: { nom: 'Petit mort', sprite: 'm-petitmort', pv: [20, 24], m: [{ t: 'atk', v: 7 }, { t: 'buf', s: 'force', v: 1 }, { t: 'atk', v: 7 }], passif: ['regen', 2] },
    osselet: { nom: 'Osselet', sprite: 'm-osselet', pv: [18, 22], m: [{ t: 'atk', v: 6 }, { t: 'atkdef', v: 4, g: 5 }] },
    masque: { nom: 'Masque-de-suie', sprite: 'm-masque', pv: [46, 52], elite: true, m: [{ t: 'atk', v: 11 }, { t: 'deb', s: 'faible', v: 2 }, { t: 'atk', v: 5, n: 3 }], passif: ['colere', 1] },
    grincant: { nom: 'Grinçant', sprite: 'm-grincant', pv: [40, 44], elite: true, m: [{ t: 'atkdef', v: 7, g: 8 }, { t: 'atk', v: 13 }, { t: 'deb', s: 'suie', v: 2 }], passif: ['epines', 2] },
    // Acte 1, Marais cendré
    vaseux: { nom: 'Vaseux', sprite: 'm-vaseux', pv: [20, 24], m: [{ t: 'atkdeb', v: 4, s: 'poison', n2: 3 }, { t: 'def', v: 6 }, { t: 'atk', v: 7 }] },
    boueux: { nom: 'Boueux', sprite: 'm-boueux', pv: [24, 28], m: [{ t: 'def', v: 8 }, { t: 'atk', v: 9 }], passif: ['carapace', 3] },
    limacon: { nom: 'Limaçon', sprite: 'm-limacon', pv: [11, 14], m: [{ t: 'atk', v: 4 }, { t: 'deb', s: 'expose', v: 1 }] },
    limace: { nom: 'Grande limace', sprite: 'm-limace', pv: [26, 30], m: [{ t: 'atk', v: 8 }, { t: 'atkdeb', v: 4, s: 'faible', n2: 1 }, { t: 'soin', v: 6 }] },
    chaman: { nom: 'Chaman des tourbes', sprite: 'm-chaman', pv: [42, 46], elite: true, m: [{ t: 'inv', id: 'limacon' }, { t: 'atkdeb', v: 6, s: 'poison', n2: 4 }, { t: 'soin', v: 10 }, { t: 'atk', v: 12 }] },
    noye: { nom: 'Noyé', sprite: 'm-noye', pv: [52, 58], elite: true, m: [{ t: 'atk', v: 9 }, { t: 'atk', v: 9 }, { t: 'atk', v: 18 }], passif: ['regen', 3] },
    // Boss acte 1
    machefer: { nom: 'Le Mâchefer', sprite: 'm-machefer', pv: [110, 110], boss: true, m: [{ t: 'atk', v: 10 }, { t: 'def', v: 14 }, { t: 'atk', v: 6, n: 3 }, { t: 'buf', s: 'force', v: 2 }, { t: 'atk', v: 20 }], passif: ['carapace', 4] },
    ogre: { nom: 'L\'Ogre-fournaise', sprite: 'm-ogre', pv: [100, 100], boss: true, m: [{ t: 'atkdeb', v: 8, s: 'brulure', n2: 4 }, { t: 'atk', v: 14 }, { t: 'inv', id: 'diablotin' }, { t: 'atk', v: 5, n: 3 }], passif: ['colere', 1] },
    // Acte 2, Crypte
    osancien: { nom: 'Osselet ancien', sprite: 'm-osancien', pv: [32, 36], m: [{ t: 'atk', v: 9 }, { t: 'atkdef', v: 6, g: 8 }, { t: 'atk', v: 4, n: 3 }] },
    creux: { nom: 'Veilleur creux', sprite: 'm-creux', pv: [36, 40], m: [{ t: 'atkdeb', v: 7, s: 'faible', n2: 2 }, { t: 'atk', v: 12 }], passif: ['regen', 3] },
    necromant: { nom: 'Nécromant', sprite: 'm-necromant', pv: [30, 34], m: [{ t: 'inv', id: 'osselet' }, { t: 'deb', s: 'suie', v: 2 }, { t: 'atk', v: 10 }] },
    cornu: { nom: 'Cornu', sprite: 'm-cornu', pv: [34, 38], m: [{ t: 'atk', v: 11 }, { t: 'buf', s: 'force', v: 2 }, { t: 'atk', v: 6, n: 2 }] },
    soudard: { nom: 'Soudard', sprite: 'm-soudard', pv: [70, 76], elite: true, m: [{ t: 'atk', v: 16 }, { t: 'def', v: 12 }, { t: 'atk', v: 7, n: 3 }], passif: ['colere', 1] },
    courge: { nom: 'Tête-de-courge', sprite: 'm-courge', pv: [64, 70], elite: true, m: [{ t: 'deb', s: 'expose', v: 2 }, { t: 'atk', v: 14 }, { t: 'atkdeb', v: 8, s: 'brulure', n2: 5 }], passif: ['explose', 12] },
    // Acte 2, Galeries de givre
    gele: { nom: 'Gelé', sprite: 'm-gele', pv: [34, 38], m: [{ t: 'atk', v: 10 }, { t: 'atkdeb', v: 6, s: 'faible', n2: 1 }], passif: ['carapace', 4] },
    diabgivre: { nom: 'Diablotin de givre', sprite: 'm-diabgivre', pv: [22, 26], m: [{ t: 'atk', v: 5, n: 2 }, { t: 'deb', s: 'expose', v: 2 }] },
    grinvre: { nom: 'Grinçant de givre', sprite: 'm-grinvre', pv: [38, 42], m: [{ t: 'atkdef', v: 8, g: 8 }, { t: 'atk', v: 13 }], passif: ['epines', 2] },
    limgivre: { nom: 'Limace de givre', sprite: 'm-limgivre', pv: [40, 44], m: [{ t: 'atk', v: 9 }, { t: 'soin', v: 8 }, { t: 'atk', v: 12 }] },
    fige: { nom: 'Chevalier figé', sprite: 'm-fige', pv: [76, 82], elite: true, m: [{ t: 'def', v: 16 }, { t: 'atk', v: 18 }, { t: 'atk', v: 9, n: 2 }], passif: ['carapace', 6] },
    masgivre: { nom: 'Masque de givre', sprite: 'm-masgivre', pv: [62, 68], elite: true, m: [{ t: 'deb', s: 'faible', v: 2 }, { t: 'atk', v: 6, n: 3 }, { t: 'atk', v: 15 }], passif: ['colere', 1] },
    // Boss acte 2
    colosse: { nom: 'Le Colosse de givre', sprite: 'm-colosse', pv: [190, 190], boss: true, m: [{ t: 'def', v: 20 }, { t: 'atk', v: 22 }, { t: 'deb', s: 'faible', v: 2 }, { t: 'atk', v: 8, n: 3 }], passif: ['carapace', 6] },
    gueule: { nom: 'La Gueule', sprite: 'm-gueule', pv: [175, 175], boss: true, m: [{ t: 'atk', v: 14 }, { t: 'inv', id: 'diabgivre' }, { t: 'atkdeb', v: 10, s: 'suie', n2: 2 }, { t: 'buf', s: 'force', v: 3 }, { t: 'atk', v: 6, n: 4 }], passif: ['regen', 4] },
    // Acte 3, Cœur du foyer
    cornard: { nom: 'Cornu ardent', sprite: 'm-cornard', pv: [52, 58], m: [{ t: 'atk', v: 14 }, { t: 'buf', s: 'force', v: 2 }, { t: 'atkdeb', v: 8, s: 'brulure', n2: 4 }] },
    diabfeu: { nom: 'Diablotin ardent', sprite: 'm-diabfeu', pv: [30, 34], m: [{ t: 'atkdeb', v: 6, s: 'brulure', n2: 3 }, { t: 'atk', v: 9 }] },
    brule: { nom: 'Soudard brûlé', sprite: 'm-brule', pv: [56, 62], m: [{ t: 'atk', v: 16 }, { t: 'def', v: 14 }, { t: 'atk', v: 8, n: 2 }], passif: ['colere', 1] },
    grinfeu: { nom: 'Grinçant ardent', sprite: 'm-grinfeu', pv: [48, 54], m: [{ t: 'atkdef', v: 10, g: 10 }, { t: 'atk', v: 15 }], passif: ['epines', 3] },
    coffre: { nom: 'Coffre-gueule', sprite: 'm-coffre', pv: [96, 104], elite: true, m: [{ t: 'atk', v: 20 }, { t: 'def', v: 18 }, { t: 'atk', v: 9, n: 3 }], passif: ['carapace', 6] },
    dechu: { nom: 'Ange déchu', sprite: 'm-dechu', pv: [84, 90], elite: true, m: [{ t: 'deb', s: 'expose', v: 2 }, { t: 'atk', v: 12, n: 2 }, { t: 'soin', v: 16 }], passif: ['regen', 5] },
    // Boss acte 3
    devoreur: { nom: 'Le Dévoreur de braises', sprite: 'm-devoreur', pv: [280, 280], boss: true, m: [{ t: 'atk', v: 18 }, { t: 'atkdeb', v: 10, s: 'brulure', n2: 6 }, { t: 'buf', s: 'force', v: 3 }, { t: 'atk', v: 7, n: 4 }, { t: 'inv', id: 'diabfeu' }], passif: ['colere', 1] },
    eteigneur: { nom: 'L\'Éteigneur', sprite: 'm-eteigneur', pv: [300, 300], boss: true, m: [{ t: 'def', v: 24 }, { t: 'atk', v: 26 }, { t: 'deb', s: 'suie', v: 3 }, { t: 'atk', v: 10, n: 3 }, { t: 'deb', s: 'faible', v: 3 }], passif: ['carapace', 8] }
  };

  const PASSIFS = {
    regen: (n) => `Régénère ${n} PV à la fin de son tour.`,
    carapace: (n) => `Gagne ${n} garde au début de son tour.`,
    colere: (n) => `Gagne ${n} Force à chaque tour.`,
    epines: (n) => `Épines ${n} : te renvoie ${n} dégâts par coup.`,
    explose: (n) => `En mourant, explose et t'inflige ${n} dégâts.`
  };

  // ---------- mondes ----------
  const MONDES = {
    caves: { nom: 'Caves de suie', acte: 1, bg: 'bg-caves', normaux: [['chapardeur'], ['diablotin', 'diablotin'], ['petitmort'], ['osselet', 'diablotin'], ['chapardeur', 'osselet']], faciles: [['chapardeur'], ['osselet'], ['diablotin']], elites: [['masque'], ['grincant']] },
    marais: { nom: 'Marais cendré', acte: 1, bg: 'bg-marais', normaux: [['vaseux'], ['boueux'], ['limacon', 'limacon'], ['limace'], ['vaseux', 'limacon']], faciles: [['vaseux'], ['limacon', 'limacon'], ['boueux']], elites: [['chaman'], ['noye']] },
    crypte: { nom: 'Crypte des veilleurs', acte: 2, bg: 'bg-crypte', normaux: [['osancien', 'osselet'], ['creux'], ['necromant', 'osselet'], ['cornu'], ['creux', 'osselet']], elites: [['soudard'], ['courge']] },
    givre: { nom: 'Galeries de givre', acte: 2, bg: 'bg-givre', normaux: [['gele'], ['diabgivre', 'diabgivre'], ['grinvre'], ['limgivre'], ['gele', 'diabgivre']], elites: [['fige'], ['masgivre']] },
    foyer: { nom: 'Cœur du foyer', acte: 3, bg: 'bg-foyer', normaux: [['cornard'], ['diabfeu', 'diabfeu'], ['brule'], ['grinfeu', 'diabfeu'], ['cornard', 'diabfeu']], elites: [['coffre'], ['dechu']] }
  };
  const ACTES = [
    { mondes: ['caves', 'marais'], boss: ['machefer', 'ogre'] },
    { mondes: ['crypte', 'givre'], boss: ['colosse', 'gueule'] },
    { mondes: ['foyer'], boss: ['devoreur', 'eteigneur'] }
  ];

  // ---------- talents génériques (montée de niveau) ----------
  const TALENTS = [
    { id: 't-pv', nom: 'Endurance', txt: '+8 PV max (et soigne 8).', eff: [['pvMax', 8]] },
    { id: 't-force', nom: 'Muscles', txt: '+1 Force au début des combats.', eff: [['debutCombat', 'force', 1]] },
    { id: 't-garde', nom: 'Réflexes', txt: '+6 garde au début des combats.', eff: [['debutCombat', 'garde', 6]] },
    { id: 't-mana', nom: 'Vivacité', txt: '+1 mana au premier tour de chaque combat.', eff: [['premierTourMana', 1]] },
    { id: 't-soin', nom: 'Second souffle', txt: 'Soigne 4 PV à la fin de chaque combat.', eff: [['finCombatSoin', 4]] },
    { id: 't-or', nom: 'Flair', txt: '+25 % d\'or.', eff: [['orBonus', 25]] },
    { id: 't-lame', nom: 'Fil de lame', txt: 'Tes Lames infligent +1 dégât.', eff: [['lamePlus', 1]] },
    { id: 't-sortgarde', nom: 'Parade magique', txt: 'Chaque Sort donne 1 garde.', eff: [['sortGarde', 1]] },
    { id: 't-epines', nom: 'Peau rêche', txt: '+2 Épines au début des combats.', eff: [['debutCombat', 'epines', 2]] }
  ];

  const EVENEMENTS = [
    { id: 'autel', titre: 'L\'autel tiède', txt: 'Une pierre plate, encore chaude, porte des traces de mains. On dit qu\'elle prend un peu de sang pour rendre un peu de force.', choix: [
      { txt: 'Poser la main (perds 6 PV, une carte rare au choix)', eff: [['pv', -6], ['carteRare']] },
      { txt: 'Prier (soigne 10 PV)', eff: [['pv', 10]] },
      { txt: 'Passer son chemin', eff: [] }] },
    { id: 'colporteur', titre: 'Le colporteur égaré', txt: 'Un vieil homme cherche la sortie. Il propose ce qu\'il a sur le dos contre un peu d\'or.', choix: [
      { txt: 'Acheter un talisman (60 or)', cond: ['or', 60], eff: [['or', -60], ['talisman']] },
      { txt: 'Lui indiquer le chemin (+1 éclat)', eff: [['eclats', 1]] },
      { txt: 'Le délester (+40 or, une Suie dans le paquet)', eff: [['or', 40], ['ajoute', 'suie']] }] },
    { id: 'source', titre: 'La source gelée', txt: 'Sous la glace, une eau claire bouge encore. Ton reflet a l\'air reposé.', choix: [
      { txt: 'Boire (+5 PV max)', eff: [['pvMax', 5]] },
      { txt: 'Y tremper une carte (affûte une carte au hasard)', eff: [['affuteAlea']] }] },
    { id: 'forge', titre: 'La forge abandonnée', txt: 'Le soufflet marche encore. Il reste du charbon pour une seule pièce.', choix: [
      { txt: 'Affûter une carte au choix', eff: [['affute']] },
      { txt: 'Fondre une carte (la retirer du paquet)', eff: [['retire']] }] },
    { id: 'jeu', titre: 'Les dés d\'os', txt: 'Deux squelettes jouent aux dés sur une caisse. Ils te font signe de t\'asseoir.', choix: [
      { txt: 'Miser 30 or (une chance sur deux de gagner 80)', cond: ['or', 30], eff: [['pari']] },
      { txt: 'Refuser poliment', eff: [] }] },
    { id: 'nid', titre: 'Le nid de lucioles', txt: 'Un essaim tourne autour d\'une lanterne brisée. Elles se posent sur ton épaule.', choix: [
      { txt: 'Les emmener (ajoute la carte Luciole)', eff: [['ajoute', 'luciole']] },
      { txt: 'Les laisser (soigne 6 PV)', eff: [['pv', 6]] }] },
    { id: 'statue', titre: 'La statue sans visage', txt: 'Une statue tend une main ouverte. Dans l\'autre, une pierre bleue luit.', choix: [
      { txt: 'Prendre la pierre (+2 éclats, un combat difficile ensuite)', eff: [['eclats', 2], ['elite']] },
      { txt: 'Déposer une pièce (−15 or, +15 XP)', cond: ['or', 15], eff: [['or', -15], ['xp', 15]] }] }
  ];

  const D = { TRIBUS, STATUTS, CLASSES, CARTES: C, TALISMANS, ENNEMIS, PASSIFS, MONDES, ACTES, TALENTS, EVENEMENTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
  else racine.BraisesDonnees = D;
})(typeof window !== 'undefined' ? window : globalThis);
