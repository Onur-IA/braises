/* Braises : musique et sons générés, aucun fichier audio externe. */
const Son = (() => {
  let ctx, master, musiqueGain, sfxGain, muet = false;
  let planif = null, piste = 'silence', prochaine = 0;
  const BPM = { titre: 76, carte: 84, combat: 104, repos: 68, boutique: 90, victoire: 96 };

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
      musiqueGain = ctx.createGain();
      musiqueGain.gain.value = 0.32;
      musiqueGain.connect(master);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.7;
      sfxGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function bascule() {
    muet = !muet;
    if (master) master.gain.setTargetAtTime(muet ? 0 : 0.85, ac().currentTime, 0.05);
    return muet;
  }

  function env(noeud, t, a, d, s, r, pic = 0.2) {
    const g = noeud.gain || noeud;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(pic, t + a);
    g.linearRampToValueAtTime(pic * s, t + a + d);
    g.exponentialRampToValueAtTime(0.0001, t + a + d + r);
  }

  function osc(type, freq, t, dur, pic, dest, fQ) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (fQ) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(fQ, t);
      o.connect(f); f.connect(g);
    } else o.connect(g);
    g.connect(dest || sfxGain);
    env(g, t, 0.01, 0.05, 0.5, Math.max(0.05, dur - 0.06), pic);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  function bruit(t, dur, pic, freq, dest) {
    const n = ctx.createBufferSource();
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = 1.2;
    const g = ctx.createGain();
    n.connect(f); f.connect(g); g.connect(dest || sfxGain);
    env(g, t, 0.005, 0.02, 0.4, dur, pic);
    n.start(t); n.stop(t + dur + 0.05);
  }

  function bip(sorte) {
    const t = ac().currentTime + 0.01;
    switch (sorte) {
      case 'clic': osc('sine', 620, t, 0.06, 0.08); break;
      case 'jouer':
        osc('triangle', 220, t, 0.18, 0.16);
        osc('sine', 440, t + 0.04, 0.14, 0.1);
        bruit(t, 0.08, 0.06, 1800);
        break;
      case 'degat':
        bruit(t, 0.16, 0.28, 400);
        osc('sawtooth', 140, t, 0.18, 0.2, sfxGain, 600);
        osc('square', 90, t, 0.12, 0.12, sfxGain, 300);
        break;
      case 'bloc':
        osc('triangle', 280, t, 0.12, 0.14);
        osc('sine', 420, t + 0.03, 0.1, 0.08);
        break;
      case 'soin':
        osc('sine', 392, t, 0.2, 0.1);
        osc('sine', 523, t + 0.08, 0.25, 0.1);
        osc('sine', 659, t + 0.16, 0.3, 0.08);
        break;
      case 'chaleur':
        osc('triangle', 196, t, 0.22, 0.12);
        osc('sine', 392, t + 0.05, 0.2, 0.08);
        bruit(t, 0.14, 0.07, 900);
        break;
      case 'mort':
        osc('sawtooth', 110, t, 0.4, 0.18, sfxGain, 400);
        osc('sine', 55, t, 0.5, 0.16);
        break;
      case 'victoire':
        [392, 494, 587, 784].forEach((f, i) => osc('triangle', f, t + i * 0.12, 0.35, 0.12));
        break;
      case 'defaite':
        osc('sine', 196, t, 0.5, 0.14);
        osc('sine', 147, t + 0.2, 0.7, 0.16);
        osc('sine', 98, t + 0.4, 1.0, 0.16);
        break;
      case 'pioche':
        osc('sine', 880, t, 0.05, 0.04);
        bruit(t, 0.05, 0.04, 2400);
        break;
      case 'erreur':
        osc('square', 160, t, 0.1, 0.08, sfxGain, 500);
        break;
      case 'fin-tour':
        osc('triangle', 180, t, 0.15, 0.1);
        osc('sine', 120, t + 0.08, 0.2, 0.08);
        break;
      default: osc('sine', 500, t, 0.08, 0.08);
    }
  }

  // Gamme de ré mineur (dorien légèrement allumé) : ré, fa, sol, la, do, ré
  const GAMME = [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00];
  const BASSE = [73.42, 87.31, 98.00, 110.00];

  function kick(t, pic = 0.28) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(pic, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(musiqueGain);
    o.start(t); o.stop(t + 0.3);
  }
  function hat(t, pic = 0.05) { bruit(t, 0.04, pic, 7000, musiqueGain); }
  function snare(t, pic = 0.12) {
    bruit(t, 0.1, pic, 1800, musiqueGain);
    osc('triangle', 180, t, 0.08, pic * 0.5, musiqueGain);
  }

  function pad(t, freq, dur, pic) {
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    o2.frequency.setValueAtTime(freq * 1.005, t);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(1400, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(700, t + dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(musiqueGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(pic, t + 0.2);
    g.gain.linearRampToValueAtTime(pic * 0.7, t + dur - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  function note(t, freq, dur, pic, type = 'triangle') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    f.type = 'lowpass'; f.frequency.setValueAtTime(2200, t);
    o.connect(f); f.connect(g); g.connect(musiqueGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(pic, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function mesurer(scene, t0, barSec) {
    const combat = scene === 'combat';
    const repos = scene === 'repos' || scene === 'titre';
    const vic = scene === 'victoire';
    // 4 temps par mesure
    if (!repos) {
      kick(t0, combat ? 0.3 : 0.18);
      if (combat) kick(t0 + barSec * 0.5, 0.22);
      else kick(t0 + barSec * 0.5, 0.14);
      if (combat) {
        snare(t0 + barSec * 0.25, 0.1);
        snare(t0 + barSec * 0.75, 0.12);
      }
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) hat(t0 + (barSec / 8) * i, combat ? 0.045 : 0.03);
        else if (combat) hat(t0 + (barSec / 8) * i, 0.025);
      }
    }
    // Basse : ostinato
    const degBasse = scene === 'boutique' ? [0, 2, 0, 3] : (combat ? [0, 0, 3, 2] : [0, 2, 0, 1]);
    for (let i = 0; i < 4; i++) {
      const f = BASSE[degBasse[i] % BASSE.length];
      note(t0 + (barSec / 4) * i, f, barSec / 4 * 0.9, combat ? 0.16 : 0.1, 'sine');
      if (combat) note(t0 + (barSec / 4) * i, f * 2, barSec / 6, 0.05, 'triangle');
    }
    // Pad
    const acc = vic ? 0.08 : (repos ? 0.06 : 0.05);
    pad(t0, GAMME[0], barSec, acc);
    pad(t0, GAMME[3], barSec, acc * 0.7);
    if (combat || vic) pad(t0, GAMME[5], barSec, acc * 0.5);
    // Mélodie clairsemée, un peu "braise" : notes graves puis un éclat
    const motif = combat
      ? [5, -1, 3, 4, 6, -1, 5, 3]
      : repos
        ? [2, -1, 0, 3, -1, 4, -1, 2]
        : [3, -1, 2, 5, -1, 4, 0, -1];
    const pas = barSec / 8;
    for (let i = 0; i < 8; i++) {
      const d = motif[i];
      if (d < 0) continue;
      note(t0 + pas * i, GAMME[d], pas * (combat ? 0.8 : 1.3), combat ? 0.09 : 0.07, 'triangle');
    }
    // Étincelles aiguës
    if (combat || scene === 'carte' || vic) {
      note(t0 + barSec * 0.125, GAMME[7] * 2, 0.08, 0.035, 'sine');
      note(t0 + barSec * 0.62, GAMME[6] * 2, 0.1, 0.03, 'sine');
    }
  }

  function boucle() {
    if (!ctx || piste === 'silence') return;
    const bpm = BPM[piste] || 84;
    const barSec = (60 / bpm) * 4;
    const maintenant = ctx.currentTime;
    while (prochaine < maintenant + 1.4) {
      mesurer(piste, Math.max(prochaine, maintenant + 0.05), barSec);
      prochaine += barSec;
    }
    planif = setTimeout(boucle, 200);
  }

  function musique(scene) {
    ac();
    if (scene === piste) return;
    piste = scene || 'silence';
    if (planif) { clearTimeout(planif); planif = null; }
    prochaine = ctx.currentTime + 0.05;
    if (piste !== 'silence') boucle();
  }

  function couper() {
    piste = 'silence';
    if (planif) { clearTimeout(planif); planif = null; }
  }

  // Rendu hors ligne pour exporter un morceau (WAV via la page).
  async function rendreMorceau(scene, options = {}) {
    const secondes = options.secondes || 60;
    const sr = 44100;
    const offline = new OfflineAudioContext(2, Math.ceil(sr * secondes), sr);
    const old = { ctx, musiqueGain, sfxGain };
    ctx = offline;
    musiqueGain = offline.createGain();
    musiqueGain.gain.value = 0.36;
    musiqueGain.connect(offline.destination);
    sfxGain = offline.createGain();
    sfxGain.gain.value = 0;
    sfxGain.connect(offline.destination);
    const bpm = BPM[scene] || 84;
    const barSec = (60 / bpm) * 4;
    let t = 0.15;
    while (t < secondes - barSec) {
      mesurer(scene, t, barSec);
      t += barSec;
    }
    const rendu = await offline.startRendering();
    ctx = old.ctx; musiqueGain = old.musiqueGain; sfxGain = old.sfxGain;
    const gauche = rendu.getChannelData(0);
    const droite = rendu.numberOfChannels > 1 ? rendu.getChannelData(1) : gauche;
    let som = 0, crete = 0;
    for (let i = 0; i < gauche.length; i++) {
      const a = Math.abs(gauche[i]), b = Math.abs(droite[i]);
      if (a > crete) crete = a;
      if (b > crete) crete = b;
      som += gauche[i] * gauche[i];
    }
    return { gauche, droite, frequence: sr, crete, rms: Math.sqrt(som / gauche.length) };
  }

  return { init: ac, bip, musique, couper, bascule, rendreMorceau, estMuet: () => muet };
})();
