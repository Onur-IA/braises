/* Braises V9 (base V6) : données du jeu (classes, cartes, ennemis, talismans, événements).
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
    rouages: { nom: 'Rouages', txt: 'À 5 Rouages, Bram forge un Rivet.', bon: true },
    sauvage: { nom: 'Forme sauvage', txt: '+1 Force et +2 Épines pour le combat.', bon: true },
    cadence: { nom: 'Cadence', txt: 'Ressource de Vesper : alterner Lame et Sort la remplit.', bon: true },
    echo: { nom: 'Écho', txt: 'La prochaine carte jouée l\'est deux fois.', bon: true },
    ardeur: { nom: 'Ardeur', txt: 'Chaque carte jouée inflige autant de dégâts à tous les ennemis.', bon: true },
    fragile: { nom: 'Fragile', txt: 'Gagne 25 % de garde en moins. Baisse de 1 par tour.' },
    vol: { nom: 'Larcin', txt: 'Or volé, rendu si l\'ennemi meurt.' }
  };

  // ---------- classes ----------
  const CLASSES = {
    solen: {
      nom: 'Solen', titre: 'la Gardienne de l\'âtre', pv: 42, couleur: '#f08a3c', sprite: 'h-solen', renom: 1,
      resume: 'Chaque Sort attise la Chaleur, que ses Lames dépensent.',
      comp: { nom: 'Foyer', rangs: ['Chaque Sort joué donne 1 Chaleur.', 'Les Lames infligent +1 dégât par 4 Chaleur.', 'Début de tour : +1 Chaleur si tu as joué un Sort au tour précédent.'] },
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
      nom: 'Fumée', titre: 'la Voile-grise', pv: 50, couleur: '#9fb0c8', sprite: 'h-fumee', renom: 1,
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
      nom: 'Silex', titre: 'le Brisegivre', pv: 57, couleur: '#7cc8ee', sprite: 'h-silex', renom: 1,
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
      nom: 'Ivra', titre: 'la Tireuse de cendres', pv: 62, couleur: '#6fd6b8', sprite: 'h-ivra', renom: 2,
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
      nom: 'Bram', titre: 'le Forgeron', pv: 54, couleur: '#c9a26a', sprite: 'h-bram', renom: 3,
      resume: 'Ses cartes font tourner les Rouages, qui forgent des Rivets.',
      comp: { nom: 'Forge', rangs: ['Chaque carte donne 1 Rouage. À 5, ajoute un Rivet en main.', 'Le Rivet devient un Rivet trempé.', 'Les cartes Forgés donnent 2 Rouages.'] },
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
      nom: 'Lierre', titre: 'la Sauvage', pv: 52, couleur: '#7ccf5a', sprite: 'h-lierre', renom: 4,
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
      nom: 'Ossian', titre: 'le Veilleur des cendres', pv: 59, couleur: '#a97ce0', sprite: 'h-ossian', renom: 6,
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
    ,vesper: {
      nom: 'Vesper', titre: 'l\'Horlogère', pv: 66, couleur: '#e0c060', sprite: 'h-vesper', renom: 7,
      resume: 'Alterne Lames et Sorts pour remonter sa Cadence, puis rejoue ses cartes en Écho.',
      comp: { nom: 'Cadence', rangs: ['Alterner Lame et Sort donne 1 Cadence. À 3 Cadence : ta prochaine carte est jouée deux fois (Écho).', 'Chaque Écho donne aussi 4 garde.', 'L\'Écho vient dès 2 Cadence.'] },
      depart: ['frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'aiguille', 'aiguille', 'balancier', 'balancier'],
      heritages: [
        { nom: 'Ressort', txt: '+2 Cadence au début des combats.', eff: [['debutCombat', 'cadence', 2]] },
        { nom: 'Mouvement suisse', txt: '+1 mana au premier tour de chaque combat.', eff: [['premierTourMana', 1]] },
        { nom: 'Boîtier d\'acier', txt: '+6 garde au début des combats et +4 PV max.', eff: [['debutCombat', 'garde', 6], ['pvMax', 4]] }
      ],
      talents: [
        { id: 't-vesper1', nom: 'Tic-tac', txt: 'Début de combat : 1 Écho.', eff: [['debutCombat', 'echo', 1]] },
        { id: 't-vesper2', nom: 'Grande aiguille', txt: 'Tes Lames infligent +2 après un Sort.', eff: [['alternePlus', 2]] }
      ]
    },
    nacre: {
      nom: 'Nacre', titre: 'la Prêteuse sur gages', pv: 47, couleur: '#7fd0c0', sprite: 'h-nacre', renom: 8,
      resume: 'Paie en or ses meilleurs coups : chaque pièce de la course devient une arme.',
      comp: { nom: 'Usure', rangs: ['Chaque ennemi vaincu rapporte 6 or, chaque combat gagné 10 or. Début de combat : 1 garde par 25 or (au plus 8) et 1 Force par 120 or (au plus 2). Certaines cartes se paient en or.', 'La garde de départ passe à 1 par 12 or (au plus 15).', 'Les cartes payées en or coûtent 40 % de moins.'] },
      depart: ['frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'mercenaire', 'bourselestee', 'bourselestee', 'dividende'],
      orDepart: 60,
      heritages: [
        { nom: 'Héritage', txt: '+80 or au départ.', eff: [['orDepart', 80]] },
        { nom: 'Bourse cloutée', txt: '+6 garde au début des combats.', eff: [['debutCombat', 'garde', 6]] },
        { nom: 'Créance', txt: 'Fin de chaque combat : +8 or.', eff: [['orFinCombat', 8]] }
      ],
      talents: [
        { id: 't-nacre1', nom: 'Coffre-fort', txt: '+60 or tout de suite (et ensuite +10 % d\'or).', eff: [['orBonus', 10], ['orImmediat', 60]] },
        { id: 't-nacre2', nom: 'Rentière', txt: 'Fin de chaque combat : +10 or.', eff: [['orFinCombat', 10]] }
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
  carte({ id: 'embrasement', nom: 'Embrasement', t: 'L', cl: 'solen', r: 'E', c: 2, cib: 'e', v: [[6, 4], [8, 5]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par Chaleur. Dépense toute la Chaleur.`, f: (x, v) => { const ch = x.st('chaleur'); x.deg(v[0] + v[1] * ch); x.soi('chaleur', -ch); } });
  // Fumée
  carte({ id: 'voile', nom: 'Voile', t: 'S', cl: 'fumee', depart: true, v: [[5, 1], [7, 1]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Brume.`, f: (x, v) => { x.garde(v[0]); x.soi('brume', v[1]); } });
  carte({ id: 'suffocation', nom: 'Suffocation', t: 'L', cl: 'fumee', cib: 'e', depart: true, v: [[5, 1], [7, 2]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Faiblesse.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'faible', v[1]); } });
  carte({ id: 'nuee', nom: 'Nuée grise', t: 'S', cl: 'fumee', cib: 'tous', v: [[2], [3]], txt: (v) => `Applique ${v[0]} Faiblesse à tous les ennemis.`, f: (x, v) => x.statutTous('faible', v[0]) });
  carte({ id: 'ombre', nom: 'Coup de l\'ombre', t: 'L', cl: 'fumee', r: 'P', cib: 'e', v: [[6], [8]], txt: (v) => `Inflige ${v[0]} dégâts, le double si la cible est Faible.`, f: (x, v) => x.deg(x.cible && x.cible.st.faible ? v[0] * 2 : v[0]) });
  carte({ id: 'disparition', nom: 'Disparition', t: 'S', cl: 'fumee', r: 'E', v: [[1, 1], [1, 0]], txt: (v) => `Gagne ${v[0]} Esquive.${v[1] ? ' Consumer.' : ''}`, exilSi: (v) => !!v[1], f: (x, v) => x.soi('esquive', v[0]) });
  // Silex
  carte({ id: 'givrelame', nom: 'Givre-lame', t: 'L', cl: 'silex', cib: 'e', depart: true, v: [[5, 1], [7, 1]], txt: (v) => `Inflige ${v[0]} dégâts. Applique ${v[1]} Gel de plus.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'gel', v[1]); } });
  carte({ id: 'briser', nom: 'Briser', t: 'L', cl: 'silex', cib: 'e', depart: true, sansGel: true, v: [[4], [5]], txt: (v) => `Inflige ${v[0]} dégâts par Gel de la cible (au moins 1), puis retire son Gel.`, f: (x, v) => x.briser(v[0]) });
  carte({ id: 'gangue', nom: 'Gangue', t: 'S', cl: 'silex', cib: 'tous', v: [[6, 1], [8, 1]], txt: (v) => `Gagne ${v[0]} garde. Applique ${v[1]} Gel à tous les ennemis.`, f: (x, v) => { x.garde(v[0]); x.statutTous('gel', v[1]); } });
  carte({ id: 'cristal', nom: 'Cristallisation', t: 'S', cl: 'silex', r: 'P', cib: 'e', v: [[0], [2]], txt: (v) => `Double le Gel de la cible${v[0] ? ', puis +' + v[0] : ''}.`, f: (x, v) => { if (x.cible) x.statut(x.cible, 'gel', (x.cible.st.gel || 0) + v[0]); } });
  carte({ id: 'avalanche', nom: 'Avalanche', t: 'L', cl: 'silex', r: 'E', c: 2, cib: 'tous', sansGel: true, v: [[3], [4]], txt: (v) => `Inflige à chaque ennemi ${v[0]} dégâts par Gel qu'il porte (au moins 2), sans le retirer.`, f: (x, v) => { x.ennemisVivants().forEach((e) => x.deg(v[0] * Math.max(2, e.st.gel || 0), e)); } });
  // Ivra
  carte({ id: 'tir', nom: 'Tir', t: 'L', cl: 'ivra', cib: 'e', depart: true, v: [[5], [8]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'encoche', nom: 'Encoche', t: 'S', cl: 'ivra', depart: true, v: [[2, 3], [3, 4]], txt: (v) => `Gagne ${v[0]} Flèches et ${v[1]} garde.`, f: (x, v) => { x.soi('fleches', v[0]); x.garde(v[1]); } });
  carte({ id: 'volee', nom: 'Volée', t: 'S', cl: 'ivra', v: [[4], [6]], txt: (v) => `Gagne ${v[0]} Flèches.`, f: (x, v) => x.soi('fleches', v[0]) });
  carte({ id: 'percant', nom: 'Tir perçant', t: 'L', cl: 'ivra', r: 'P', cib: 'e', v: [[8, 1], [11, 2]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Exposé.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'expose', v[1]); } });
  carte({ id: 'cielacier', nom: 'Ciel d\'acier', t: 'S', cl: 'ivra', r: 'E', v: [[1, 1], [1, 0]], txt: (v) => `Décoche tes Flèches tout de suite, deux fois (elles restent encochées).${v[1] ? ' Consumer.' : ''}`, exilSi: (v) => !!v[1], f: (x) => { x.decocher(); x.decocher(); } });
  // Bram
  carte({ id: 'marteau', nom: 'Marteau', t: 'L', cl: 'bram', tr: 'forge', cib: 'e', depart: true, v: [[6], [9]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'enclume', nom: 'Enclume', t: 'S', cl: 'bram', tr: 'forge', depart: true, v: [[6], [9]], txt: (v) => `Gagne ${v[0]} garde.`, f: (x, v) => x.garde(v[0]) });
  carte({ id: 'soufflerie', nom: 'Soufflerie', t: 'L', cl: 'bram', tr: 'forge', cib: 'tous', v: [[4], [6]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis.`, f: (x, v) => x.degTous(v[0]) });
  carte({ id: 'mecanisme', nom: 'Mécanisme', t: 'S', cl: 'bram', tr: 'forge', r: 'P', c: 0, v: [[2, 1], [3, 1]], txt: (v) => `Gagne ${v[0]} Rouages. Pioche ${v[1]} carte.`, f: (x, v) => { x.rouages(v[0]); x.pioche(v[1]); } });
  carte({ id: 'golem', nom: 'Golem de forge', t: 'S', cl: 'bram', tr: 'forge', r: 'E', c: 2, exil: true, v: [[12, 2], [16, 3]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Robustesse. Consumer.`, f: (x, v) => { x.garde(v[0]); x.soi('robustesse', v[1]); } });
  // Lierre
  carte({ id: 'ronce', nom: 'Ronce', t: 'S', cl: 'lierre', depart: true, v: [[3, 1], [5, 2]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Épine${v[1] > 1 ? 's' : ''}.`, f: (x, v) => { x.garde(v[0]); x.soi('epines', v[1]); } });
  carte({ id: 'griffe', nom: 'Griffe', t: 'L', cl: 'lierre', tr: 'bete', cib: 'e', depart: true, v: [[6], [9]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'sevemontante', nom: 'Sève montante', t: 'S', cl: 'lierre', v: [[3, 2], [4, 3]], txt: (v) => `Gagne ${v[0]} Sève. Soigne ${v[1]} PV.`, f: (x, v) => { x.seve(v[0]); x.soin(v[1]); } });
  carte({ id: 'ecorce', nom: 'Écorce', t: 'S', cl: 'lierre', r: 'P', v: [[3, 2], [5, 2]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Épine.`, f: (x, v) => x.garde(v[0] + v[1] * x.st('epines')) });
  carte({ id: 'rugissement', nom: 'Rugissement', t: 'L', cl: 'lierre', tr: 'bete', r: 'E', c: 2, cib: 'tous', v: [[6, 11], [8, 15]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis (${v[1]} en Forme sauvage).`, f: (x, v) => x.degTous(x.st('sauvage') ? v[1] : v[0]) });
  // Grenat
  carte({ id: 'hache', nom: 'Hache', t: 'L', cl: 'grenat', cib: 'e', depart: true, v: [[6], [9]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'saignee', nom: 'Saignée', t: 'L', cl: 'grenat', cib: 'e', depart: true, v: [[2, 10], [2, 14]], txt: (v) => `Perds ${v[0]} PV. Inflige ${v[1]} dégâts.`, f: (x, v) => { x.perdPV(v[0]); x.deg(v[1]); } });
  carte({ id: 'crideguerre', nom: 'Cri de guerre', t: 'S', cl: 'grenat', c: 0, v: [[3, 1], [2, 1]], txt: (v) => `Perds ${v[0]} PV. Gagne ${v[1]} mana (Surcharge).`, f: (x, v) => { x.perdPV(v[0]); x.mana(v[1]); } });
  carte({ id: 'frenesie', nom: 'Frénésie', t: 'L', cl: 'grenat', r: 'P', cib: 'e', v: [[3], [4]], txt: (v) => `Inflige ${v[0]} dégâts, une fois de plus par 2 Rage.`, f: (x, v) => { const n = 1 + Math.floor(x.st('rage') / 2); for (let i = 0; i < n; i++) x.deg(v[0]); } });
  carte({ id: 'derniersouffle', nom: 'Dernier souffle', t: 'L', cl: 'grenat', r: 'E', c: 2, cib: 'e', v: [[2], [1.5]], txt: (v) => `Inflige des dégâts égaux à tes PV manquants divisés par ${v[0]}.`, f: (x, v) => x.deg(Math.floor((x.run.pvMax - x.run.pv) / v[0])) });
  // Ossian
  carte({ id: 'osbrise', nom: 'Os brisé', t: 'L', cl: 'ossian', cib: 'e', depart: true, exil: true, v: [[9], [12]], txt: (v) => `Inflige ${v[0]} dégâts. Consumer.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'liberation', nom: 'Libération', t: 'L', cl: 'ossian', cib: 'e', depart: true, v: [[5], [7]], txt: (v) => `Inflige ${v[0]} dégâts par Âme (au moins 3), puis dépense les Âmes.`, f: (x, v) => { const a = x.st('ames'); x.deg((v[0] + x.eff('liberationPlus')) * Math.max(3, a)); x.soi('ames', -a); } });
  carte({ id: 'ritefunebre', nom: 'Rite funèbre', t: 'S', cl: 'ossian', exil: true, v: [[5, 1], [7, 2]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Âme${v[1] > 1 ? 's' : ''}. Consumer.`, f: (x, v) => { x.garde(v[0]); x.ame(v[1]); } });
  carte({ id: 'ossuaire', nom: 'Ossuaire', t: 'S', cl: 'ossian', r: 'P', v: [[3, 2], [5, 3]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Âme.`, f: (x, v) => x.garde(v[0] + v[1] * x.st('ames')) });
  carte({ id: 'faucheuse', nom: 'Faucheuse', t: 'L', cl: 'ossian', r: 'E', c: 2, cib: 'tous', v: [[2], [3]], txt: (v) => `Inflige à tous les ennemis ${v[0]} dégâts par Âme (au moins 3), sans les dépenser.`, f: (x, v) => x.degTous(v[0] * Math.max(3, x.st('ames'))) });

  // Vesper
  carte({ id: 'aiguille', nom: 'Aiguille', t: 'L', cl: 'vesper', cib: 'e', depart: true, v: [[5, 4], [7, 5]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} si ta carte précédente était un Sort.`, f: (x, v) => x.deg(v[0] + (x.precedent() === 'S' ? v[1] + x.eff('alternePlus') : 0)) });
  carte({ id: 'balancier', nom: 'Balancier', t: 'S', cl: 'vesper', depart: true, v: [[4, 4], [6, 5]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} si ta carte précédente était une Lame.`, f: (x, v) => x.garde(v[0] + (x.precedent() === 'L' ? v[1] : 0)) });
  carte({ id: 'remontoir', nom: 'Remontoir', t: 'S', cl: 'vesper', c: 0, v: [[1, 1], [2, 1]], txt: (v) => `Gagne ${v[0]} Cadence. Pioche ${v[1]} carte.`, f: (x, v) => { x.cadence(v[0]); x.pioche(v[1]); } });
  carte({ id: 'pendule', nom: 'Pendule', t: 'L', cl: 'vesper', cib: 'tous', v: [[4, 1], [6, 1]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis. Gagne ${v[1]} Cadence.`, f: (x, v) => { x.degTous(v[0]); x.cadence(v[1]); } });
  carte({ id: 'carillon', nom: 'Carillon', t: 'S', cl: 'vesper', r: 'P', v: [[1, 0], [1, 1]], txt: (v) => `Ta prochaine carte est jouée deux fois (Écho).${v[1] ? ' Pioche 1 carte.' : ''}`, f: (x, v) => { x.soi('echo', v[0]); if (v[1]) x.pioche(1); } });
  carte({ id: 'heure', nom: 'L\'Heure juste', t: 'L', cl: 'vesper', r: 'E', c: 2, cib: 'e', v: [[4], [5]], txt: (v) => `Inflige ${v[0]} dégâts par carte jouée ce tour (au moins 2).`, f: (x, v) => x.deg(v[0] * Math.max(2, x.jouesTour())) });
  // Nacre (le coût en or s'ajoute au mana : champ or)
  carte({ id: 'mercenaire', nom: 'Mercenaire', t: 'L', cl: 'nacre', cib: 'e', c: 0, or: 10, depart: true, v: [[14], [19]], txt: (v) => `Paie 10 or : inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'bourselestee', nom: 'Bourse lestée', t: 'L', cl: 'nacre', cib: 'e', depart: true, v: [[6, 12], [8, 10]], txt: (v) => `Inflige ${v[0]} dégâts, +1 par tranche de ${v[1]} or que tu portes (au plus +14).`, f: (x, v) => x.deg(v[0] + Math.min(14, Math.floor(x.run.or / v[1]))) });
  carte({ id: 'dividende', nom: 'Dividende', t: 'S', cl: 'nacre', depart: true, v: [[6, 7], [8, 10]], txt: (v) => `Gagne ${v[0]} garde. Fin du combat : +${v[1]} or.`, f: (x, v) => { x.garde(v[0]); x.orFin(v[1]); } });
  carte({ id: 'escorte', nom: 'Escorte', t: 'S', cl: 'nacre', c: 0, or: 10, v: [[12], [16]], txt: (v) => `Paie 10 or : gagne ${v[0]} garde.`, f: (x, v) => x.garde(v[0]) });
  carte({ id: 'rancon', nom: 'Rançon', t: 'L', cl: 'nacre', cib: 'e', v: [[7, 12], [10, 15]], txt: (v) => `Inflige ${v[0]} dégâts. Si la cible meurt : +${v[1]} or.`, f: (x, v) => { const e = x.cible; x.deg(v[0]); if (e && e.pv <= 0) x.gagnerOr(v[1]); } });
  carte({ id: 'potdevin', nom: 'Pot-de-vin', t: 'S', cl: 'nacre', r: 'P', cib: 'e', c: 0, or: 20, v: [[1], [2]], txt: (v) => `Paie 20 or : la cible (pas un boss) renonce à son action ce tour.${v[0] > 1 ? ' Pioche 1 carte.' : ''}`, f: (x, v) => { x.annulerIntent(x.cible); if (v[0] > 1) x.pioche(1); } });
  carte({ id: 'banqueroute', nom: 'Banqueroute', t: 'L', cl: 'nacre', r: 'E', cib: 'e', v: [[60, 2], [80, 2]], txt: (v) => `Dépense jusqu'à ${v[0]} or : 1 dégât par ${v[1]} or dépensé.`, f: (x, v) => { const o = Math.min(v[0], x.run.or); x.gagnerOr(-o); x.deg(Math.floor(o / v[1])); } });

  // ---------- V8 : cartes de synergie (classes, tribus, quêtes, épiques, légendaires) ----------
  // Solen : Chaleur
  carte({ id: 'fournaise', nom: 'Fournaise', t: 'L', cl: 'solen', cib: 'e', v: [[4, 2], [6, 3]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Brûlure. Gagne 1 Chaleur.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'brulure', v[1]); x.soi('chaleur', 1); } });
  carte({ id: 'cendrier', nom: 'Cendrier', t: 'S', cl: 'solen', r: 'P', v: [[4, 2], [6, 3]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Chaleur (sans la dépenser).`, f: (x, v) => x.garde(v[0] + v[1] * x.st('chaleur')) });
  carte({ id: 'soleilnoir', nom: 'Soleil noir', t: 'L', cl: 'solen', r: 'R', cib: 'tous', v: [[4, 2], [6, 3]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis, +1 par Chaleur. ${v[1]} Brûlure à tous.`, f: (x, v) => { x.degTous(v[0] + x.st('chaleur')); x.statutTous('brulure', v[1]); } });
  // Fumée : Brume et Faiblesse
  carte({ id: 'fumigene', nom: 'Fumigène', t: 'S', cl: 'fumee', cib: 'tous', v: [[1, 1, 4], [2, 1, 6]], txt: (v) => `${v[0]} Faiblesse à tous les ennemis. Gagne ${v[2]} garde et ${v[1]} Brume.`, f: (x, v) => { x.statutTous('faible', v[0]); x.garde(v[2]); x.soi('brume', v[1]); } });
  carte({ id: 'lameombre', nom: 'Lame d\'ombre', t: 'L', cl: 'fumee', r: 'P', c: 0, cib: 'e', v: [[3], [5]], txt: (v) => `Inflige ${v[0]} dégâts, le double si tu as de la Brume.`, f: (x, v) => x.deg(x.st('brume') ? v[0] * 2 : v[0]) });
  carte({ id: 'eclipse', nom: 'Éclipse', t: 'S', cl: 'fumee', r: 'R', v: [[7, 2], [10, 3]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Brume. Pioche 1 carte.`, f: (x, v) => { x.garde(v[0]); x.soi('brume', v[1]); x.pioche(1); } });
  // Silex : Gel
  carte({ id: 'verglas', nom: 'Verglas', t: 'S', cl: 'silex', cib: 'e', v: [[4, 2], [6, 2]], txt: (v) => `Gagne ${v[0]} garde. ${v[1]} Gel à la cible.`, f: (x, v) => { x.garde(v[0]); x.statut(x.cible, 'gel', v[1]); } });
  carte({ id: 'pic', nom: 'Pic de givre', t: 'L', cl: 'silex', r: 'P', cib: 'e', sansGel: true, v: [[6, 2], [8, 3]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par Gel de la cible (sans le retirer).`, f: (x, v) => x.deg(v[0] + v[1] * ((x.cible && x.cible.st.gel) || 0)) });
  carte({ id: 'glacier', nom: 'Glacier', t: 'S', cl: 'silex', r: 'R', v: [[4, 2], [6, 3]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Gel sur les ennemis.`, f: (x, v) => x.garde(v[0] + v[1] * x.ennemisVivants().reduce((s, e) => s + (e.st.gel || 0), 0)) });
  // Ivra : Flèches et Exposé
  carte({ id: 'carquois', nom: 'Carquois plein', t: 'S', cl: 'ivra', v: [[2, 3], [3, 4]], txt: (v) => `Gagne ${v[0]} Flèches et ${v[1]} garde.`, f: (x, v) => { x.soi('fleches', v[0]); x.garde(v[1]); } });
  carte({ id: 'salve', nom: 'Salve', t: 'L', cl: 'ivra', r: 'P', cib: 'alea', v: [[1], [2]], txt: (v) => `Décoche tout de suite tes Flèches, puis gagne ${v[0]} Flèche${v[0] > 1 ? 's' : ''}.`, f: (x, v) => { x.decocher(); x.soi('fleches', v[0]); } });
  carte({ id: 'marque', nom: 'Marque du chasseur', t: 'S', cl: 'ivra', r: 'R', cib: 'e', v: [[2], [3]], txt: (v) => `${v[0]} Exposé à la cible. Gagne 1 Flèche par Exposé de la cible.`, f: (x, v) => { x.statut(x.cible, 'expose', v[0]); x.soi('fleches', (x.cible && x.cible.st.expose) || 0); } });
  // Bram : Rouages
  carte({ id: 'boulon', nom: 'Boulon', t: 'L', cl: 'bram', tr: 'forge', cib: 'e', v: [[6, 1], [8, 2]], txt: (v) => `Inflige ${v[0]} dégâts. Gagne ${v[1]} Rouage${v[1] > 1 ? 's' : ''}.`, f: (x, v) => { x.deg(v[0]); x.rouages(v[1]); } });
  carte({ id: 'chaudiere', nom: 'Chaudière', t: 'S', cl: 'bram', r: 'P', v: [[3, 3], [4, 5]], txt: (v) => `Gagne ${v[0]} Rouages et ${v[1]} garde.`, f: (x, v) => { x.rouages(v[0]); x.garde(v[1]); } });
  carte({ id: 'automate', nom: 'Automate', t: 'S', cl: 'bram', tr: 'forge', r: 'R', v: [[7, 2], [10, 3]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Rouages.`, f: (x, v) => { x.garde(v[0]); x.rouages(v[1]); } });
  // Lierre : Épines et Forme sauvage
  carte({ id: 'epineux', nom: 'Buisson épineux', t: 'S', cl: 'lierre', v: [[2, 2, 4], [3, 3, 6]], txt: (v) => `Gagne ${v[2]} garde, ${v[0]} Épines et ${v[1]} Sève.`, f: (x, v) => { x.garde(v[2]); x.soi('epines', v[0]); x.seve(v[1]); } });
  carte({ id: 'morsure', nom: 'Morsure de ronce', t: 'L', cl: 'lierre', r: 'P', cib: 'e', v: [[5, 2], [7, 3]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par Épine. Gagne 1 Épine et 1 Sève.`, f: (x, v) => { x.deg(v[0] + v[1] * x.st('epines')); x.soi('epines', 1); x.seve(1); } });
  carte({ id: 'fureurvert', nom: 'Fureur verte', t: 'L', cl: 'lierre', r: 'R', cib: 'e', v: [[7], [9]], txt: (v) => `Inflige ${v[0]} dégâts, deux fois en Forme sauvage. Sinon, gagne 2 Sève.`, f: (x, v) => { x.deg(v[0]); if (x.st('sauvage')) x.deg(v[0]); else x.seve(2); } });
  // Grenat : Rage et PV
  carte({ id: 'sacrifice', nom: 'Sacrifice', t: 'S', cl: 'grenat', c: 0, v: [[2, 2], [1, 2]], txt: (v) => `Perds ${v[0]} PV. Pioche ${v[1]} cartes. Gagne 1 Rage.`, f: (x, v) => { x.perdPV(v[0]); x.pioche(v[1]); x.soi('rage', 1); } });
  carte({ id: 'coleresang', nom: 'Colère de sang', t: 'L', cl: 'grenat', r: 'P', cib: 'e', v: [[5, 2], [7, 3]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par Rage.`, f: (x, v) => x.deg(v[0] + v[1] * x.st('rage')) });
  carte({ id: 'berserk', nom: 'Berserk', t: 'S', cl: 'grenat', r: 'R', v: [[2, 3], [3, 3]], txt: (v) => `Perds ${v[1]} PV. Gagne ${v[0]} Force et 2 Rage.`, f: (x, v) => { x.perdPV(v[1]); x.soi('force', v[0]); x.soi('rage', 2); } });
  // Ossian : Âmes et Consumer
  carte({ id: 'moisson', nom: 'Moisson', t: 'L', cl: 'ossian', cib: 'e', v: [[4, 2], [6, 3]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par Âme.`, f: (x, v) => x.deg(v[0] + v[1] * x.st('ames')) });
  carte({ id: 'linceul', nom: 'Linceul', t: 'S', cl: 'ossian', r: 'P', exil: true, v: [[11], [15]], txt: (v) => `Gagne ${v[0]} garde. Consumer.`, f: (x, v) => x.garde(v[0]) });
  carte({ id: 'requiem', nom: 'Requiem', t: 'L', cl: 'ossian', r: 'R', cib: 'tous', v: [[3, 2], [4, 3]], txt: (v) => `Inflige ${v[0]} dégâts à tous, +${v[1]} par carte consumée ce combat (au plus +16).`, f: (x, v) => x.degTous(v[0] + Math.min(16, v[1] * x.consumees())) });
  // Vesper : Cadence
  carte({ id: 'contretemps', nom: 'Contretemps', t: 'L', cl: 'vesper', cib: 'e', v: [[4], [5]], txt: (v) => `Inflige ${v[0]} dégâts, deux fois si ta carte précédente était un Sort.`, f: (x, v) => { x.deg(v[0]); if (x.precedent() === 'S') x.deg(v[0]); } });
  carte({ id: 'trotteuse', nom: 'Trotteuse', t: 'L', cl: 'vesper', r: 'P', c: 0, cib: 'e', v: [[2, 1], [3, 1]], txt: (v) => `Inflige ${v[0]} dégâts. Gagne ${v[1]} Cadence.`, f: (x, v) => { x.deg(v[0]); x.cadence(v[1]); } });
  carte({ id: 'minuit', nom: 'Minuit', t: 'S', cl: 'vesper', r: 'R', v: [[1, 2], [1, 4]], txt: (v) => `Ta prochaine carte est jouée deux fois (Écho). Gagne ${v[1]} garde.`, f: (x, v) => { x.soi('echo', v[0]); x.garde(v[1]); } });
  // Nacre : l'or comme arme
  carte({ id: 'creance', nom: 'Créance', t: 'S', cl: 'nacre', cib: 'e', v: [[2, 6], [2, 9]], txt: (v) => `${v[0]} Faiblesse à la cible. Fin du combat : +${v[1]} or.`, f: (x, v) => { x.statut(x.cible, 'faible', v[0]); x.orFin(v[1]); } });
  carte({ id: 'coffrefort', nom: 'Coffre-fort', t: 'S', cl: 'nacre', r: 'P', v: [[6, 5], [8, 8]], txt: (v) => `Gagne ${v[0]} garde. Fin du combat : +${v[1]} or.`, f: (x, v) => { x.garde(v[0]); x.orFin(v[1]); } });
  carte({ id: 'pluiedor', nom: 'Pluie d\'or', t: 'L', cl: 'nacre', r: 'R', cib: 'tous', v: [[7, 6], [10, 8]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis. Fin du combat : +${v[1]} or.`, f: (x, v) => { x.degTous(v[0]); x.orFin(v[1]); } });
  // Tribus
  carte({ id: 'traque', nom: 'Traque', t: 'L', tr: 'bete', cib: 'e', v: [[5, 1], [7, 1]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Exposé.`, f: (x, v) => { x.deg(v[0]); x.statut(x.cible, 'expose', v[1]); } });
  carte({ id: 'hurlement', nom: 'Hurlement', t: 'S', tr: 'bete', r: 'P', v: [[3], [2]], txt: (v) => `Gagne 1 Force par ${v[0]} Bêtes dans ton paquet (au moins 1).`, f: (x, v) => x.soi('force', Math.max(1, Math.floor(x.tribu('bete') / v[0]))) });
  carte({ id: 'trempe', nom: 'Trempe', t: 'S', tr: 'forge', r: 'P', v: [[5, 1], [7, 2]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} par Forgé dans ton paquet.`, f: (x, v) => x.garde(v[0] + v[1] * x.tribu('forge')) });
  carte({ id: 'lueur', nom: 'Lueur', t: 'S', tr: 'luciole', c: 0, v: [[2], [3]], txt: (v) => `Soigne ${v[0]} PV. Pioche 1 carte.`, f: (x, v) => { x.soin(v[0]); x.pioche(1); } });
  carte({ id: 'nuitclaire', nom: 'Nuit claire', t: 'S', tr: 'luciole', r: 'P', cib: 'tous', v: [[1, 1], [1, 2]], txt: (v) => `${v[0]} Faiblesse à tous. Soigne ${v[1]} PV par Luciole dans ton paquet.`, f: (x, v) => { x.statutTous('faible', v[0]); x.soin(v[1] * x.tribu('luciole')); } });
  carte({ id: 'cendreuse', nom: 'Pluie de cendres', t: 'L', tr: 'cendre', cib: 'tous', v: [[3, 1], [4, 2]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Brûlure à tous les ennemis.`, f: (x, v) => { x.degTous(v[0]); x.statutTous('brulure', v[1]); } });
  carte({ id: 'givrebrise', nom: 'Brise glacée', t: 'S', tr: 'givre', r: 'P', cib: 'tous', v: [[1, 2], [1, 3]], txt: (v) => `1 Gel à tous les ennemis. Gagne ${v[1]} garde par Givrin dans ton paquet.`, f: (x, v) => { x.statutTous('gel', v[0]); x.garde(v[1] * x.tribu('givre')); } });
  // Neutres : quêtes, épique, légendaire
  carte({ id: 'ecuyer', nom: 'Écuyer', t: 'L', cib: 'e', q: { k: 'tue', s: [4, 10], txt: 'vaincre des ennemis' }, v: [[5, 2], [7, 4], [10, 6]], txt: (v) => `Inflige ${v[0]} dégâts. Gagne ${v[1]} garde.`, f: (x, v) => { x.deg(v[0]); x.garde(v[1]); } });
  carte({ id: 'vigie', nom: 'Vigie', t: 'S', q: { k: 'garde', s: [60, 180], txt: 'gagner de la garde' }, v: [[5, 0], [7, 0], [9, 1]], txt: (v) => `Gagne ${v[0]} garde.${v[1] ? ' Pioche 1 carte.' : ''}`, f: (x, v) => { x.garde(v[0]); if (v[1]) x.pioche(1); } });
  carte({ id: 'riposte', nom: 'Riposte', t: 'L', r: 'P', cib: 'e', v: [[20], [30]], txt: (v) => `Inflige autant de dégâts que ta garde (au plus ${v[0]}).`, f: (x, v) => x.deg(Math.min(v[0], x.c.j.garde)) });
  carte({ id: 'oubli', nom: 'Oubli', t: 'S', r: 'R', c: 0, exil: true, v: [[2], [3]], txt: (v) => `Pioche ${v[0]} cartes. Consumer.`, f: (x, v) => x.pioche(v[0]) });
  carte({ id: 'cataclysme', nom: 'Cataclysme', t: 'L', r: 'E', c: 2, cib: 'tous', exil: true, v: [[13], [18]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis. Consumer.`, f: (x, v) => x.degTous(v[0]) });
  carte({ id: 'couronnebraise', nom: 'Couronne de braise', t: 'S', r: 'L', c: 2, exil: true, v: [[2, 2], [3, 2]], txt: (v) => `Gagne ${v[0]} Force. Tes ${v[1]} prochaines cartes sont jouées deux fois. Consumer.`, f: (x, v) => { x.soi('force', v[0]); x.soi('echo', v[1]); } });

  // Neutres épiques
  carte({ id: 'tempete', nom: 'Tempête d\'acier', t: 'L', r: 'E', c: 2, cib: 'alea', v: [[4, 4], [5, 5]], txt: (v) => `Inflige ${v[0]} dégâts ${v[1]} fois à des ennemis au hasard.`, f: (x, v) => { for (let i = 0; i < v[1]; i++) x.degAlea(v[0]); } });
  carte({ id: 'miroirgarde', nom: 'Bouclier miroir', t: 'S', r: 'E', v: [[0], [5]], txt: (v) => `Double ta garde${v[0] ? ', puis +' + v[0] : ''}.`, f: (x, v) => x.garde(x.c.j.garde + v[0]) });
  // Légendaires (une seule par paquet)
  carte({ id: 'coeurardent', nom: 'Cœur ardent', t: 'S', r: 'L', exil: true, v: [[2], [3]], txt: (v) => `Pour ce combat, chaque carte jouée inflige ${v[0]} dégâts à tous les ennemis. Consumer.`, f: (x, v) => x.soi('ardeur', v[0]) });
  carte({ id: 'miroir', nom: 'Miroir de cendre', t: 'S', r: 'L', v: [[1, 0], [0, 0]], c: 1, txt: (v) => `Rejoue l'effet de la dernière carte jouée ce combat.${v[0] ? '' : ' Coûte 0.'}`, coutV: (v) => v[0], f: (x) => x.rejouer() });
  carte({ id: 'rituel', nom: 'Rituel des braises', t: 'S', r: 'L', c: 0, exil: true, v: [[2, 2], [2, 3]], txt: (v) => `Gagne ${v[0]} mana (sans Surcharge) et pioche ${v[1]} cartes. Consumer.`, f: (x, v) => { x.manaBrut(v[0]); x.pioche(v[1]); } });
  carte({ id: 'avatar', nom: 'Avatar du foyer', t: 'S', r: 'L', c: 2, exil: true, v: [[3, 3], [4, 4]], txt: (v) => `Gagne ${v[0]} Force et ${v[1]} Robustesse. Consumer.`, f: (x, v) => { x.soi('force', v[0]); x.soi('robustesse', v[1]); } });
  carte({ id: 'dernierebraise', nom: 'Dernière braise', t: 'L', r: 'L', c: 2, cib: 'tous', v: [[10, 3], [14, 4]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis, +${v[1]} par carte consumée ce combat.`, f: (x, v) => x.degTous(v[0] + v[1] * x.consumees()) });

  // ---------- raretés ----------
  const RARETES = {
    C: { nom: 'Commune', couleur: '#9aa0a6' }, P: { nom: 'Peu commune', couleur: '#5cc25a' }, R: { nom: 'Rare', couleur: '#4a8ff0' },
    E: { nom: 'Épique', couleur: '#b066f0' }, L: { nom: 'Légendaire', couleur: '#f2c23a' }, M: { nom: 'Malédiction', couleur: '#555' }, G: { nom: 'Générée', couleur: '#8aa' }
  };
  // taux de tirage des cartes proposées (en %), selon la source
  const TAUX = {
    combat: { C: 58, P: 31, R: 8, E: 2.6, L: 0.4 },
    elite: { C: 18, P: 40, R: 27, E: 12, L: 3 },
    tresor: { C: 30, P: 38, R: 21, E: 9, L: 2 },
    boss: { C: 0, P: 0, R: 52, E: 38, L: 10 }
  };

  // ---------- reliques (gagnées sur les élites et les boss) ----------
  // src : 'E' (élite) ou 'B' (boss). Les effets sont lus par le moteur (clé eff).
  const RELIQUES = {
    mechelente: { nom: 'Mèche lente', src: 'E', ico: 738, txt: 'Les cartes que tu ne joues pas restent en main au tour suivant.', eff: [['garderMain', 1]] },
    gardelame: { nom: 'Garde-lame', src: 'E', ico: 236, txt: 'Chaque Lame jouée donne 2 garde.', eff: [['lameGarde', 2]] },
    pierreetincelle: { nom: 'Pierre à étincelles', src: 'E', ico: 522, txt: 'Chaque Sort joué inflige 3 dégâts à un ennemi au hasard.', eff: [['sortDeg', 3]] },
    rouet: { nom: 'Rouet', src: 'E', ico: 765, txt: 'La 4e carte jouée chaque tour rend 1 mana.', eff: [['rouet', 1]] },
    dynamo: { nom: 'Dynamo de cuivre', src: 'E', ico: 489, txt: 'Chaque Surcharge pioche 1 carte et donne 4 garde.', eff: [['surchargePlus', 1]] },
    urnevide: { nom: 'Urne vide', src: 'E', ico: 690, txt: 'Quand tu consumes une carte : pioche 1 carte et gagne 3 garde.', eff: [['consumePlus', 1]] },
    spore: { nom: 'Spore de cendre', src: 'E', ico: 615, txt: 'Quand un ennemi meurt, sa Brûlure, son Poison et son Gel passent à un autre ennemi.', eff: [['contagion', 1]] },
    faux: { nom: 'Faux de cendre', src: 'E', ico: 133, txt: 'Les ennemis ordinaires qui tombent à 6 PV ou moins meurent aussitôt.', eff: [['faux', 6]] },
    braseropoche: { nom: 'Brasero de poche', src: 'E', ico: 504, txt: 'Le mana que tu ne dépenses pas est gardé au tour suivant (au plus 2).', eff: [['reserveMana', 2]] },
    etincelle: { nom: 'Étincelle volage', src: 'E', ico: 616, txt: 'Début de tour : une carte au hasard de ta main coûte 0 ce tour.', eff: [['carteGratuite', 1]] },
    herisson: { nom: 'Bouclier hérissé', src: 'E', ico: 184, txt: 'Fin de ton tour : inflige la moitié de ta garde à un ennemi au hasard.', eff: [['gardeRiposte', 1]] },
    calice: { nom: 'Calice', src: 'E', ico: 823, txt: 'Achever un ennemi rend 3 PV.', eff: [['soinKill', 3]] },
    sablierinverse: { nom: 'Sablier renversé', src: 'E', ico: 628, txt: 'Chaque fois que ta pioche se remélange : +1 Force et 5 garde.', eff: [['remelange', 1]] },
    banniere: { nom: 'Bannière des clans', src: 'E', ico: 409, txt: 'Chaque tribu compte une carte de plus pour ses liens.', eff: [['tribuPlus', 1]] },
    carnet: { nom: 'Carnet de route', src: 'E', ico: 290, txt: 'Les quêtes de tes cartes avancent deux fois plus vite.', eff: [['queteX2', 1]] },
    sifflet: { nom: 'Sifflet d\'os', src: 'E', ico: 621, txt: 'Une place de plus pour les familiers, qui évoluent deux fois plus vite.', eff: [['familierPlus', 1]] },
    gantelet: { nom: 'Gantelet lesté', src: 'E', ico: 89, txt: 'Les cartes qui coûtent 2 infligent +5 dégâts et donnent +5 garde de plus.', eff: [['coutDeuxPlus', 5]] },
    encrier: { nom: 'Encrier sans fond', src: 'E', ico: 768, txt: 'Le premier Sort de chaque tour pioche 1 carte.', eff: [['premierSortPioche', 1]] },
    flute: { nom: 'Flûte d\'écorce', src: 'E', ico: 1059, txt: 'Début de combat : +2 de ta ressource de classe.', eff: [['ressourceClasse', 2]] },
    trefle: { nom: 'Trèfle de suie', src: 'E', ico: 680, txt: 'Les Suies piochées sont consumées aussitôt et piochent une autre carte.', eff: [['antiSuie', 1]] },
    cloche: { nom: 'Cloche d\'alarme', src: 'E', ico: 739, txt: 'Premier tour de chaque combat : 2 cartes de plus en main.', eff: [['premierTourMain', 2]] },
    manteau: { nom: 'Manteau de cendres', src: 'E', ico: 33, txt: 'La première fois par combat que tu passes sous la moitié de tes PV : 12 garde et 1 Esquive.', eff: [['manteau', 12]] },
    aimant: { nom: 'Aimant doré', src: 'E', ico: 237, txt: 'Chaque ennemi vaincu lâche 4 or.', eff: [['orKill', 4]] },
    dague: { nom: 'Dague d\'appoint', src: 'E', ico: 326, txt: 'Début de tour : inflige 3 dégâts à l\'ennemi le plus faible.', eff: [['dague', 3]] },
    lunette: { nom: 'Lunette d\'archer', src: 'E', ico: 283, txt: 'Les ennemis Exposés subissent le double de dégâts (au lieu de +50 %).', eff: [['exposeFort', 1]] },
    tambour: { nom: 'Tambour de guerre', src: 'E', ico: 822, txt: 'Toutes les 6 cartes jouées dans un combat : +1 Force.', eff: [['tambour', 6]] },
    coquille: { nom: 'Coquille', src: 'E', ico: 946, txt: 'Le premier coup que tu reçois à chaque tour est réduit de 4.', eff: [['coquille', 4]] },
    poudre: { nom: 'Poudre noire', src: 'E', ico: 487, txt: 'Quand un ennemi meurt, il explose : 6 dégâts aux autres ennemis.', eff: [['poudre', 6]] },
    pageblanche: { nom: 'Page blanche', src: 'E', ico: 767, txt: 'Jouer une carte qui coûte 0 pioche 1 carte (une fois par tour pour chaque carte).', eff: [['zeroPioche', 1]] },
    oeufbraise: { nom: 'Œuf de braise', src: 'E', ico: 265, txt: 'Les cartes communes que tu gagnes arrivent affûtées.', eff: [['communeAffutee', 1]] },
    lanterneveille: { nom: 'Lanterne de veille', src: 'E', ico: 740, txt: 'Après chaque élite : +1 éclat et +20 or. Le brasero soigne 10 % de plus.', eff: [['bonusElite', 1], ['soinRepos', 10]] },
    // boss : puissantes, parfois à double tranchant
    echoforge: { nom: 'Écho de forge', src: 'B', ico: 288, txt: 'La première carte jouée chaque tour est jouée deux fois.', eff: [['premiereDouble', 1]] },
    carapace: { nom: 'Carapace ancestrale', src: 'B', ico: 187, txt: 'Ta garde ne disparaît plus entre les tours (au plus 30).', eff: [['gardeGardee', 30]] },
    pacte: { nom: 'Pacte de cendre', src: 'B', ico: 576, txt: '+1 mana à chaque tour. Début de combat : 2 Suies dans ta pioche.', eff: [['manaTour', 1], ['suiesCombat', 2]] },
    lanterneetroite: { nom: 'Lanterne étroite', src: 'B', ico: 738, txt: '+1 mana à chaque tour, mais ta main ne compte que 3 cartes.', eff: [['manaTour', 1], ['mainPlus', -1]] },
    horloge: { nom: 'Horloge de cendres', src: 'B', ico: 629, txt: 'Un tour sur trois (3e, 6e, 9e…), tes dégâts sont doublés.', eff: [['horloge', 3]] },
    grimoirenoir: { nom: 'Grimoire noir', src: 'B', ico: 289, txt: 'Brûlure, Poison, Gel, Faiblesse et Exposé que tu appliques : +1 à chaque fois.', eff: [['statutPlus', 1]] },
    oeil: { nom: 'Œil du collectionneur', src: 'B', ico: 524, txt: 'Récompenses : une carte de plus au choix, et bien plus de cartes rares, épiques et légendaires.', eff: [['choixCartes', 1], ['oeil', 1]] },
    phenix: { nom: 'Plume de phénix', src: 'B', ico: 505, txt: 'Une fois par course, si tu tombes à 0 PV, tu reviens avec 40 % de tes PV.', eff: [['phenix', 1]] },
    chaudron: { nom: 'Chaudron de veille', src: 'B', ico: 691, txt: 'Au brasero, tu peux faire deux actions. +12 PV max.', eff: [['braseroDouble', 1], ['pvMax', 12]] },
    ancre: { nom: 'Ancre de fer', src: 'B', ico: 1048, txt: 'Tu ne peux plus être Faible, Exposé ni Fragile. +1 Robustesse au début des combats.', eff: [['immunite', 1], ['debutCombat', 'robustesse', 1]] }
  };

  // ---------- familiers (retour de la V5, adaptés aux tribus) ----------
  // Un familier agit au début de chacun de tes tours. Il évolue après 3 puis 7 combats à tes côtés,
  // et à partir du 2e stade il compte comme 1 (puis 2) carte de sa tribu pour les liens.
  // V8 : à chaque évolution (stade 2 après 3 combats, stade 3 après 7), choix entre la voie A et la voie B.
  const FAMILIERS = {
    flammeche: { tribu: 'cendre', voies: ['Brasier', 'Foyer'], stades: [
      { nom: 'Flammèche', sprite: 'f-flammeche', txt: 'Début de tour : 2 Brûlure à un ennemi au hasard.', k: 'brul', n: 2 },
      { A: { nom: 'Serpenflamme', sprite: 'f-serpenflamme', txt: 'Début de tour : 3 Brûlure à un ennemi au hasard.', k: 'brul', n: 3 },
        B: { nom: 'Lampion', sprite: 'f-lampion', txt: 'Un tour sur deux : +1 mana (sans Surcharge).', k: 'mana2', n: 1 } },
      { A: { nom: 'Dracendre', sprite: 'f-dracendre', txt: 'Début de tour : 2 Brûlure à tous les ennemis.', k: 'brulTous', n: 2 },
        B: { nom: 'Fournaise vive', sprite: 'f-fournaisev', txt: 'Un tour sur deux : +1 mana et pioche 1 carte.', k: 'mana2p', n: 1 } }] },
    cendrot: { tribu: 'forge', voies: ['Ronces de fer', 'Rempart'], stades: [
      { nom: 'Cendrot', sprite: 'f-cendrot', txt: 'Début de tour : 2 garde.', k: 'garde', n: 2 },
      { A: { nom: 'Hérisfer', sprite: 'f-herisfer', txt: 'Début de tour : 2 garde et 1 Épine.', k: 'gardeEpines', n: 2, e: 1 },
        B: { nom: 'Golemet', sprite: 'f-golemet', txt: 'Début de tour : 4 garde.', k: 'garde', n: 4 } },
      { A: { nom: 'Bastion-ronce', sprite: 'f-bastion', txt: 'Début de tour : 3 garde et 2 Épines.', k: 'gardeEpines', n: 3, e: 2 },
        B: { nom: 'Colossin', sprite: 'f-colossin', txt: 'Début de tour : 6 garde.', k: 'garde', n: 6 } }] },
    givrelin: { tribu: 'givre', voies: ['Gel', 'Brume froide'], stades: [
      { nom: 'Givrelin', sprite: 'f-givrelin', txt: 'Début de tour : 1 Gel à un ennemi au hasard.', k: 'gel', n: 1 },
      { A: { nom: 'Givraile', sprite: 'f-givraile', txt: 'Début de tour : 1 Gel à deux ennemis au hasard.', k: 'gel2', n: 1 },
        B: { nom: 'Brumelin', sprite: 'f-brumelin', txt: 'Début de tour : 1 Faiblesse à l\'ennemi le plus robuste.', k: 'faible', n: 1 } },
      { A: { nom: 'Spectregel', sprite: 'f-spectregel', txt: 'Début de tour : 1 Gel à tous les ennemis.', k: 'gelTous', n: 1 },
        B: { nom: 'Blizzardin', sprite: 'f-blizzardin', txt: 'Début de tour : 1 Faiblesse à tous les ennemis.', k: 'faibleTous', n: 1 } }] },
    chaton: { tribu: 'bete', voies: ['Crocs', 'Traque'], stades: [
      { nom: 'Chaton de suie', sprite: 'f-chaton', txt: 'Début de tour : 3 dégâts à l\'ennemi le plus faible.', k: 'mord', n: 3 },
      { A: { nom: 'Renardeau', sprite: 'f-renardeau', txt: 'Début de tour : 4 dégâts à l\'ennemi le plus faible.', k: 'mord', n: 4 },
        B: { nom: 'Pisteur', sprite: 'f-pisteur', txt: 'Début de tour : 1 Exposé à l\'ennemi le plus robuste.', k: 'expose', n: 1 } },
      { A: { nom: 'Ours-roc', sprite: 'f-oursroc', txt: 'Début de tour : 4 dégâts deux fois à l\'ennemi le plus faible.', k: 'mord2', n: 4 },
        B: { nom: 'Loup-guide', sprite: 'f-loupguide', txt: 'Début de tour : 1 Exposé à tous et 3 dégâts au plus faible.', k: 'exposeMord', n: 3 } }] },
    lucet: { tribu: 'luciole', voies: ['Soin', 'Savoir'], stades: [
      { nom: 'Lucet', sprite: 'f-lucet', txt: 'Début de tour : soigne 1 PV.', k: 'soin', n: 1 },
      { A: { nom: 'Libelune', sprite: 'f-libelune', txt: 'Début de tour : soigne 2 PV.', k: 'soin', n: 2 },
        B: { nom: 'Scribe-luciole', sprite: 'f-scribe', txt: 'Un tour sur deux : pioche 1 carte.', k: 'pioche2', n: 1 } },
      { A: { nom: 'Phalène d\'or', sprite: 'f-phalene', txt: 'Début de tour : soigne 2 PV. Début de combat : 1 Esquive.', k: 'soin', n: 2, esquive: 1 },
        B: { nom: 'Lanterne-mère', sprite: 'f-lanternemere', txt: 'Début de tour : pioche 1 carte et soigne 1 PV.', k: 'piocheSoin', n: 1 } }] }
  };

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

  // ---------- tactiques du bestiaire (V7) : chaque monstre a sa façon de se battre ----------
  const TACTIQUES = {
    chapardeur: [['voleur', 8]], diablotin: [['esquive', 1]], petitmort: [['revenant', 1]], osselet: [['protecteur', 3]],
    masque: [['enrage', 3]], grincant: [['mue', 4]],
    vaseux: [['opportuniste', 1]], boueux: [['provocation', 1]], limacon: [['galvanise', 2]], limace: [['diviser', 'limacon']],
    chaman: [['protecteur', 4]], noye: [['vampire', 1]],
    machefer: [['enrage', 3]], ogre: [['galvanise', 3]],
    osancien: [['enrage', 3]], creux: [['fragilise', 1]], necromant: [['galvanise', 2]], cornu: [['opportuniste', 1]],
    soudard: [['provocation', 1]], courge: [['mue', 5]],
    gele: [['provocation', 1]], diabgivre: [['esquive', 1]], grinvre: [['mue', 3]], limgivre: [['vampire', 1]],
    fige: [['enrage', 4]], masgivre: [['fragilise', 1]],
    colosse: [['enrage', 5]], gueule: [['vampire', 1]],
    cornard: [['enrage', 3]], diabfeu: [['explose', 6]], brule: [['opportuniste', 1]], grinfeu: [['protecteur', 4]],
    coffre: [['voleur', 15]], dechu: [['fragilise', 1]],
    devoreur: [['vampire', 1]], eteigneur: [['galvanise', 3]]
  };
  Object.entries(ENNEMIS).forEach(([id, e]) => { e.pas = (e.passif ? [e.passif] : []).concat(TACTIQUES[id] || []); });

  const PASSIFS = {
    regen: (n) => `Régénère ${n} PV à la fin de son tour.`,
    carapace: (n) => `Gagne ${n} garde au début de son tour.`,
    colere: (n) => `Gagne ${n} Force à chaque tour.`,
    epines: (n) => `Épines ${n} : te renvoie ${n} dégâts par coup.`,
    explose: (n) => `En mourant, explose et t'inflige ${n} dégâts.`,
    voleur: (n) => `Ses attaques te volent ${n} or (rendus s'il meurt). Il s'enfuit après son 4e tour.`,
    esquive: (n) => `Esquive le premier coup du combat${n > 1 ? ' (' + n + ' fois)' : ''}.`,
    revenant: () => 'La première fois qu\'il tombe, il se relève avec la moitié de ses PV.',
    protecteur: (n) => `À son tour, donne ${n} garde à chacun de ses alliés.`,
    enrage: (n) => `Sous la moitié de ses PV, entre en rage : +${n} Force (une fois).`,
    vampire: () => 'Se soigne de la moitié des dégâts qu\'il t\'inflige.',
    diviser: (id) => 'En mourant, se divise en deux petites créatures.',
    mue: (n) => `La première fois qu'il est touché à chaque tour, gagne ${n} garde.`,
    provocation: () => 'Provocation : tant qu\'il est debout, tes attaques ciblées doivent le viser.',
    fragilise: () => 'Ses attaques te rendent Fragile (25 % de garde en moins).',
    opportuniste: () => 'Inflige 50 % de dégâts en plus si tu n\'as pas de garde.',
    galvanise: (n) => `Quand un allié tombe, gagne ${n} Force.`
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
    { id: 'oeuf', titre: 'Le nid tiède', txt: 'Entre deux pierres chaudes, une petite créature de braise te fixe. Elle a l\'air de vouloir te suivre.', choix: [
      { txt: 'L\'adopter (un familier rejoint ton équipe)', eff: [['familier']] },
      { txt: 'Lui laisser des miettes (+10 XP)', eff: [['xp', 10]] }] },
    { id: 'statue', titre: 'La statue sans visage', txt: 'Une statue tend une main ouverte. Dans l\'autre, une pierre bleue luit.', choix: [
      { txt: 'Prendre la pierre (+2 éclats, un combat difficile ensuite)', eff: [['eclats', 2], ['elite']] },
      { txt: 'Déposer une pièce (−15 or, +15 XP)', cond: ['or', 15], eff: [['or', -15], ['xp', 15]] }] },
    // V8 : dilemmes risque contre récompense, répartis sur les trois actes
    { id: 'sanctuaire', titre: 'Le sanctuaire des braises', txt: 'Un brasier minuscule brûle sans bois sur un autel de pierre. Une voix demande ce que tu es prêt à laisser.', choix: [
      { txt: 'Offrir ta vigueur (−8 PV max, une relique d\'élite)', eff: [['pvMax', -8], ['relique']] },
      { txt: 'Se réchauffer (soigne 12 PV)', eff: [['pv', 12]] },
      { txt: 'Passer son chemin', eff: [] }] },
    { id: 'pacte', titre: 'Le pacte de cendre', actes: [2, 3], txt: 'Une silhouette sans visage tend un parchemin noirci. La signature se fait avec de la suie.', choix: [
      { txt: 'Signer (une relique d\'élite, 2 Suies dans ton paquet)', eff: [['relique'], ['suies', 2]] },
      { txt: 'Brûler le parchemin (+20 XP)', eff: [['xp', 20]] }] },
    { id: 'mue', titre: 'La mue', cond: 'evolutif', txt: 'Ton familier tremble, sa peau craque. Il pourrait changer tout de suite, si tu lui donnes de quoi brûler.', choix: [
      { txt: 'Le nourrir de braises (il évolue maintenant, 1 Suie dans ton paquet)', eff: [['evoFam'], ['suies', 1]] },
      { txt: 'Le laisser grandir à son rythme (+15 XP)', eff: [['xp', 15]] }] },
    { id: 'bibliotheque', titre: 'La bibliothèque noyée', txt: 'Des livres gonflés d\'eau flottent entre les rayonnages. Un seul reste sec, posé sur un pupitre.', choix: [
      { txt: 'Lire le livre sec (une carte de ta classe au choix)', eff: [['carteClasse']] },
      { txt: 'Arracher une page (transforme une carte de ton paquet)', eff: [['transforme']] }] },
    { id: 'miroirs', titre: 'La galerie des miroirs', txt: 'Ton reflet bouge avec un temps de retard. Il te sourit, toi pas.', choix: [
      { txt: 'Toucher le miroir (−7 PV, duplique une carte)', eff: [['pv', -7], ['duplique']] },
      { txt: 'Le briser (−5 PV, +3 éclats)', eff: [['pv', -5], ['eclats', 3]] },
      { txt: 'Détourner les yeux', eff: [] }] },
    { id: 'banquet', titre: 'Le banquet des morts', actes: [2, 3], txt: 'Une table dressée pour douze. Les convives sont des squelettes, la viande est encore chaude.', choix: [
      { txt: 'Manger (+8 PV max, 1 Suie dans ton paquet)', eff: [['pvMax', 8], ['suies', 1]] },
      { txt: 'Boire seulement (soigne 15 PV)', eff: [['pv', 15]] }] },
    { id: 'totem', titre: 'Le totem des tribus', txt: 'Cinq visages sculptés dans un même tronc. L\'un d\'eux ressemble à tes cartes.', choix: [
      { txt: 'Bénir ta tribu principale (compte +2 pour ses liens)', eff: [['benir', 2]] },
      { txt: 'Brûler le totem (+35 or)', eff: [['or', 35]] }] },
    { id: 'forgeron', titre: 'Le forgeron muet', actes: [2, 3], txt: 'Il montre ton paquet du doigt, puis sa bourse vide.', choix: [
      { txt: 'Payer 50 or (affûte 2 cartes au hasard)', cond: ['or', 50], eff: [['or', -50], ['affuteAlea'], ['affuteAlea']] },
      { txt: 'Lui céder une carte (retire une carte, +25 or)', eff: [['or', 25], ['retire']] }] },
    { id: 'roue', titre: 'La roue de fortune', txt: 'Une roue de chariot, peinte en rouge et noir, tourne toute seule.', choix: [
      { txt: 'Miser 50 or (une chance sur deux de gagner 120)', cond: ['or', 50], eff: [['pariGros']] },
      { txt: 'Miser ton sang (−6 PV : 2 chances sur 3 de gagner une carte rare)', eff: [['pariPV']] },
      { txt: 'Ne pas toucher', eff: [] }] },
    { id: 'pelerin', titre: 'Le pèlerin blessé', txt: 'Un homme adossé au mur, la jambe brûlée. Il serre une amulette contre lui.', choix: [
      { txt: 'Le soigner avec tes forces (−10 PV, un talisman)', eff: [['pv', -10], ['talisman']] },
      { txt: 'Lui laisser de l\'or (−20 or, +20 XP)', cond: ['or', 20], eff: [['or', -20], ['xp', 20]] },
      { txt: 'Continuer', eff: [] }] },
    { id: 'tombe', titre: 'La tombe ouverte', actes: [2, 3], txt: 'La dalle a été poussée de l\'intérieur. Au fond, des pièces brillent.', choix: [
      { txt: 'Fouiller (+70 or, le prochain combat sera une élite)', eff: [['or', 70], ['elite']] },
      { txt: 'Refermer la dalle (soigne 8 PV)', eff: [['pv', 8]] }] },
    { id: 'fontaine', titre: 'La fontaine de cendre', txt: 'L\'eau est grise mais froide. Elle lave tout ce qu\'on y plonge.', choix: [
      { txt: 'Se purifier (retire toutes tes Suies, soigne 5 PV)', eff: [['retireSuies'], ['pv', 5]] },
      { txt: 'Remplir une fiole (+1 éclat)', eff: [['eclats', 1]] }] },
    { id: 'ombres', titre: 'Le marchand d\'ombres', actes: [2, 3], txt: 'Il vend des objets qui n\'ont pas encore été perdus.', choix: [
      { txt: 'Acheter une relique (110 or)', cond: ['or', 110], eff: [['or', -110], ['relique']] },
      { txt: 'Vendre un souvenir (−6 PV max, +80 or)', eff: [['pvMax', -6], ['or', 80]] },
      { txt: 'Partir', eff: [] }] },
    { id: 'arene', titre: 'L\'arène des anciens', txt: 'Des gradins vides, une seule torche. Quelque chose attend le prochain défi.', choix: [
      { txt: 'Lancer le défi (+25 XP, le prochain combat sera une élite)', eff: [['xp', 25], ['elite']] },
      { txt: 'Regarder les fresques (+10 XP)', eff: [['xp', 10]] }] },
    { id: 'oracle', titre: 'L\'oracle aveugle', actes: [1, 2], txt: 'Elle pose la main sur ton paquet et récite des noms de cartes que tu ne connais pas encore.', choix: [
      { txt: 'Lui offrir 35 or (une carte rare au choix)', cond: ['or', 35], eff: [['or', -35], ['carteRare']] },
      { txt: 'Écouter sa prophétie (−4 PV, +25 XP)', eff: [['pv', -4], ['xp', 25]] }] },
    { id: 'enclume', titre: 'L\'enclume chantante', txt: 'Chaque coup de marteau y sonne une note différente. La dernière n\'est pas jolie.', choix: [
      { txt: 'Forger (affûte une carte au choix, 1 Suie dans ton paquet)', eff: [['affute'], ['suies', 1]] },
      { txt: 'Écouter (+1 éclat)', eff: [['eclats', 1]] }] },
    { id: 'givreoeufs', titre: 'Les œufs de givre', actes: [1, 2], txt: 'Trois œufs translucides, tièdes malgré la glace qui les entoure. L\'un d\'eux bouge.', choix: [
      { txt: 'Couver l\'œuf (un familier rejoint ton équipe)', eff: [['familier']] },
      { txt: 'Les vendre au premier venu (+30 or)', eff: [['or', 30]] }] }
  ];

  // =====================================================================
  // ---------- V9 : quatre héros, 70 cartes, bestiaire élargi, 3 boss par acte, serments ----------
  // =====================================================================
  Object.assign(STATUTS, {
    marque: { nom: 'Marque', txt: 'Posée par Corvine. Ses cartes d\'exécution la consomment pour frapper plus fort.' },
    contre: { nom: 'Contre', txt: 'Ressource de Basalte : chaque coup bloqué en entier la remplit. Ta prochaine Lame inflige +3 par Contre.', bon: true },
    arcane: { nom: 'Arcane', txt: 'Ressource d\'Ysar : le mana non dépensé devient Arcane. Les cartes Déchaîner la dépensent.', bon: true },
    harmonie: { nom: 'Harmonie', txt: 'Ressource d\'Aubade : à 3 Harmonie, tes familiers agissent tout de suite. Chaque action d\'un familier frappe aussi l\'ennemi le plus faible (1 dégât par rang de maîtrise).', bon: true },
    torpeur: { nom: 'Torpeur', txt: 'Au début de ton prochain tour, tu as 1 mana de moins par Torpeur.' },
    nuitrouge: { nom: 'Nuit rouge', txt: 'Chaque Marque sur ta cible ajoute +1 dégât à tes coups.', bon: true },
    montagne: { nom: 'Montagne', txt: 'Ta garde n\'est plus perdue entre les tours.', bon: true },
    singularite: { nom: 'Singularité', txt: 'Le mana non dépensé donne 3 Arcane au lieu de 2.', bon: true },
    opera: { nom: 'Opéra', txt: 'Tes familiers agissent deux fois au début de chaque tour.', bon: true },
    soleil: { nom: 'Soleil intérieur', txt: 'Chaque Sort inflige ta Chaleur en dégâts à un ennemi au hasard (au plus 12).', bon: true },
    brouillard: { nom: 'Brouillard éternel', txt: 'Chaque Brume consumée rend ton attaquant Faible et Exposé.', bon: true },
    carquoisSans: { nom: 'Carquois sans fond', txt: 'Tes Flèches restent encochées d\'un tour à l\'autre.', bon: true },
    grandeforge: { nom: 'Grande forge', txt: 'Tes Rivets infligent le double.', bon: true },
    arbremonde: { nom: 'Arbre-monde', txt: 'Chaque carte jouée donne 1 Épine.', bon: true },
    sansLimite: { nom: 'Carnage', txt: 'Ta Rage n\'est plus plafonnée à 5.', bon: true },
    tempo: { nom: 'Arrêt du temps', txt: 'Alterner Lame et Sort donne 2 Cadence.', bon: true },
    manaPlus: { nom: 'Sablier sacré', txt: '+1 mana au début de chaque tour.', bon: true }
  });

  const CLASSES_V9 = {
    corvine: {
      nom: 'Corvine', titre: 'la Lame-corbeau', pv: 51, couleur: '#d8406e', sprite: 'h-corvine', renom: 4, archetype: 'Assassine',
      resume: 'Marque ses proies, puis les achève : chaque mise à mort lui rend mana et cartes.',
      comp: { nom: 'Embuscade', rangs: ['Chaque Lame pose 1 Marque sur sa cible. Achever un ennemi rend 1 mana et pioche 1 carte.', 'Les cartes d\'exécution infligent +2 de plus par Marque.', 'Quand un ennemi marqué tombe, ses Marques passent à l\'ennemi le plus robuste.'] },
      depart: ['frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'dague', 'dague', 'coupgrace', 'pasdombre'],
      heritages: [
        { nom: 'Venin de corbeau', txt: 'Les ennemis commencent avec 1 Marque.', eff: [['debutCombatEnnemis', 'marque', 1]] },
        { nom: 'Cape sombre', txt: '+1 Esquive au début des combats.', eff: [['debutCombat', 'esquive', 1]] },
        { nom: 'Contrat', txt: '+40 or au départ et +10 % d\'or.', eff: [['orDepart', 40], ['orBonus', 10]] }
      ],
      talents: [
        { id: 't-corvine1', nom: 'Prédatrice', txt: 'Début de combat : 2 Marques sur l\'ennemi le plus robuste.', eff: [['marqueDepart', 2]] },
        { id: 't-corvine2', nom: 'Lame fine', txt: 'Tes Lames infligent +1 dégât par Marque de la cible.', eff: [['marqueDeg', 1]] }
      ]
    },
    basalte: {
      nom: 'Basalte', titre: 'le Rempart vivant', pv: 82, couleur: '#8fa3b8', sprite: 'h-basalte', renom: 6, archetype: 'Colosse',
      resume: 'Encaisse tout derrière sa garde, puis rend chaque coup bloqué d\'un seul revers.',
      comp: { nom: 'Rempart', rangs: ['Chaque attaque entièrement bloquée donne 1 Contre (au plus 6). Ta prochaine Lame inflige +3 par Contre, puis le Contre retombe à 0.', 'La moitié de ta garde reste d\'un tour à l\'autre.', 'Gagner du Contre donne aussi 2 garde.'] },
      depart: ['frappe', 'frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'parade', 'pavois', 'heurt'],
      heritages: [
        { nom: 'Pierre de garde', txt: '+6 garde au début des combats.', eff: [['debutCombat', 'garde', 6]] },
        { nom: 'Masse ancienne', txt: '+1 Contre au début des combats.', eff: [['debutCombat', 'contre', 1]] },
        { nom: 'Granit', txt: '+10 PV max.', eff: [['pvMax', 10]] }
      ],
      talents: [
        { id: 't-basalte1', nom: 'Inébranlable', txt: '+1 Robustesse au début des combats.', eff: [['debutCombat', 'robustesse', 1]] },
        { id: 't-basalte2', nom: 'Revers de pierre', txt: 'Chaque Contre ajoute +1 dégât de plus.', eff: [['contrePlus', 1]] }
      ]
    },
    ysar: {
      nom: 'Ysar', titre: 'l\'Arcaniste', pv: 64, couleur: '#6a8cff', sprite: 'h-ysar', renom: 8, archetype: 'Mage',
      resume: 'Garde son mana au lieu de le dépenser, et le déchaîne d\'un coup quand la réserve déborde.',
      comp: { nom: 'Réserve arcanique', rangs: ['Début de tour : +1 Arcane. En fin de tour, chaque mana non dépensé devient 2 Arcane. Les cartes Déchaîner dépensent l\'Arcane.', 'À 8 Arcane ou plus, ton premier Sort de chaque tour coûte 0.', 'Début de tour : +3 Arcane au lieu de 1.'] },
      depart: ['frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'trait', 'trait', 'dechainer', 'focalisation'],
      heritages: [
        { nom: 'Cristal de réserve', txt: '+4 Arcane au début des combats.', eff: [['debutCombat', 'arcane', 4]] },
        { nom: 'Robe runique', txt: '+5 garde au début des combats.', eff: [['debutCombat', 'garde', 5]] },
        { nom: 'Esprit vif', txt: '+1 mana au premier tour de chaque combat.', eff: [['premierTourMana', 1]] }
      ],
      talents: [
        { id: 't-ysar1', nom: 'Puits sans fond', txt: 'Début de tour : +1 Arcane.', eff: [['debutTour', 'arcane', 1]] },
        { id: 't-ysar2', nom: 'Catalyse', txt: 'Déchaîner inflige +1 dégât par Arcane dépensée.', eff: [['arcanePlus', 1]] }
      ]
    },
    aubade: {
      nom: 'Aubade', titre: 'la Chanteuse d\'aube', pv: 48, couleur: '#f290c8', sprite: 'h-aubade', renom: 9, archetype: 'Enchanteresse',
      resume: 'Chante pour ses familiers : chaque Sort monte l\'Harmonie, qui les fait agir hors de leur tour.',
      comp: { nom: 'Hymne', rangs: ['Commence avec un Lucet. Chaque Sort donne 1 Harmonie ; à 3 Harmonie, tes familiers agissent tout de suite. Chaque action d\'un familier frappe aussi l\'ennemi le plus faible (1 dégât par rang de maîtrise).', '+1 place de familier, et ils évoluent deux fois plus vite.', 'Chaque action d\'un familier te donne 2 garde.'] },
      depart: ['frappe', 'frappe', 'frappe', 'parade', 'parade', 'parade', 'refrain', 'refrain', 'berceuse', 'note'],
      familierDepart: 'lucet',
      heritages: [
        { nom: 'Flûte d\'appel', txt: '+2 Harmonie au début des combats.', eff: [['debutCombat', 'harmonie', 2]] },
        { nom: 'Voix claire', txt: '+5 garde au début des combats.', eff: [['debutCombat', 'garde', 5]] },
        { nom: 'Duo', txt: 'Commence aussi avec un Chaton de suie.', eff: [['familierDepart2', 1]] }
      ],
      talents: [
        { id: 't-aubade1', nom: 'Crescendo', txt: 'L\'Harmonie déclenche tes familiers dès 2.', eff: [['harmonieSeuil', 1]] },
        { id: 't-aubade2', nom: 'Ouverture', txt: 'Début de combat : tes familiers agissent une fois.', eff: [['famDebut', 1]] }
      ]
    }
  };
  Object.assign(CLASSES, CLASSES_V9);
  // V9 : archétypes des classes existantes (affichés sur la fiche de classe)
  Object.entries({ solen: 'Pyromancienne', fumee: 'Ombre', silex: 'Briseur', ivra: 'Archère', bram: 'Artisan', lierre: 'Druidesse', grenat: 'Berserker', ossian: 'Nécromancien', vesper: 'Duelliste', nacre: 'Marchande' }).forEach(([k, a]) => { CLASSES[k].archetype = a; });

  // ---------- cartes V9 ----------
  // Corvine : Marque et exécution
  const parMarque = (x, base) => base + (x.run.rang >= 2 ? 2 : 0);
  carte({ id: 'dague', nom: 'Dague de jet', t: 'L', cl: 'corvine', cib: 'e', c: 0, depart: true, v: [[3], [5]], txt: (v) => `Inflige ${v[0]} dégâts.`, f: (x, v) => x.deg(v[0]) });
  carte({ id: 'coupgrace', nom: 'Coup de grâce', t: 'L', cl: 'corvine', cib: 'e', depart: true, exec: true, v: [[4, 3], [6, 4]], txt: (v) => `Exécution : inflige ${v[0]} dégâts, +${v[1]} par Marque de la cible (+2 au rang 2), puis retire ses Marques.`, f: (x, v) => { const n = x.marquesDe(x.cible); x.retirerMarques(x.cible); x.deg(v[0] + parMarque(x, v[1]) * n); } });
  carte({ id: 'pasdombre', nom: 'Pas d\'ombre', t: 'S', cl: 'corvine', depart: true, v: [[5, 1], [7, 1]], txt: (v) => `Gagne ${v[0]} garde. Pioche ${v[1]} carte si un ennemi est marqué.`, f: (x, v) => { x.garde(v[0]); if (x.ennemisVivants().some((e) => e.st.marque)) x.pioche(v[1]); } });
  carte({ id: 'filature', nom: 'Filature', t: 'S', cl: 'corvine', cib: 'e', v: [[2, 1], [3, 1]], txt: (v) => `${v[0]} Marques sur la cible. Pioche ${v[1]} carte.`, f: (x, v) => { x.marquer(x.cible, v[0]); x.pioche(v[1]); } });
  carte({ id: 'entaillefine', nom: 'Entaille fine', t: 'L', cl: 'corvine', cib: 'e', v: [[4, 1], [6, 2]], txt: (v) => `Inflige ${v[0]} dégâts et ${v[1]} Marque de plus.`, f: (x, v) => { x.deg(v[0]); x.marquer(x.cible, v[1]); } });
  carte({ id: 'eventail', nom: 'Éventail de lames', t: 'L', cl: 'corvine', r: 'P', cib: 'tous', v: [[3], [5]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis et les marque tous.`, f: (x, v) => { x.degTous(v[0]); } });
  carte({ id: 'lamevenin', nom: 'Lame de venin', t: 'L', cl: 'corvine', r: 'P', cib: 'e', v: [[3, 2], [4, 3]], txt: (v) => `Inflige ${v[0]} dégâts. Poison égal à ${v[1]} fois les Marques de la cible.`, f: (x, v) => { x.deg(v[0]); if (x.cible && x.cible.pv > 0) x.statut(x.cible, 'poison', v[1] * x.marquesDe(x.cible)); } });
  carte({ id: 'assassinat', nom: 'Assassinat', t: 'L', cl: 'corvine', r: 'R', c: 2, cib: 'e', exec: true, v: [[8, 4], [11, 5]], txt: (v) => `Exécution : inflige ${v[0]} dégâts, +${v[1]} par Marque (+2 au rang 2), retire les Marques. Létal : +2 mana.`, f: (x, v) => { const e = x.cible, n = x.marquesDe(e); x.retirerMarques(e); x.deg(v[0] + parMarque(x, v[1]) * n); if (e && e.pv <= 0) x.manaBrut(2); } });
  carte({ id: 'evanescence', nom: 'Évanescence', t: 'S', cl: 'corvine', r: 'P', v: [[1, 3], [1, 6]], txt: (v) => `Gagne ${v[0]} Esquive et ${v[1]} garde.`, f: (x, v) => { x.soi('esquive', v[0]); x.garde(v[1]); } });
  carte({ id: 'cascade', nom: 'Cascade d\'acier', t: 'L', cl: 'corvine', r: 'E', cib: 'e', v: [[3], [4]], txt: (v) => `Inflige ${v[0]} dégâts autant de fois que la cible a de Marques (au moins 2).`, f: (x, v) => { const n = Math.max(2, x.marquesDe(x.cible)); for (let i = 0; i < n; i++) x.deg(v[0]); } });
  carte({ id: 'nuitrouge', nom: 'Nuit rouge', t: 'S', cl: 'corvine', r: 'L', exil: true, v: [[3], [4]], txt: (v) => `${v[0]} Marques sur tous les ennemis. Pour ce combat, chaque Marque de ta cible ajoute +1 dégât à tes coups. Consumer.`, f: (x, v) => { x.ennemisVivants().forEach((e) => x.marquer(e, v[0])); x.soi('nuitrouge', 1); } });
  // Basalte : Contre et garde
  carte({ id: 'pavois', nom: 'Pavois', t: 'S', cl: 'basalte', depart: true, v: [[8], [11]], txt: (v) => `Gagne ${v[0]} garde.`, f: (x, v) => x.garde(v[0]) });
  carte({ id: 'heurt', nom: 'Heurt', t: 'L', cl: 'basalte', cib: 'e', depart: true, v: [[4, 3], [5, 2]], txt: (v) => `Inflige ${v[0]} dégâts, +1 par ${v[1]} garde que tu as.`, f: (x, v) => x.deg(v[0] + Math.floor(x.c.j.garde / v[1])) });
  carte({ id: 'muraille', nom: 'Muraille', t: 'S', cl: 'basalte', v: [[6, 4], [8, 5]], txt: (v) => `Gagne ${v[0]} garde, +${v[1]} si tu avais déjà de la garde.`, f: (x, v) => x.garde(v[0] + (x.c.j.garde > 0 ? v[1] : 0)) });
  carte({ id: 'contreattaque', nom: 'Contre-attaque', t: 'L', cl: 'basalte', cib: 'e', v: [[5, 1], [7, 1]], txt: (v) => `Gagne ${v[1]} Contre, puis inflige ${v[0]} dégâts.`, f: (x, v) => { x.contre(v[1]); x.deg(v[0]); } });
  carte({ id: 'defi', nom: 'Défi', t: 'S', cl: 'basalte', r: 'P', c: 0, v: [[1, 3], [2, 3]], txt: (v) => `Gagne ${v[0]} Contre et ${v[1]} garde.`, f: (x, v) => { x.contre(v[0]); x.garde(v[1]); } });
  carte({ id: 'rocher', nom: 'Rocher', t: 'L', cl: 'basalte', r: 'P', cib: 'e', v: [[7, 2], [9, 2]], txt: (v) => `Inflige ${v[0]} dégâts. Si ta garde atteint 10, ${v[1]} Faiblesse.`, f: (x, v) => { const g = x.c.j.garde; x.deg(v[0]); if (g >= 10) x.statut(x.cible, 'faible', v[1]); } });
  carte({ id: 'eboulement', nom: 'Éboulement', t: 'L', cl: 'basalte', r: 'P', c: 2, cib: 'tous', v: [[6, 4], [8, 3]], txt: (v) => `Inflige ${v[0]} dégâts à tous les ennemis, +1 par ${v[1]} garde.`, f: (x, v) => x.degTous(v[0] + Math.floor(x.c.j.garde / v[1])) });
  carte({ id: 'seisme', nom: 'Séisme', t: 'S', cl: 'basalte', r: 'R', c: 2, cib: 'tous', v: [[12, 1], [16, 2]], txt: (v) => `Gagne ${v[0]} garde. ${v[1]} Faiblesse à tous les ennemis.`, f: (x, v) => { x.garde(v[0]); x.statutTous('faible', v[1]); } });
  carte({ id: 'avalanchepierre', nom: 'Chute de pierres', t: 'L', cl: 'basalte', r: 'E', c: 2, cib: 'tous', v: [[30], [40]], txt: (v) => `Inflige à tous les ennemis autant de dégâts que ta garde (au plus ${v[0]}), sans la perdre.`, f: (x, v) => x.degTous(Math.min(v[0], x.c.j.garde)) });
  carte({ id: 'montagne', nom: 'La Montagne', t: 'S', cl: 'basalte', r: 'L', c: 2, exil: true, v: [[18], [24]], txt: (v) => `Gagne ${v[0]} garde. Pour ce combat, ta garde n'est plus perdue entre les tours. Consumer.`, f: (x, v) => { x.garde(v[0]); x.soi('montagne', 1); } });
  // Ysar : Arcane
  carte({ id: 'trait', nom: 'Trait arcanique', t: 'L', cl: 'ysar', cib: 'e', depart: true, v: [[6, 2], [8, 3]], txt: (v) => `Inflige ${v[0]} dégâts. Gagne ${v[1]} Arcane.`, f: (x, v) => { x.deg(v[0]); x.arcane(v[1]); } });
  carte({ id: 'dechainer', nom: 'Déchaîner', t: 'S', cl: 'ysar', cib: 'e', depart: true, v: [[3, 3], [4, 3]], txt: (v) => `Déchaîner : inflige ${v[0]} dégâts par Arcane (au moins ${v[1]} comptée), puis dépense l'Arcane.`, f: (x, v) => { const a = x.depenserArcane(); x.deg((v[0] + x.eff('arcanePlus')) * Math.max(v[1], a)); } });
  carte({ id: 'focalisation', nom: 'Focalisation', t: 'S', cl: 'ysar', depart: true, v: [[5, 2], [7, 3]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Arcane.`, f: (x, v) => { x.garde(v[0]); x.arcane(v[1]); } });
  carte({ id: 'orbe', nom: 'Orbe', t: 'S', cl: 'ysar', v: [[3, 1], [4, 1]], txt: (v) => `Gagne ${v[0]} Arcane. Pioche ${v[1]} carte.`, f: (x, v) => { x.arcane(v[0]); x.pioche(v[1]); } });
  carte({ id: 'egide', nom: 'Égide arcanique', t: 'S', cl: 'ysar', v: [[4], [6]], txt: (v) => `Gagne ${v[0]} garde, +1 par 2 Arcane (sans la dépenser).`, f: (x, v) => x.garde(v[0] + Math.floor(x.st('arcane') / 2)) });
  carte({ id: 'rayon', nom: 'Rayon', t: 'L', cl: 'ysar', r: 'P', cib: 'e', v: [[5], [7]], txt: (v) => `Inflige ${v[0]} dégâts, deux fois si tu as 6 Arcane ou plus.`, f: (x, v) => { x.deg(v[0]); if (x.st('arcane') >= 6) x.deg(v[0]); } });
  carte({ id: 'nova', nom: 'Nova', t: 'S', cl: 'ysar', r: 'P', c: 2, cib: 'tous', v: [[4, 1], [6, 1]], txt: (v) => `Déchaîner : inflige à tous ${v[0]} dégâts, +${v[1]} par Arcane, puis dépense l'Arcane.`, f: (x, v) => { const a = x.depenserArcane(); x.degTous(v[0] + (v[1] + x.eff('arcanePlus')) * a); } });
  carte({ id: 'glyphe', nom: 'Glyphe double', t: 'S', cl: 'ysar', r: 'P', cib: 'e', v: [[2, 2], [3, 3]], txt: (v) => `${v[0]} Gel et ${v[0]} Brûlure à la cible. Gagne ${v[1]} Arcane.`, f: (x, v) => { x.statut(x.cible, 'gel', v[0]); x.statut(x.cible, 'brulure', v[0]); x.arcane(v[1]); } });
  carte({ id: 'surtension', nom: 'Surtension', t: 'S', cl: 'ysar', r: 'R', c: 0, v: [[5, 2], [4, 2]], txt: (v) => `Si tu as ${v[0]} Arcane, dépense-les et gagne ${v[1]} mana (sans Surcharge). Sinon, gagne 2 Arcane.`, f: (x, v) => { if (x.st('arcane') >= v[0]) { x.arcane(-v[0]); x.manaBrut(v[1]); } else x.arcane(2); } });
  carte({ id: 'tempetearcane', nom: 'Tempête arcanique', t: 'S', cl: 'ysar', r: 'E', c: 2, cib: 'alea', v: [[3], [4]], txt: (v) => `Déchaîner : inflige ${v[0]} dégâts à un ennemi au hasard, une fois par 2 Arcane (au moins 3 fois). Dépense l'Arcane.`, f: (x, v) => { const a = x.depenserArcane(); const n = Math.max(3, Math.floor(a / 2)); for (let i = 0; i < n; i++) x.degAlea(v[0] + x.eff('arcanePlus')); } });
  carte({ id: 'singularite', nom: 'Singularité', t: 'S', cl: 'ysar', r: 'L', c: 1, exil: true, v: [[0], [4]], txt: (v) => `Double ton Arcane${v[0] ? ', puis +' + v[0] : ''}. Pour ce combat, le mana non dépensé donne 3 Arcane. Consumer.`, f: (x, v) => { x.arcane(x.st('arcane') + v[0]); x.soi('singularite', 1); } });
  // Aubade : familiers et Harmonie
  carte({ id: 'refrain', nom: 'Refrain', t: 'S', cl: 'aubade', depart: true, v: [[4, 1], [6, 1]], txt: (v) => `Gagne ${v[0]} garde et ${v[1]} Harmonie de plus.`, f: (x, v) => { x.garde(v[0]); x.harmonie(v[1]); } });
  carte({ id: 'berceuse', nom: 'Berceuse', t: 'S', cl: 'aubade', depart: true, v: [[3], [5]], txt: (v) => `Tes familiers agissent tout de suite. Gagne ${v[0]} garde.`, f: (x, v) => { x.famAgir(1); x.garde(v[0]); } });
  carte({ id: 'note', nom: 'Note tranchante', t: 'L', cl: 'aubade', cib: 'e', depart: true, v: [[5, 2], [7, 3]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par familier.`, f: (x, v) => x.deg(v[0] + v[1] * x.nbFamiliers()) });
  carte({ id: 'canon', nom: 'Canon', t: 'S', cl: 'aubade', v: [[2, 3], [2, 5]], txt: (v) => `Gagne ${v[0]} Harmonie de plus et ${v[1]} garde.`, f: (x, v) => { x.harmonie(v[0]); x.garde(v[1]); } });
  carte({ id: 'cantique', nom: 'Cantique', t: 'S', cl: 'aubade', c: 0, v: [[2], [3]], txt: (v) => `Soigne ${v[0]} PV.`, f: (x, v) => x.soin(v[0]) });
  carte({ id: 'duo', nom: 'Duo', t: 'L', cl: 'aubade', r: 'P', cib: 'e', v: [[4, 4], [5, 5]], txt: (v) => `Inflige ${v[0]} dégâts, puis ${v[1]} par familier.`, f: (x, v) => { x.deg(v[0]); for (let i = 0; i < x.nbFamiliers(); i++) x.deg(v[1]); } });
  carte({ id: 'hymnebataille', nom: 'Hymne de bataille', t: 'S', cl: 'aubade', r: 'P', v: [[1], [1]], txt: (v) => `Tes familiers agissent. Gagne ${v[0]} Force si tu en as 2 ou plus.`, f: (x, v) => { x.famAgir(1); if (x.nbFamiliers() >= 2) x.soi('force', v[0]); } });
  carte({ id: 'ballade', nom: 'Ballade', t: 'L', cl: 'aubade', r: 'P', c: 2, cib: 'tous', v: [[5, 2], [7, 3]], txt: (v) => `Inflige ${v[0]} dégâts à tous, +${v[1]} par Harmonie.`, f: (x, v) => x.degTous(v[0] + v[1] * x.st('harmonie')) });
  carte({ id: 'eveil', nom: 'Éveil', t: 'S', cl: 'aubade', r: 'R', exil: true, v: [[2], [3]], txt: (v) => `Gagne 1 Harmonie par familier. Pioche ${v[0]} cartes. Consumer.`, f: (x, v) => { x.harmonie(x.nbFamiliers()); x.pioche(v[0]); } });
  carte({ id: 'symphonie', nom: 'Symphonie', t: 'S', cl: 'aubade', r: 'E', c: 2, v: [[6], [9]], txt: (v) => `Tes familiers agissent deux fois. Gagne ${v[0]} garde.`, f: (x, v) => { x.famAgir(2); x.garde(v[0]); } });
  carte({ id: 'opera', nom: 'Grand opéra', t: 'S', cl: 'aubade', r: 'L', c: 2, exil: true, v: [[0], [6]], txt: (v) => `Pour ce combat, tes familiers agissent deux fois à chaque tour.${v[0] ? ' Gagne ' + v[0] + ' garde.' : ''} Consumer.`, f: (x, v) => { x.soi('opera', 1); if (v[0]) x.garde(v[0]); x.famAgir(1); } });

  // Légendaires de classe (une par classe historique)
  carte({ id: 'soleilinterieur', nom: 'Soleil intérieur', t: 'S', cl: 'solen', r: 'L', c: 1, exil: true, v: [[4], [6]], txt: (v) => `Gagne ${v[0]} Chaleur. Pour ce combat, chaque Sort inflige ta Chaleur en dégâts à l'ennemi le plus robuste (au plus 8). Consumer.`, f: (x, v) => { x.soi('chaleur', v[0]); x.soi('soleil', 1); } });
  carte({ id: 'brouillardeternel', nom: 'Brouillard éternel', t: 'S', cl: 'fumee', r: 'L', c: 1, exil: true, v: [[3], [4]], txt: (v) => `Gagne ${v[0]} Brume. Pour ce combat, chaque Brume consumée rend ton attaquant Faible et Exposé. Consumer.`, f: (x, v) => { x.soi('brume', v[0]); x.soi('brouillard', 1); } });
  carte({ id: 'zeroabsolu', nom: 'Zéro absolu', t: 'L', cl: 'silex', r: 'L', c: 2, cib: 'tous', sansGel: true, exil: true, v: [[3, 4], [4, 5]], txt: (v) => `${v[0]} Gel à tous, puis brise le Gel de chaque ennemi (${v[1]} dégâts par Gel). Consumer.`, f: (x, v) => { x.ennemisVivants().forEach((e) => { x.statut(e, 'gel', v[0]); const g = e.st.gel || 0; delete e.st.gel; x.deg(v[1] * g, e); }); } });
  carte({ id: 'carquoissansfond', nom: 'Carquois sans fond', t: 'S', cl: 'ivra', r: 'L', c: 2, exil: true, v: [[4], [6]], txt: (v) => `Gagne ${v[0]} Flèches. Pour ce combat, tes Flèches restent encochées d'un tour à l'autre. Consumer.`, f: (x, v) => { x.soi('fleches', v[0]); x.soi('carquoisSans', 1); } });
  carte({ id: 'grandeforge', nom: 'Grande forge', t: 'S', cl: 'bram', tr: 'forge', r: 'L', c: 1, exil: true, v: [[6], [8]], txt: (v) => `Gagne ${v[0]} Rouages. Pour ce combat, tes Rivets infligent le double. Consumer.`, f: (x, v) => { x.soi('grandeforge', 1); x.rouages(v[0]); } });
  carte({ id: 'arbremonde', nom: 'Arbre-monde', t: 'S', cl: 'lierre', r: 'L', c: 1, exil: true, v: [[5], [7]], txt: (v) => `Gagne ${v[0]} Sève. Pour ce combat, chaque carte jouée donne 1 Épine. Consumer.`, f: (x, v) => { x.soi('arbremonde', 1); x.seve(v[0]); } });
  carte({ id: 'carnage', nom: 'Carnage', t: 'S', cl: 'grenat', r: 'L', c: 1, exil: true, v: [[5, 4], [5, 6]], txt: (v) => `Perds ${v[0]} PV. Gagne ${v[1]} Rage et 1 Force. Pour ce combat, ta Rage n'est plus plafonnée. Consumer.`, f: (x, v) => { x.perdPV(v[0]); x.soi('rage', v[1]); x.soi('force', 1); x.soi('sansLimite', 1); } });
  carte({ id: 'dansemacabre', nom: 'Danse macabre', t: 'L', cl: 'ossian', r: 'L', c: 1, cib: 'tous', exil: true, v: [[3], [4]], txt: (v) => `Consume le reste de ta main. Par carte consumée : 1 Âme et ${v[0]} dégâts à tous. Consumer.`, f: (x, v) => { const n = x.consumerMain(); x.ame(n); x.degTous(v[0] * n); } });
  carte({ id: 'arretdutemps', nom: 'Arrêt du temps', t: 'S', cl: 'vesper', r: 'L', c: 1, exil: true, v: [[1], [2]], txt: (v) => `Gagne ${v[0]} Écho. Pour ce combat, alterner Lame et Sort donne 2 Cadence. Consumer.`, f: (x, v) => { x.soi('echo', v[0]); x.soi('tempo', 1); } });
  carte({ id: 'tresorroyal', nom: 'Trésor royal', t: 'L', cl: 'nacre', r: 'L', c: 2, cib: 'tous', v: [[5, 30], [4, 40]], txt: (v) => `Inflige à tous 1 dégât par ${v[0]} or que tu portes (au plus 40). Fin du combat : +${v[1]} or.`, f: (x, v) => { x.degTous(Math.min(40, Math.floor(x.run.or / v[0]))); x.orFin(v[1]); } });
  // Légendaires neutres V9
  carte({ id: 'eclipsetotale', nom: 'Éclipse totale', t: 'S', r: 'L', c: 1, cib: 'tous', exil: true, v: [[2], [3]], txt: (v) => `Retire la Force et la garde de tous les ennemis. ${v[0]} Faiblesse à tous. Consumer.`, f: (x, v) => { x.ennemisVivants().forEach((e) => { delete e.st.force; e.garde = 0; x.statut(e, 'faible', v[0]); }); } });
  carte({ id: 'renouveau', nom: 'Renouveau', t: 'S', r: 'L', c: 1, exil: true, v: [[12, 2], [16, 3]], txt: (v) => `Soigne ${v[0]} PV, gagne ${v[0]} garde, pioche ${v[1]} cartes. Consumer.`, f: (x, v) => { x.soin(v[0]); x.garde(v[0]); x.pioche(v[1]); } });
  carte({ id: 'lamedesrois', nom: 'Lame des rois', t: 'L', r: 'L', c: 2, cib: 'e', v: [[9, 1], [12, 1]], txt: (v) => `Inflige ${v[0]} dégâts à la cible, puis ${v[0]} à chaque autre ennemi. Gagne ${v[1]} Force.`, f: (x, v) => { const e = x.cible; x.deg(v[0]); x.ennemisVivants().forEach((o) => { if (o !== e) x.deg(v[0], o); }); x.soi('force', v[1]); } });
  carte({ id: 'sabliersacre', nom: 'Sablier sacré', t: 'S', r: 'L', c: 2, exil: true, v: [[2], [1]], txt: () => 'Pour ce combat, +1 mana au début de chaque tour. Consumer.', coutV: (v) => v[0], f: (x) => x.soi('manaPlus', 1) });

  // Neutres V9 : combos et allègement du paquet
  carte({ id: 'braisecommune', nom: 'Coup composé', t: 'L', cib: 'e', v: [[6, 3], [8, 4]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par statut négatif différent sur la cible.`, f: (x, v) => { const e = x.cible; const n = e ? ['brulure', 'poison', 'gel', 'faible', 'expose', 'marque'].filter((s) => e.st[s]).length : 0; x.deg(v[0] + v[1] * n); } });
  carte({ id: 'chainelame', nom: 'Enchaînement', t: 'L', cib: 'e', v: [[4, 3], [6, 4]], txt: (v) => `Inflige ${v[0]} dégâts, +${v[1]} par carte déjà jouée ce tour.`, f: (x, v) => x.deg(v[0] + v[1] * x.jouesTour()) });
  carte({ id: 'echange', nom: 'Échange', t: 'S', c: 0, v: [[0], [1]], txt: (v) => `Défausse ta main et pioche autant de cartes${v[0] ? ', plus ' + v[0] : ''}.`, f: (x, v) => x.echangerMain(v[0]) });
  carte({ id: 'recyclage', nom: 'Recyclage', t: 'S', c: 0, v: [[1], [2]], txt: (v) => `Reprends en main ${v[0]} carte${v[0] > 1 ? 's' : ''} du dessus de ta défausse.`, f: (x, v) => x.reprendre(v[0]) });
  carte({ id: 'purge', nom: 'Purge', t: 'S', r: 'P', c: 0, exil: true, v: [[1], [2]], txt: (v) => `Consume les Suies de ta main, pioche autant de cartes, plus ${v[0]}. Consumer.`, f: (x, v) => { const n = x.purgerSuies(); x.pioche(n + v[0]); } });
  carte({ id: 'reserve', nom: 'Réserve', t: 'S', r: 'P', v: [[8, 1], [11, 2]], txt: (v) => `Gagne ${v[0]} garde. Au prochain tour : +${v[1]} mana.`, f: (x, v) => { x.garde(v[0]); x.c.reserve += v[1]; } });
  carte({ id: 'pactesang', nom: 'Pacte de sang', t: 'S', r: 'P', c: 0, v: [[4, 1], [3, 1]], txt: (v) => `Perds ${v[0]} PV. Gagne ${v[1]} mana (Surcharge) et pioche 1 carte.`, f: (x, v) => { x.perdPV(v[0]); x.mana(v[1]); x.pioche(1); } });
  carte({ id: 'fourberie', nom: 'Fourberie', t: 'L', c: 0, cib: 'e', v: [[5, 1], [7, 2]], txt: (v) => `Inflige ${v[0]} dégâts. Si la cible compte attaquer, ${v[1]} Faiblesse.`, f: (x, v) => { const e = x.cible; const att = e && e.intent && /^atk/.test(e.intent.t); x.deg(v[0]); if (att) x.statut(e, 'faible', v[1]); } });
  carte({ id: 'fusion', nom: 'Choc thermique', t: 'S', r: 'P', cib: 'tous', v: [[1, 2, 3], [2, 3, 4]], txt: (v) => `${v[0]} Gel et ${v[1]} Brûlure à tous. Les ennemis qui ont les deux subissent ${v[2]} dégâts.`, f: (x, v) => { x.statutTous('gel', v[0]); x.statutTous('brulure', v[1]); x.ennemisVivants().forEach((e) => { if (e.st.gel && e.st.brulure) x.deg(v[2], e); }); } });
  carte({ id: 'catalyseur', nom: 'Catalyseur', t: 'S', r: 'R', cib: 'e', exil: true, v: [[0], [3]], txt: (v) => `Double la Brûlure et le Poison de la cible${v[0] ? ', puis +' + v[0] + ' de chaque' : ''}. Consumer.`, f: (x, v) => { const e = x.cible; if (!e) return; const b = e.st.brulure || 0, p = e.st.poison || 0; if (b) x.statut(e, 'brulure', b + v[0]); if (p) x.statut(e, 'poison', p + v[0]); } });
  carte({ id: 'meutesauvage', nom: 'Meute sauvage', t: 'L', r: 'R', tr: 'bete', c: 2, cib: 'alea', v: [[3, 6], [4, 7]], txt: (v) => `Inflige ${v[0]} dégâts à un ennemi au hasard, une fois par Bête dans ton paquet (au moins 2, au plus ${v[1]}).`, f: (x, v) => { const n = Math.min(v[1], Math.max(2, x.tribu('bete'))); for (let i = 0; i < n; i++) x.degAlea(v[0]); } });
  carte({ id: 'cristalbraise', nom: 'Cristal de braise', t: 'S', r: 'R', tr: 'givre', cib: 'e', v: [[2, 3], [3, 3]], txt: (v) => `Si la cible a Gel et Brûlure, inflige ${v[1]} fois sa Brûlure. Sinon, ${v[0]} Gel et ${v[0]} Brûlure.`, f: (x, v) => { const e = x.cible; if (!e) return; if (e.st.gel && e.st.brulure) x.deg(v[1] * e.st.brulure); else { x.statut(e, 'gel', v[0]); x.statut(e, 'brulure', v[0]); } } });
  carte({ id: 'forgeron', nom: 'Martèlement', t: 'L', tr: 'forge', cib: 'e', v: [[4, 4], [6, 5]], txt: (v) => `Inflige ${v[0]} dégâts. Gagne ${v[1]} garde.`, f: (x, v) => { x.deg(v[0]); x.garde(v[1]); } });
  carte({ id: 'veilleuse', nom: 'Veilleuse', t: 'S', tr: 'luciole', r: 'P', exil: true, v: [[2], [3]], txt: (v) => `Soigne ${v[0]} PV et pioche 1 carte par Luciole dans ta main. Consumer.`, f: (x, v) => { const n = x.c.main.filter((m) => C[m.id] && C[m.id].tr === 'luciole').length; x.soin(v[0]); x.pioche(Math.min(3, n + 1)); } });

  // taux V9 : 'feu' = élite enflammée ; 'boss' ne sert plus qu'aux événements (le boss donne 3 légendaires)
  TAUX.feu = { C: 0, P: 18, R: 50, E: 26, L: 6 };

  // ---------- bestiaire V9 ----------
  Object.assign(ENNEMIS, {
    // Acte 1, Caves
    fouine: { nom: 'Fouine-mèche', sprite: 'm-fouine', pv: [15, 18], m: [{ t: 'atk', v: 3, n: 2 }, { t: 'def', v: 5 }, { t: 'atkdeb', v: 4, s: 'expose', n2: 1 }], alea: true },
    cierge: { nom: 'Cierge errant', sprite: 'm-cierge', pv: [18, 22], m: [{ t: 'atk', v: 6 }, { t: 'buf', s: 'force', v: 1 }, { t: 'atk', v: 4, n: 2 }] },
    tisseur: { nom: 'Le Tisseur de suie', sprite: 'm-tisseur', pv: [44, 48], elite: true, m: [{ t: 'deb', s: 'suie', v: 2 }, { t: 'atk', v: 9 }, { t: 'atk', v: 5, n: 2 }] },
    // Acte 1, Marais
    crapaud: { nom: 'Crapaud-tourbe', sprite: 'm-crapaud', pv: [22, 26], m: [{ t: 'atkdeb', v: 5, s: 'poison', n2: 2 }, { t: 'def', v: 6 }, { t: 'atk', v: 8 }], passif: ['regen', 2] },
    feufollet: { nom: 'Feu follet', sprite: 'm-feufollet', pv: [10, 13], m: [{ t: 'atk', v: 4 }, { t: 'deb', s: 'faible', v: 1 }, { t: 'atk', v: 5 }] },
    reinesangsue: { nom: 'La Sangsue-reine', sprite: 'm-reinesangsue', pv: [50, 56], elite: true, m: [{ t: 'atk', v: 8 }, { t: 'atkdeb', v: 6, s: 'torpeur', n2: 1 }, { t: 'soin', v: 8 }, { t: 'atk', v: 4, n: 3 }] },
    // Boss acte 1
    matrone: { nom: 'La Matrone des tourbes', sprite: 'm-matrone', pv: [118, 118], boss: true, m: [{ t: 'atk', v: 9 }, { t: 'inv', id: 'limacon' }, { t: 'def', v: 12 }, { t: 'atk', v: 5, n: 2 }],
      m2: [{ t: 'atk', v: 13 }, { t: 'atkdeb', v: 6, s: 'poison', n2: 4 }, { t: 'soin', v: 10 }, { t: 'atk', v: 6, n: 3 }] },
    // Acte 2, Crypte
    gargouille: { nom: 'Gargouille', sprite: 'm-gargouille', pv: [34, 38], m: [{ t: 'def', v: 10 }, { t: 'atk', v: 12 }, { t: 'atk', v: 6, n: 2 }] },
    pleureuse: { nom: 'Pleureuse', sprite: 'm-pleureuse', pv: [26, 30], m: [{ t: 'soin', v: 9 }, { t: 'deb', s: 'faible', v: 2 }, { t: 'atk', v: 8 }] },
    gardienos: { nom: 'Le Gardien d\'ossuaire', sprite: 'm-gardienos', pv: [84, 90], elite: true, m: [{ t: 'atkdef', v: 10, g: 8 }, { t: 'atk', v: 15 }, { t: 'buf', s: 'force', v: 2 }, { t: 'atk', v: 6, n: 3 }] },
    // Acte 2, Givre
    loupgivre: { nom: 'Loup-givre', sprite: 'm-loupgivre', pv: [30, 34], m: [{ t: 'atk', v: 5, n: 2 }, { t: 'atk', v: 10 }, { t: 'deb', s: 'expose', v: 1 }] },
    stalagmite: { nom: 'Stalagmite vivante', sprite: 'm-stalagmite', pv: [40, 44], m: [{ t: 'def', v: 9 }, { t: 'atkdeb', v: 7, s: 'fragile', n2: 1 }, { t: 'atk', v: 11 }], passif: ['carapace', 3] },
    ombregivre: { nom: 'L\'Ombre de givre', sprite: 'm-ombregivre', pv: [58, 64], elite: true, m: [{ t: 'atk', v: 6, n: 3 }, { t: 'deb', s: 'expose', v: 2 }, { t: 'atk', v: 17 }] },
    // Boss acte 2
    tisserand: { nom: 'Le Tisserand de givre', sprite: 'm-tisserand', pv: [196, 196], boss: true, m: [{ t: 'atk', v: 8, n: 2 }, { t: 'deb', s: 'faible', v: 2 }, { t: 'atkdeb', v: 12, s: 'torpeur', n2: 1 }, { t: 'def', v: 18 }, { t: 'atk', v: 6, n: 4 }, { t: 'atk', v: 26 }] },
    // Acte 3, Foyer
    salamandre: { nom: 'Salamandre', sprite: 'm-salamandre', pv: [36, 40], m: [{ t: 'atkdeb', v: 7, s: 'brulure', n2: 3 }, { t: 'atk', v: 12 }], passif: ['regen', 3] },
    masqueforge: { nom: 'Masque de forge', sprite: 'm-masqueforge', pv: [50, 56], m: [{ t: 'atk', v: 8, n: 2 }, { t: 'def', v: 12 }, { t: 'buf', s: 'force', v: 2 }, { t: 'atk', v: 15 }] },
    forgeame: { nom: 'Le Forgeur d\'âmes', sprite: 'm-forgeame', pv: [94, 100], elite: true, m: [{ t: 'inv', id: 'diabfeu' }, { t: 'atk', v: 18 }, { t: 'atkdeb', v: 9, s: 'suie', n2: 1 }, { t: 'atk', v: 7, n: 3 }] },
    merebraise: { nom: 'La Mère des braises', sprite: 'm-merebraise', pv: [96, 104], elite: true, m: [{ t: 'atk', v: 13 }, { t: 'def', v: 14 }, { t: 'atkdeb', v: 8, s: 'brulure', n2: 4 }],
      m2: [{ t: 'atk', v: 8, n: 3 }, { t: 'buf', s: 'force', v: 3 }, { t: 'atkdeb', v: 12, s: 'brulure', n2: 6 }] },
    // Boss acte 3
    horloge: { nom: 'L\'Horloge de cendre', sprite: 'm-horloge', pv: [290, 290], boss: true, m: [{ t: 'buf', s: 'force', v: 2 }, { t: 'atk', v: 20 }, { t: 'atk', v: 8, n: 3 }, { t: 'def', v: 22 }, { t: 'atk', v: 34 }] }
  });
  // V9 : chaque élite et chaque boss a une signature, montrée en premier dans sa fiche
  Object.assign(TACTIQUES, {
    fouine: [['blinde', 1]], cierge: [['hainesort', 1]], tisseur: [['hainesort', 2]],
    crapaud: [['opportuniste', 1]], feufollet: [['ombre', 1]], reinesangsue: [['torpeur', 1], ['vampire', 1]],
    matrone: [['phase', 14]],
    gargouille: [['blinde', 2]], pleureuse: [['protecteur', 3]], gardienos: [['seuil', 18], ['protecteur', 4]],
    loupgivre: [['opportuniste', 1]], stalagmite: [['blinde', 1]], ombregivre: [['ombre', 1], ['enrage', 3]],
    tisserand: [['ombre', 1], ['torpeur', 1]],
    salamandre: [['explose', 6]], masqueforge: [['hainesort', 1]], forgeame: [['blinde', 3], ['galvanise', 2]], merebraise: [['phase', 16]],
    horloge: [['seuil', 34], ['hainesort', 1]]
  });
  Object.entries(ENNEMIS).forEach(([id, e]) => { e.pas = (TACTIQUES[id] || []).concat(e.passif ? [e.passif] : []); });
  Object.assign(PASSIFS, {
    hainesort: (n) => `Haine des sorts : chaque Sort que tu joues lui donne ${n} Force.`,
    blinde: (n) => `Blindé : chaque coup qu'il subit est réduit de ${n}.`,
    seuil: (n) => `Inébranlable : ne perd pas plus de ${n} PV par tour.`,
    torpeur: () => 'Engourdissant : ses attaques te donnent de la Torpeur (1 mana de moins au tour suivant).',
    ombre: () => 'Insaisissable : esquive le premier coup de chaque tour.',
    phase: (n) => `Deux phases : sous la moitié de ses PV, change de tactique et gagne ${n} garde.`
  });

  // mondes V9 : plus de rencontres, 3 élites par monde, 3 boss par acte
  const plus = {
    caves: { normaux: [['fouine', 'fouine'], ['cierge'], ['fouine', 'cierge'], ['cierge', 'diablotin']], faciles: [['fouine'], ['cierge']], elites: [['tisseur']] },
    marais: { normaux: [['crapaud'], ['feufollet', 'feufollet'], ['crapaud', 'limacon'], ['feufollet', 'vaseux']], faciles: [['feufollet'], ['crapaud']], elites: [['reinesangsue']] },
    crypte: { normaux: [['gargouille'], ['pleureuse', 'osselet'], ['gargouille', 'pleureuse'], ['cornu', 'pleureuse']], elites: [['gardienos']] },
    givre: { normaux: [['loupgivre', 'loupgivre'], ['stalagmite'], ['loupgivre', 'diabgivre'], ['stalagmite', 'loupgivre']], elites: [['ombregivre']] },
    foyer: { normaux: [['salamandre'], ['masqueforge'], ['salamandre', 'diabfeu'], ['masqueforge', 'diabfeu'], ['salamandre', 'cornard']], elites: [['forgeame'], ['merebraise']] }
  };
  Object.entries(plus).forEach(([k, p]) => { const m = MONDES[k]; m.normaux = m.normaux.concat(p.normaux); if (p.faciles) m.faciles = m.faciles.concat(p.faciles); m.elites = m.elites.concat(p.elites); });
  ACTES[0].boss.push('matrone'); ACTES[1].boss.push('tisserand'); ACTES[2].boss.push('horloge');

  // ---------- serments : défis optionnels choisis au départ (plus de renom) ----------
  const SERMENTS = {
    cendre: { nom: 'Serment de cendre', txt: 'Élites : +25 % de PV et +1 Force. Leur relique se choisit parmi 3.', renom: 15 },
    meute: { nom: 'Serment de la meute', txt: 'Combats normaux : ennemis +15 % de PV et +1 dégât. +20 % d\'or.', renom: 15 },
    jeune: { nom: 'Serment du jeûne', txt: 'Les braseros soignent 10 % de PV max en moins. Les récompenses proposent 4 cartes.', renom: 10 },
    orgueil: { nom: 'Serment d\'orgueil', txt: '10 PV max de moins. Chaque boss propose 4 légendaires au lieu de 3.', renom: 10 }
  };

  // ---------- événements V9 ----------
  EVENEMENTS.push(
    { id: 'duelliste', titre: 'Le duelliste masqué', txt: 'Il plante son épée dans le sol et attend. Sur sa ceinture, une bourse et une fiole.', choix: [
      { txt: 'Accepter le duel (combat d\'élite, puis une carte rare au choix)', eff: [['elite'], ['carteRare']] },
      { txt: 'Saluer et passer (+10 XP)', eff: [['xp', 10]] }] },
    { id: 'chorale', titre: 'La chorale des cendres', txt: 'Des voix sans corps chantent un air que tu crois reconnaître. Il manque une note.', choix: [
      { txt: 'Chanter la note manquante (affûte 2 cartes au hasard, −5 PV)', eff: [['pv', -5], ['affuteAlea'], ['affuteAlea']] },
      { txt: 'Écouter jusqu\'au bout (soigne 8 PV, +10 XP)', eff: [['pv', 8], ['xp', 10]] }] },
    { id: 'reliquaire', titre: 'Le reliquaire scellé', actes: [2, 3], txt: 'Trois sceaux de cire. Briser le premier est facile. Le troisième brûle les doigts.', choix: [
      { txt: 'Briser les trois sceaux (−14 PV, une relique d\'élite et +1 éclat)', eff: [['pv', -14], ['relique'], ['eclats', 1]] },
      { txt: 'Briser un seul sceau (+40 or)', eff: [['or', 40]] }] },
    { id: 'jardinier', titre: 'Le jardinier des ronces', txt: 'Il taille un buisson qui pousse à vue d\'œil. Il te tend son sécateur.', choix: [
      { txt: 'Tailler ton paquet (retire 2 cartes)', eff: [['retire'], ['retire']] },
      { txt: 'Cueillir un fruit (+6 PV max)', eff: [['pvMax', 6]] }] },
    { id: 'cartographe', titre: 'Le cartographe fou', txt: 'Il a dessiné la suite du chemin sur sa propre peau. Il veut bien la montrer, contre un peu de toi.', choix: [
      { txt: 'Regarder la carte (le prochain combat sera une élite, +2 éclats)', eff: [['elite'], ['eclats', 2]] },
      { txt: 'Lui acheter de l\'encre (25 or, une carte de ta classe au choix)', cond: ['or', 25], eff: [['or', -25], ['carteClasse']] },
      { txt: 'Le laisser à ses traits', eff: [] }] },
    { id: 'braiserare', titre: 'La braise d\'or', txt: 'Au creux d\'une souche, une braise brille d\'un éclat doré. Elle tient chaud à ta chance.', choix: [
      { txt: 'La garder (jauge de fortune pleine)', eff: [['fortune', 10]] },
      { txt: 'L\'échanger au premier venu (+45 or)', eff: [['or', 45]] }] },
    { id: 'gardienpont', titre: 'Le gardien du pont', actes: [1, 2], txt: 'Un géant de pierre bloque le passage. Il demande un péage, ou une preuve de force.', choix: [
      { txt: 'Payer le péage (40 or, soigne 12 PV)', cond: ['or', 40], eff: [['or', -40], ['pv', 12]] },
      { txt: 'Le défier (combat d\'élite, +30 XP)', eff: [['elite'], ['xp', 30]] }] },
    { id: 'echoir', titre: 'Le puits aux échos', actes: [2, 3], txt: 'Tu cries ton nom au fond du puits. Ce qui te répond n\'a pas ta voix.', choix: [
      { txt: 'Lui répondre (duplique une carte, 1 Suie dans ton paquet)', eff: [['duplique'], ['suies', 1]] },
      { txt: 'Jeter une pièce (−10 or, +1 éclat)', cond: ['or', 10], eff: [['or', -10], ['eclats', 1]] }] }
  );

  const D = { TRIBUS, STATUTS, CLASSES, CARTES: C, TALISMANS, RELIQUES, FAMILIERS, RARETES, TAUX, ENNEMIS, PASSIFS, MONDES, ACTES, TALENTS, EVENEMENTS, SERMENTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
  else racine.BraisesDonnees = D;
})(typeof window !== 'undefined' ? window : globalThis);
