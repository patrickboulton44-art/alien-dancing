'use strict';
/* Original synthesised soundtrack — Web Audio only, no audio files.
   Scene times (seconds) come from TIMELINE in main.js. */

const Music = (() => {
  let ctx = null, master = null, noiseBuf = null, run = null, muted = false;

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) return true;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    try {
      ctx = new C();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { ctx = null; return false; }
  }

  // ---------- voices ----------
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f, t, stop) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    o.start(t); o.stop(stop); return o;
  }
  function noise(t, stop) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    s.start(t); s.stop(stop); return s;
  }
  function filt(type, f, q = 0.7) {
    const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b;
  }

  function kick(out, t) {
    const o = osc('sine', 160, t, t + 0.45);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain(); env(g, t, 0.002, 1.0, 0.34);
    o.connect(g); g.connect(out);
  }
  function clap(out, t) {
    const n = noise(t, t + 0.25), f = filt('bandpass', 1700, 0.9), g = ctx.createGain();
    env(g, t, 0.001, 0.55, 0.17);
    n.connect(f); f.connect(g); g.connect(out);
    const o = osc('triangle', 210, t, t + 0.1), g2 = ctx.createGain();
    env(g2, t, 0.001, 0.25, 0.07); o.connect(g2); g2.connect(out);
  }
  function hat(out, t, amp) {
    const n = noise(t, t + 0.08), f = filt('highpass', 7500), g = ctx.createGain();
    env(g, t, 0.001, amp, 0.045);
    n.connect(f); f.connect(g); g.connect(out);
  }
  function bass(out, t, f, dur) {
    const o = osc('sawtooth', f, t, t + dur + 0.05), lp = filt('lowpass', 900, 4), g = ctx.createGain();
    lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(260, t + dur);
    env(g, t, 0.005, 0.32, dur);
    o.connect(lp); lp.connect(g); g.connect(out);
  }
  function lead(out, t, f, dur) {
    const g = ctx.createGain(), lp = filt('lowpass', 3200);
    env(g, t, 0.006, 0.085, dur);
    for (const det of [-7, 7]) {
      const o = osc('square', f, t, t + dur + 0.05); o.detune.value = det; o.connect(lp);
    }
    lp.connect(g); g.connect(out);
  }
  function stab(out, t, notes) {
    const g = ctx.createGain(), lp = filt('lowpass', 2400);
    env(g, t, 0.004, 0.07, 0.12);
    for (const m of notes) osc('triangle', midi(m), t, t + 0.2).connect(lp);
    lp.connect(g); g.connect(out);
  }
  function pad(out, t, notes, dur) {
    const g = ctx.createGain(), lp = filt('lowpass', 1300);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 1.4);
    g.gain.setValueAtTime(0.06, t + dur - 0.8);
    g.gain.linearRampToValueAtTime(0, t + dur);
    for (const m of notes) for (const det of [-6, 6]) {
      const o = osc('triangle', midi(m), t, t + dur + 0.1); o.detune.value = det; o.connect(lp);
    }
    lp.connect(g); g.connect(out);
  }
  function bell(out, t, f, amp = 0.12, d = 1.1) {
    const g = ctx.createGain(); env(g, t, 0.002, amp, d);
    osc('sine', f, t, t + d + 0.1).connect(g);
    const g2 = ctx.createGain(); env(g2, t, 0.002, amp * 0.35, d * 0.5);
    osc('sine', f * 3.01, t, t + d).connect(g2);
    g.connect(out); g2.connect(out);
  }
  function bloop(out, t, f) {
    const o = osc('sine', f, t, t + 0.2), g = ctx.createGain();
    o.frequency.exponentialRampToValueAtTime(f * 0.35, t + 0.16);
    env(g, t, 0.003, 0.18, 0.15); o.connect(g); g.connect(out);
  }
  function riser(out, t, dur) {
    const n = noise(t, t + dur), f = filt('bandpass', 300, 2.5), g = ctx.createGain();
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + dur - 0.02);
    g.gain.linearRampToValueAtTime(0, t + dur);
    n.connect(f); f.connect(g); g.connect(out);
  }
  function crash(out, t) {
    const n = noise(t, t + 1.6), f = filt('highpass', 4000), g = ctx.createGain();
    env(g, t, 0.002, 0.35, 1.4); n.connect(f); f.connect(g); g.connect(out);
  }

  // ---------- song ----------
  // I–V–vi–IV in C, four on the floor.
  const ROOTS = [36, 43, 45, 41];
  const TRIADS = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]];
  // 2-bar original hook, [16th step, midi, length in steps]
  const HOOK = new Map([
    [0, [76, 2]], [2, [79, 2]], [4, [81, 2]], [6, [79, 1]], [7, [76, 1]], [10, [74, 2]], [12, [72, 2]], [14, [74, 2]],
    [16, [76, 2]], [18, [79, 2]], [20, [84, 3]], [24, [81, 2]], [26, [79, 2]], [28, [76, 2]], [30, [74, 2]],
  ]);

  function playStep(out, i, t, step) {
    const s = i % 16, bar = Math.floor(i / 16), ch = bar % 4;
    if (s % 4 === 0) kick(out, t);
    if (s === 4 || s === 12) clap(out, t);
    hat(out, t, s % 4 === 2 ? 0.22 : 0.07);
    if (s % 2 === 0) bass(out, t, midi(ROOTS[ch] + (s % 4 === 2 ? 12 : 0)), step * 1.7);
    if (s === 6 || s === 14) stab(out, t, TRIADS[ch]);
    if (bar >= 2) {
      const h = HOOK.get(i % 32);
      if (h) lead(out, t, midi(h[0]), h[1] * step * 0.9);
    }
  }

  function scheduleIntro(out, t0, TL) {
    const at = s => t0 + s;
    pad(out, at(0), [57, 60, 64, 67], 5.2);
    pad(out, at(4.6), [53, 57, 60, 64], 4.4);
    pad(out, at(TL.happy), [60, 64, 67, 72], TL.dance - TL.happy + 0.2);
    const tw = [76, 79, 81, 84, 88, 81, 79, 84, 76, 88, 81, 79, 84, 88, 79];
    for (let k = 0, s = 1.0; s < TL.happy - 0.3; k++, s += 0.5) bell(out, at(s), midi(tw[k % tw.length]), 0.05, 0.6);
    [72, 76, 79, 84, 88, 91].forEach((m, k) => bell(out, at(TL.happy + k * 0.07), midi(m), 0.14, 1.2));
    'GOODMORNINGTENG'.split('').forEach((_, k) => bell(out, at(TL.title + k * 0.06), midi(84 + (k % 5) * 2), 0.04, 0.3));
    riser(out, at(TL.dance - 2.6), 2.6);
    crash(out, at(TL.dance));
  }

  function start(TL, beat, drops) {
    if (!ctx) return null;
    if (ctx.state === 'suspended') ctx.resume();
    stop();
    const out = ctx.createGain(); out.connect(master);
    const t0 = ctx.currentTime + 0.08;
    scheduleIntro(out, t0, TL);
    for (const d of drops) bloop(out, t0 + d.time, d.freq);
    const step = beat / 4, startA = t0 + TL.dance;
    const r = { out, t0, next: 0 };
    r.timer = setInterval(() => {
      const ahead = ctx.currentTime + 0.2;
      while (startA + r.next * step < ahead) {
        const t = startA + r.next * step;
        if (t >= ctx.currentTime - 0.02) playStep(out, r.next, t, step);
        r.next++;
      }
    }, 25);
    run = r;
    return t0 - ctx.currentTime; // seconds until scene time 0
  }

  function stop() {
    if (!run) return;
    clearInterval(run.timer);
    const o = run.out;
    o.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    setTimeout(() => o.disconnect(), 400);
    run = null;
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.03);
    return muted;
  }

  return { init, start, stop, toggleMute };
})();
