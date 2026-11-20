/* Braises V7 : musique et bruitages synthétisés en direct (Web Audio), aucun fichier audio externe.
   Thèmes distincts : titre, carte, combat, élite, boss, marchand. Réverbération, compresseur, volumes réglables.
   iOS : session audio « playback » (ignore le bouton silencieux si possible), déblocage au premier geste,
   élément <audio> silencieux en boucle, reprise après interruption ou retour dans l'appli. */
const Son = (() => {
  let ctx = null, master, comp, musBus, sfxBus, reverb, revSend, muet = false;
  let volM = 0.8, volE = 0.9;
  let theme = null, themeBus = null, planif = null, prochaine = 0, mesure = 0, sceneCourante = 'silence';
  let audioHTML = null;

  // ---------- contexte et déblocage ----------
  function silenceWav() {
    const sr = 8000, n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return 'data:audio/wav;base64,' + btoa(s);
  }
  function impulsion(sec, dec) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, dec); }
    return b;
  }
  function construire(c) {
    ctx = c;
    master = ctx.createGain(); master.gain.value = muet ? 0 : 1;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    musBus = ctx.createGain(); musBus.gain.value = volM * 0.9; musBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = volE; sfxBus.connect(master);
    reverb = ctx.createConvolver(); reverb.buffer = impulsion(2.4, 2.6);
    revSend = ctx.createGain(); revSend.gain.value = 0.32; revSend.connect(reverb); reverb.connect(musBus);
  }
  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      construire(new AC());
      ctx.onstatechange = () => { if (ctx.state === 'interrupted' || ctx.state === 'suspended') { /* repris au prochain geste */ } };
    }
    return ctx;
  }
  function debloquer() {
    ac();
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} }
    try { // un échantillon vide joué dans le geste : réveille Web Audio sur les vieux iOS
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) {}
    try { // <audio> silencieux en boucle : bascule la session iOS en lecture média (le bouton silencieux ne coupe plus le jeu)
      if (!audioHTML) { audioHTML = new Audio(silenceWav()); audioHTML.loop = true; audioHTML.setAttribute('playsinline', ''); audioHTML.volume = 0.01; }
      const p = audioHTML.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
    if (sceneCourante !== 'silence' && !planif && ctx.state === 'running') relancer();
  }
  function suspendu() { return !ctx || ctx.state !== 'running'; }
  function etat() { if (!ctx) return 'pas encore démarré (touche l\'écran)'; return { running: 'actif', suspended: 'en attente d\'un toucher', interrupted: 'interrompu (appel, autre appli)', closed: 'fermé' }[ctx.state] || ctx.state; }
  function volumes(m, e) {
    volM = m; volE = e;
    if (ctx) { musBus.gain.setTargetAtTime(volM * 0.9, ctx.currentTime, 0.05); sfxBus.gain.setTargetAtTime(volE, ctx.currentTime, 0.05); }
  }
  function bascule() { muet = !muet; if (ctx) master.gain.setTargetAtTime(muet ? 0 : 1, ctx.currentTime, 0.05); return muet; }

  // ---------- instruments ----------
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function voix(dest, type, f, t, dur, vol, o) {
    o = o || {};
    const os = ctx.createOscillator(), g = ctx.createGain();
    os.type = type; os.frequency.setValueAtTime(f, t);
    if (o.glide) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.glide), t + (o.gt || dur));
    if (o.det) os.detune.value = o.det;
    let n = os;
    if (o.cut) {
      const fl = ctx.createBiquadFilter(); fl.type = o.ft || 'lowpass'; fl.Q.value = o.q || 0.7;
      fl.frequency.setValueAtTime(o.cut, t);
      if (o.cut2) fl.frequency.exponentialRampToValueAtTime(o.cut2, t + (o.ct || dur));
      os.connect(fl); n = fl;
    }
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * o.vib, t + Math.min(0.35, dur)); l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur + 0.6); }
    const a = o.a || 0.005, r = o.r || 0.08;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.d) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * (o.s == null ? 0.3 : o.s)), t + a + o.d);
    g.gain.setValueAtTime(o.d ? Math.max(0.0001, vol * (o.s == null ? 0.3 : o.s)) : vol, t + Math.max(a + (o.d || 0), dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + (o.d || 0), dur) + r);
    n.connect(g); g.connect(dest);
    if (o.rev && revSend) { const s = ctx.createGain(); s.gain.value = o.rev; g.connect(s); s.connect(revSend); }
    os.start(t); os.stop(t + dur + r + 0.05);
    return os;
  }
  let bruitBuf = null;
  function bruit(dest, t, dur, vol, o) {
    o = o || {};
    if (!bruitBuf || bruitBuf.sampleRate !== ctx.sampleRate) { const n = ctx.sampleRate; bruitBuf = ctx.createBuffer(1, n, n); const d = bruitBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = bruitBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f || 2000, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.a || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    if (o.rev && revSend) { const r = ctx.createGain(); r.gain.value = o.rev; g.connect(r); r.connect(revSend); }
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  const kick = (d, t, v) => voix(d, 'sine', 150, t, 0.22, v, { glide: 42, gt: 0.16, r: 0.06 });
  const snare = (d, t, v) => { bruit(d, t, 0.18, v, { f: 1900, q: 0.8, rev: 0.25 }); voix(d, 'triangle', 220, t, 0.06, v * 0.5, { glide: 140 }); };
  const hat = (d, t, v, ouvert) => bruit(d, t, ouvert ? 0.18 : 0.045, v, { ft: 'highpass', f: 7500 });
  const tom = (d, t, f, v) => voix(d, 'sine', f, t, 0.3, v, { glide: f * 0.55, rev: 0.3 });
  const timbale = (d, t, f, v) => { voix(d, 'sine', f, t, 0.9, v, { glide: f * 0.92, gt: 0.9, r: 0.3, rev: 0.45 }); bruit(d, t, 0.12, v * 0.4, { f: 300, q: 0.6 }); };
  const shaker = (d, t, v) => bruit(d, t, 0.06, v, { ft: 'highpass', f: 5000, a: 0.02 });
  function pad(d, t, notes, dur, v, cut, type) {
    notes.forEach((m) => [-9, 9].forEach((det) => voix(d, type || 'sawtooth', hz(m), t, dur, v / notes.length, { a: dur * 0.3, r: dur * 0.4, det, cut: cut || 1400, q: 0.5, rev: 0.6 })));
  }
  const INSTR = {
    cloche: (d, t, m, dur, v) => { voix(d, 'sine', hz(m), t, dur, v, { d: 0.5, s: 0.1, r: 0.8, rev: 0.6 }); voix(d, 'sine', hz(m) * 2.76, t, 0.2, v * 0.25, { d: 0.15, s: 0.01, r: 0.2, rev: 0.6 }); },
    flute: (d, t, m, dur, v) => { voix(d, 'triangle', hz(m), t, dur, v, { a: 0.04, vib: 0.008, r: 0.15, rev: 0.45 }); bruit(d, t, 0.08, v * 0.15, { f: hz(m) * 2, q: 4 }); },
    carre: (d, t, m, dur, v) => voix(d, 'square', hz(m), t, dur, v * 0.55, { cut: 2600, cut2: 1200, d: 0.12, s: 0.6, r: 0.06, rev: 0.2 }),
    scie: (d, t, m, dur, v) => { voix(d, 'sawtooth', hz(m), t, dur, v * 0.5, { cut: 3200, cut2: 900, d: 0.1, s: 0.6, r: 0.08, rev: 0.25, det: -6 }); voix(d, 'sawtooth', hz(m), t, dur, v * 0.35, { cut: 2200, det: 7, r: 0.08 }); },
    cuivre: (d, t, m, dur, v) => { [-7, 0, 7].forEach((det) => voix(d, 'sawtooth', hz(m), t, dur, v * 0.36, { a: 0.06, cut: 500, cut2: 2400, ct: 0.18, q: 1.2, det, r: 0.18, rev: 0.5, vib: 0.004 })); },
    marimba: (d, t, m, dur, v) => { voix(d, 'sine', hz(m), t, 0.3, v, { d: 0.25, s: 0.01, r: 0.1, rev: 0.25 }); voix(d, 'sine', hz(m) * 4, t, 0.05, v * 0.25, { r: 0.04 }); },
    pizz: (d, t, m, dur, v) => voix(d, 'triangle', hz(m), t, 0.2, v, { d: 0.18, s: 0.01, cut: 1600, r: 0.08, rev: 0.25 })
  };
  const BASSE = {
    ronde: (d, t, m, dur, v) => voix(d, 'triangle', hz(m), t, dur, v, { cut: 600, r: 0.1 }),
    pulse: (d, t, m, dur, v) => voix(d, 'sawtooth', hz(m), t, dur, v * 0.8, { cut: 900, cut2: 220, ct: dur, q: 3, r: 0.04 }),
    lourde: (d, t, m, dur, v) => { voix(d, 'sawtooth', hz(m), t, dur, v * 0.7, { cut: 700, cut2: 180, ct: dur, q: 6, r: 0.05 }); voix(d, 'square', hz(m - 12), t, dur, v * 0.35, { cut: 300, r: 0.05 }); },
    pizz: (d, t, m, dur, v) => voix(d, 'triangle', hz(m), t, 0.22, v, { d: 0.2, s: 0.02, r: 0.06 })
  };

  // ---------- thèmes (compositions originales) ----------
  // acc : [demi-tons depuis la tonique, 'm' ou 'M'] par mesure. mel : une mesure = 8 croches (« - » tenue, « . » silence).
  const T = {
    titre: { bpm: 72, ton: 50, acc: [[0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M'], [0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M']], lead: 'cloche', oct: 24, lv: 0.22,
      mel: ['7 - 5 3 2 - 0 -', '3 - - 2 0 - - -', '0 - 3 - 7 - 10 -', '10 - - 7 5 - 2 -', '12 - - 10 7 - 5 -', '8 - 7 - 5 - 3 -', '3 - 5 - 7 - 12 -', '14 - - - 10 - - -'],
      basse: 'ronde', bp: '0-------5-------', padv: 0.2, cut: 1100, arp: 'up', arpv: 0.05, dr: {} },
    carte: { bpm: 96, ton: 45, acc: [[0, 'm'], [5, 'M'], [0, 'm'], [-2, 'M'], [-4, 'M'], [-2, 'M'], [0, 'm'], [0, 'm']], lead: 'flute', oct: 24, lv: 0.2,
      mel: ['0 - 2 3 7 - 5 3', '5 - 9 - 12 - 9 -', '7 - 5 3 2 - 0 -', '-2 - 2 - 5 - . .', '-4 - 0 - 3 - 0 -', '-2 - 2 - 5 - 7 -', '12 - 10 - 7 - 3 2', '0 - - - . . . .'],
      basse: 'ronde', bp: '0---0-5-0---o-5-', padv: 0.12, cut: 1500, arp: 'pluck', arpv: 0.07,
      dr: { k: 'x.......x.......', s: '....x.......x...', h: '..h...h...h...hh' }, drv: 0.6 },
    combat: { bpm: 138, ton: 40, acc: [[0, 'm'], [-4, 'M'], [-2, 'M'], [-5, 'M'], [0, 'm'], [-4, 'M'], [5, 'm'], [-5, 'M']], lead: 'carre', oct: 24, lv: 0.17,
      mel: ['0 0 7 0 10 0 7 5', '3 0 -4 0 3 5 3 0', '2 2 5 2 7 5 2 -2', '7 - 11 - 14 - 11 7', '12 - 10 7 12 - 15 -', '15 - 12 - 8 - 7 -', '12 - 8 - 5 - 8 12', '11 - 14 - 19 - - -'],
      basse: 'pulse', bp: '0.0.0.o.0.0.5.o.', padv: 0.09, cut: 1800,
      dr: { k: 'x...x...x...x.x.', s: '....s.......s...', h: 'hhhhhhhhhhhhhhho', t: '..............tt' }, drv: 0.85, intro: 2 },
    elite: { bpm: 148, ton: 37, acc: [[0, 'm'], [1, 'M'], [0, 'm'], [-2, 'M'], [0, 'm'], [1, 'M'], [3, 'M'], [1, 'M']], lead: 'scie', oct: 24, lv: 0.17,
      mel: ['0 - 1 0 7 - 8 7', '8 - 5 - 1 - 5 8', '0 - 1 0 12 - 10 8', '5 - 2 - -2 - . .', '12 13 12 10 8 - 7 -', '13 - 8 - 5 - 1 -', '3 - 7 - 10 - 15 -', '13 - 12 - 8 - - -'],
      basse: 'lourde', bp: '0000o0000000o0o0', padv: 0.1, cut: 1300,
      dr: { k: 'x.x.x.x.x.x.x.xx', s: '....s.......s..s', h: 'h.h.h.h.h.h.h.h.', t: '............ttTT' }, drv: 0.9, intro: 1 },
    boss: { bpm: 112, ton: 38, acc: [[0, 'm'], [-4, 'M'], [5, 'm'], [7, 'M'], [0, 'm'], [-4, 'M'], [-2, 'M'], [7, 'M']], lead: 'cuivre', oct: 24, lv: 0.2,
      mel: ['0 - - - 7 - - -', '8 - - 7 5 - 3 -', '5 - - - 8 - 7 5', '7 - 11 - 14 - - -', '12 - - - 15 - 14 12', '10 - - - 8 - 7 -', '10 - - - 14 - 17 -', '14 - - - 11 - 7 -'],
      basse: 'lourde', bp: '0-----0-0-----5-', padv: 0.22, cut: 1700, choeur: true,
      dr: { T: 'T.......T...T...', k: 'x.....x.x.....x.', s: '....s.......s...', t: '..........t.tttt', h: '..h...h...h...h.' }, drv: 0.95, intro: 2 },
    marchand: { bpm: 112, ton: 41, acc: [[0, 'M'], [-3, 'm'], [5, 'M'], [7, 'M'], [0, 'M'], [-3, 'm'], [2, 'm'], [7, 'M']], lead: 'marimba', oct: 24, lv: 0.24, swing: 0.2,
      mel: ['0 - 4 7 9 - 7 4', '9 - 12 - 16 - 12 9', '5 - 9 - 12 - 9 5', '7 - 11 - 14 - 12 11', '12 - 9 - 7 - 4 -', '9 - 5 - 4 - 0 -', '2 - 5 - 9 - 7 5', '7 - 11 - 14 - - -'],
      basse: 'pizz', bp: '0...5...o...5...', padv: 0.06, cut: 1200, arp: 'pizz', arpv: 0.06,
      dr: { k: 'x.......x.......', sh: 'ssssssssssssssss', s: '....s.......s...' }, drv: 0.45 }
  };
  const SCENE = { titre: 'titre', classe: 'titre', defaite: 'titre', victoire: 'marchand', carte: 'carte', recompense: 'carte', niveau: 'carte', tresor: 'carte', evenement: 'carte', brasero: 'carte', selection: 'carte', marchand: 'marchand', combat: 'combat', elite: 'elite', boss: 'boss' };

  function accord(th, b) { const [o, q] = th.acc[b % th.acc.length]; const r = th.ton + o; return [r + 12, r + 12 + (q === 'm' ? 3 : 4), r + 19]; }
  function jouerMesure(th, d, t0, n) {
    const temps = 60 / th.bpm, croche = temps / 2, d16 = temps / 4, bar = temps * 4, b = n % 8, cycle = Math.floor(n / 8);
    const ac3 = accord(th, b), rac = ac3[0] - 12;
    const sw = (i) => (th.swing && i % 2 ? d16 * th.swing : 0);
    if (th.padv) pad(d, t0, th.choeur ? [ac3[0], ac3[1], ac3[2], ac3[0] + 12] : ac3, bar, th.padv, th.cut, th.choeur ? 'sawtooth' : 'triangle');
    if (th.choeur) voix(d, 'sine', hz(ac3[0] + 12), t0, bar, 0.05, { a: 0.5, vib: 0.006, rev: 0.8, r: 0.6 });
    // basse
    const bp = th.bp;
    for (let i = 0; i < 16; i++) {
      const c = bp[i]; if (c === '.' || c === '-') continue;
      let len = 1; while (i + len < 16 && bp[i + len] === '-') len++;
      const m = rac - 12 + (c === '5' ? 7 : c === 'o' ? 12 : 0);
      BASSE[th.basse](d, t0 + i * d16 + sw(i), m, len * d16 * 0.95, 0.3);
    }
    // arpèges
    if (th.arp) for (let i = 0; i < 8; i++) {
      const m = ac3[[0, 1, 2, 1, 0, 2, 1, 2][i]] + 12;
      if (th.arp === 'up') INSTR.cloche(d, t0 + i * croche, m, croche, th.arpv * 0.6);
      else if (th.arp === 'pizz') INSTR.pizz(d, t0 + i * croche + sw(i * 2), m, croche, th.arpv);
      else voix(d, 'triangle', hz(m), t0 + i * croche, croche, th.arpv, { d: 0.12, s: 0.05, cut: 2400, rev: 0.3 });
    }
    // batterie
    const dr = th.dr || {}, v = th.drv || 0.7, fill = b === 7;
    for (let i = 0; i < 16; i++) {
      const t = t0 + i * d16 + sw(i);
      if (dr.k && dr.k[i] === 'x') kick(d, t, 0.5 * v);
      if (dr.s && dr.s[i] === 's') snare(d, t, 0.22 * v);
      if (dr.h && dr.h[i] !== '.') hat(d, t, 0.05 * v, dr.h[i] === 'o');
      if (dr.sh && dr.sh[i] !== '.') shaker(d, t, (i % 4 === 2 ? 0.05 : 0.025) * v);
      if (dr.t && dr.t[i] === 't' && (fill || cycle % 2)) tom(d, t, 140 - i * 3, 0.3 * v);
      if (dr.t && dr.t[i] === 'T' && fill) timbale(d, t, 70, 0.45 * v);
      if (dr.T && dr.T[i] === 'T') timbale(d, t, hz(rac - 12) * 2, 0.5 * v);
    }
    // mélodie : intro sans mélodie, puis au second passage une octave plus haut sur la phrase B
    if (th.intro && n < th.intro) return;
    const toks = th.mel[b].split(' ');
    for (let i = 0; i < toks.length; i++) {
      const k = toks[i]; if (k === '-' || k === '.') continue;
      let len = 1; while (i + len < toks.length && toks[i + len] === '-') len++;
      const m = th.ton + th.oct + (+k) + (cycle % 2 && b >= 4 && th.lead !== 'cuivre' ? 12 : 0);
      INSTR[th.lead](d, t0 + i * croche + sw(i * 2), m, len * croche * 0.92, th.lv);
    }
  }
  function boucle() {
    planif = null;
    if (!ctx || !theme) return;
    if (ctx.state !== 'running') { planif = setTimeout(boucle, 400); return; }
    const bar = (60 / theme.bpm) * 4;
    if (prochaine < ctx.currentTime) prochaine = ctx.currentTime + 0.06; // reprise après une pause : pas de rattrapage en rafale
    while (prochaine < ctx.currentTime + 1.2) { jouerMesure(theme, themeBus, prochaine, mesure); prochaine += bar; mesure++; }
    planif = setTimeout(boucle, 250);
  }
  function relancer() { if (planif) clearTimeout(planif); boucle(); }
  function musique(scene) {
    ac();
    const nom = SCENE[scene] || 'carte';
    sceneCourante = scene || 'silence';
    if (theme === T[nom]) return;
    const vieux = themeBus;
    if (vieux) { vieux.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.35); setTimeout(() => { try { vieux.disconnect(); } catch (e) {} }, 2500); }
    theme = T[nom]; mesure = 0;
    themeBus = ctx.createGain(); themeBus.gain.setValueAtTime(0.0001, ctx.currentTime); themeBus.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6); themeBus.connect(musBus);
    themeBus.connect(revSend);
    prochaine = ctx.currentTime + 0.1;
    relancer();
  }
  function couper() { theme = null; if (planif) clearTimeout(planif); planif = null; if (themeBus) themeBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); }

  // ---------- bruitages ----------
  function bip(sorte, n) {
    if (!ctx || ctx.state !== 'running') { if (ctx) try { ctx.resume(); } catch (e) {} if (!ctx) return; }
    const t = ctx.currentTime + 0.005, d = sfxBus;
    switch (sorte) {
      case 'clic': voix(d, 'square', 1800, t, 0.015, 0.06, { cut: 3000, r: 0.02 }); break;
      case 'lame': bruit(d, t, 0.16, 0.35, { f: 5000, f2: 900, q: 1.5 }); voix(d, 'triangle', 660, t, 0.05, 0.12, { glide: 990, r: 0.05 }); break;
      case 'sort': [0, 7, 12].forEach((s, i) => voix(d, 'sine', hz(76 + s), t + i * 0.045, 0.18, 0.1, { d: 0.12, s: 0.2, r: 0.2, rev: 0.6 })); bruit(d, t, 0.25, 0.06, { ft: 'highpass', f: 6000 }); break;
      case 'degat': { const g = Math.min(1, 0.45 + (n || 6) / 30); voix(d, 'sine', 180, t, 0.18, 0.55 * g, { glide: 50, r: 0.06 }); bruit(d, t, 0.12, 0.4 * g, { f: 1200, f2: 300, q: 0.7 }); voix(d, 'square', 90, t, 0.06, 0.12 * g, { cut: 800, r: 0.03 }); break; }
      case 'bloc': voix(d, 'square', 520, t, 0.05, 0.1, { cut: 2500, ft: 'bandpass', q: 6, r: 0.25, rev: 0.4 }); voix(d, 'triangle', 1310, t, 0.04, 0.08, { r: 0.3, rev: 0.5 }); bruit(d, t, 0.08, 0.15, { f: 3500, q: 3 }); break;
      case 'soin': [0, 4, 7, 12].forEach((s, i) => voix(d, 'sine', hz(72 + s), t + i * 0.06, 0.2, 0.08, { d: 0.1, s: 0.3, r: 0.2, rev: 0.6 })); break;
      case 'carte': bruit(d, t, 0.09, 0.2, { ft: 'highpass', f: 2500, f2: 6000 }); voix(d, 'sine', 1046, t + 0.06, 0.12, 0.08, { r: 0.25, rev: 0.5 }); break;
      case 'piece': voix(d, 'square', 988, t, 0.07, 0.07, { cut: 4000, r: 0.02 }); voix(d, 'square', 1319, t + 0.07, 0.18, 0.07, { cut: 4000, r: 0.15 }); break;
      case 'achat': bip('piece'); voix(d, 'square', 1568, t + 0.16, 0.2, 0.06, { cut: 4000, r: 0.2, rev: 0.3 }); bruit(d, t, 0.1, 0.1, { f: 4000, q: 2 }); break;
      case 'coffre': voix(d, 'sawtooth', 110, t, 0.25, 0.06, { glide: 160, cut: 600, r: 0.05 }); [0, 4, 7, 12, 16].forEach((s, i) => voix(d, 'sine', hz(79 + s), t + 0.2 + i * 0.05, 0.12, 0.08, { r: 0.3, rev: 0.6 })); break;
      case 'erreur': voix(d, 'square', 160, t, 0.08, 0.08, { cut: 900, r: 0.03 }); voix(d, 'square', 120, t + 0.09, 0.1, 0.08, { cut: 900, r: 0.03 }); break;
      case 'fin-tour': voix(d, 'sine', 800, t, 0.03, 0.12, { glide: 500, r: 0.05 }); voix(d, 'sine', 600, t + 0.08, 0.03, 0.1, { glide: 380, r: 0.05 }); break;
      case 'mort': bruit(d, t, 0.45, 0.3, { f: 2000, f2: 120, q: 0.8 }); voix(d, 'sawtooth', 300, t, 0.35, 0.08, { glide: 60, cut: 900, r: 0.1 }); break;
      case 'esquive': bruit(d, t, 0.2, 0.18, { f: 1200, f2: 4500, q: 2 }); break;
      case 'rage': voix(d, 'sawtooth', 70, t, 0.4, 0.2, { glide: 110, cut: 500, q: 8, r: 0.1 }); break;
      case 'vol': [0, 1, 2].forEach((i) => voix(d, 'square', 1319 - i * 220, t + i * 0.06, 0.05, 0.05, { cut: 3000, r: 0.03 })); break;
      case 'echo': [0, 0.12, 0.24].forEach((dt, i) => voix(d, 'triangle', 1175, t + dt, 0.06, 0.1 / (i + 1), { r: 0.12, rev: 0.4 })); break;
      case 'surcharge': voix(d, 'sawtooth', 200, t, 0.25, 0.1, { glide: 1200, cut: 3000, r: 0.05 }); break;
      case 'chaleur': for (let i = 0; i < 5; i++) bruit(d, t + i * 0.03 + Math.random() * 0.02, 0.02, 0.12, { f: 3000 + Math.random() * 3000, q: 4 }); break;
      case 'niveau': [0, 4, 7, 12].forEach((s, i) => INSTR.cuivre(d, t + i * 0.09, 67 + s, 0.16, 0.12)); break;
      default: voix(d, 'triangle', 660, t, 0.05, 0.08, { r: 0.05 });
    }
  }
  // V8 : montée de hauteur pour chaque carte enchaînée dans le même tour, impact proportionnel aux dégâts.
  const journal = [];
  const GAMME = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
  function chaine(n, sorte) {
    const k = Math.max(0, Math.min(GAMME.length - 1, (n || 1) - 1)), m = 67 + GAMME[k], f = hz(m);
    journal.push({ sorte: 'chaine', n, hz: Math.round(f) }); if (journal.length > 50) journal.shift();
    if (!ctx) return f;
    const t = ctx.currentTime + 0.005, d = sfxBus;
    voix(d, sorte === 'S' ? 'sine' : 'triangle', f, t, 0.09, 0.07 + Math.min(0.05, k * 0.006), { r: 0.12, rev: 0.45 });
    voix(d, 'sine', f * 2, t + 0.03, 0.06, 0.03, { r: 0.1, rev: 0.6 });
    return f;
  }
  function impact(n, letal) {
    journal.push({ sorte: 'impact', n }); if (journal.length > 50) journal.shift();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005, d = sfxBus, g = Math.min(1, 0.35 + (n || 0) / 25);
    voix(d, 'sine', 120, t, 0.22, 0.5 * g, { glide: 38, r: 0.08 });
    bruit(d, t, 0.18, 0.35 * g, { f: 1800, f2: 200, q: 0.8 });
    if (letal) { voix(d, 'sawtooth', 220, t + 0.05, 0.3, 0.07, { glide: 55, cut: 1200, r: 0.1 }); timbale(d, t + 0.04, 49, 0.35); }
  }
  function stinger(sorte) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.02, d = sfxBus;
    if (themeBus) { const g = themeBus.gain; try { g.cancelScheduledValues(t); } catch (e) {} g.setTargetAtTime(0.25, t, 0.05); g.setTargetAtTime(1, t + 1.6, 0.4); }
    journal.push({ sorte: 'stinger', nom: sorte }); if (journal.length > 50) journal.shift();
    if (sorte === 'victoire') { [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36]].forEach(([m, dt]) => INSTR.cuivre(d, t + dt, m, 0.14, 0.2)); pad(d, t + 0.48, [72, 76, 79, 84], 1.3, 0.3, 2600); timbale(d, t + 0.48, 98, 0.5); }
    else if (sorte === 'defaite') { [[62, 0], [61, 0.45], [60, 0.9], [55, 1.35]].forEach(([m, dt]) => INSTR.cuivre(d, t + dt, m, 0.5, 0.14)); timbale(d, t + 1.35, 55, 0.5); }
    else if (sorte === 'relique') { [0, 4, 7, 11, 14, 19].forEach((s, i) => INSTR.cloche(d, t + i * 0.07, 72 + s, 0.4, 0.1)); bruit(d, t, 0.8, 0.05, { ft: 'highpass', f: 7000, rev: 0.5 }); }
    else if (sorte === 'familier') { [0, 5, 9, 12, 17].forEach((s, i) => INSTR.flute(d, t + i * 0.09, 72 + s, 0.14, 0.12)); }
    else if (sorte === 'evolution') { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => INSTR.cloche(d, t + i * 0.08, 67 + s, 0.5, 0.1)); pad(d, t + 0.56, [67, 71, 74, 79], 1.6, 0.26, 3200); timbale(d, t + 0.56, 55, 0.45); bruit(d, t + 0.5, 1.2, 0.06, { ft: 'highpass', f: 6500, rev: 0.7 }); }
    else if (sorte === 'boss') { [[43, 0], [46, 0.32], [42, 0.64]].forEach(([m, dt]) => INSTR.cuivre(d, t + dt, m, 0.5, 0.2)); timbale(d, t, 43, 0.6); timbale(d, t + 0.64, 38, 0.6); }
    else bip(sorte);
  }

  // ---------- rendu hors ligne (contrôle du niveau sonore) ----------
  async function rendreMorceau(scene, options) {
    options = options || {};
    const sec = options.secondes || 20, sr = 44100;
    const off = new OfflineAudioContext(2, Math.ceil(sr * sec), sr);
    const sauve = { ctx, master, comp, musBus, sfxBus, reverb, revSend };
    construire(off);
    const th = T[SCENE[scene] || scene], bus = off.createGain(); bus.connect(musBus); bus.connect(revSend);
    const bar = (60 / th.bpm) * 4; let t = 0.05, n = 0;
    while (t < sec - bar) { jouerMesure(th, bus, t, n++); t += bar; }
    const r = await off.startRendering();
    ({ ctx, master, comp, musBus, sfxBus, reverb, revSend } = sauve);
    const g = r.getChannelData(0); let som = 0, crete = 0;
    for (let i = 0; i < g.length; i++) { const a = Math.abs(g[i]); if (a > crete) crete = a; som += g[i] * g[i]; }
    return { crete, rms: Math.sqrt(som / g.length) };
  }

  return { init: debloquer, debloquer, suspendu, etat, volumes, bip, chaine, impact, journal, musique, couper, bascule, stinger, rendreMorceau, estMuet: () => muet, themes: Object.keys(T) };
})();
