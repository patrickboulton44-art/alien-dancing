'use strict';
/* Good Morning Teng — everything is a pure function of scene time t (seconds),
   so replay is just resetting the clock. */

const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

// ---------- maths ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const smooth = t => t * t * (3 - 2 * t);
function bounce(t) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
  return n * (t -= 2.625 / d) * t + .984375;
}
const snap = x => Math.sign(x) * Math.pow(Math.abs(x), 0.5);
const pos = x => Math.max(0, x);
function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; }
const mix3 = (a, b, c, p) => p < .5 ? mix(a, b, p * 2) : mix(b, c, (p - .5) * 2);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- timeline ----------
const BPM = 128, BEAT = 60 / BPM;
const TL = {
  walkEnd: 6.2, sun: [1.2, 9.0], zoomIn: [6.8, 8.9], happy: 8.7, title: 9.6,
  zoomOut: [11.8, 14.2], crowd: [12.0, 14.4], dance: 14.8,
};
const MAIN = { x: 800, y: 760, s: 1 };

// ---------- scenery ----------
const R = rng(7);
(function buildScene() {
  const stars = $('stars');
  for (let i = 0; i < 170; i++) {
    const c = el('circle', { cx: lerp(-2600, 4200, R()), cy: lerp(-1400, 600, R()), r: (R() * 2.2 + .6).toFixed(1), fill: '#fff' }, stars);
    c._ph = R() * 6.28; c._sp = 1 + R() * 3;
  }
  const rays = $('rays');
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * 360;
    el('path', { d: 'M-16 -130 L0 -215 L16 -130 Z', fill: '#ffd84a', opacity: .85, transform: `rotate(${a})` }, rays);
  }
  const hill = (amp, base, f, ph) => {
    let d = `M-5000 ${base + 400}`;
    for (let x = -5000; x <= 7000; x += 40) d += ` L${x} ${(base - amp * (.6 + .4 * Math.sin(x * f + ph)) * (.7 + .3 * Math.sin(x * f * 2.7 + ph * 2))).toFixed(1)}`;
    return d + ` L7000 ${base + 400} Z`;
  };
  $('hillsFar').setAttribute('d', hill(120, 650, .0042, 1.3));
  $('hillsNear').setAttribute('d', hill(55, 655, .0071, 4.1));
  const rocks = $('rocks');
  for (let i = 0; i < 70; i++) {
    const y = lerp(660, 1500, Math.pow(R(), 1.6)), k = (y - 600) / 400;
    el('ellipse', { cx: lerp(-2000, 3600, R()), cy: y, rx: (14 + R() * 30) * k, ry: (5 + R() * 8) * k, fill: '#000', opacity: .13 }, rocks);
  }
})();

// ---------- alien rig ----------
function makeAlien(color, seed = 0) {
  const OUT = mix(color, '#0a0a1a', .62), belly = mix(color, '#ffffff', .4);
  const root = el('g'), body = el('g', null, root);
  const tube = (p, len, w) => {
    el('line', { x1: 0, y1: 0, x2: 0, y2: len, stroke: OUT, 'stroke-width': w + 7, 'stroke-linecap': 'round' }, p);
    el('line', { x1: 0, y1: 0, x2: 0, y2: len, stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }, p);
  };
  const joint = (p, x, y) => el('g', null, el('g', { transform: `translate(${x},${y})` }, p));
  const legs = {}, arms = {}, ants = {};
  for (const s of [-1, 1]) {
    const th = joint(body, s * 17, -74); tube(th, 36, 15);
    const sh = joint(th, 0, 36); tube(sh, 34, 15);
    el('ellipse', { cx: s * 7, cy: 37, rx: 15, ry: 8, fill: color, stroke: OUT, 'stroke-width': 3.5 }, sh);
    legs[s] = { th, sh };
  }
  el('ellipse', { cx: 0, cy: -104, rx: 36, ry: 44, fill: color, stroke: OUT, 'stroke-width': 4 }, body);
  el('ellipse', { cx: 0, cy: -96, rx: 21, ry: 27, fill: belly, opacity: .75 }, body);
  for (const s of [-1, 1]) {
    const ua = joint(body, s * 30, -128); tube(ua, 30, 12);
    const fa = joint(ua, 0, 30); tube(fa, 28, 12);
    el('circle', { cx: 0, cy: 32, r: 10, fill: color, stroke: OUT, 'stroke-width': 3.5 }, fa);
    arms[s] = { ua, fa };
  }
  const head = joint(body, 0, -140);
  for (const s of [-1, 1]) {
    const a = joint(head, s * 20, -98), d = `M0 0 Q ${s * 6} -24 ${s * 16} -44`;
    el('path', { d, stroke: OUT, 'stroke-width': 10, fill: 'none', 'stroke-linecap': 'round' }, a);
    el('path', { d, stroke: color, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, a);
    el('circle', { cx: s * 16, cy: -49, r: 9, fill: '#ffe066', stroke: OUT, 'stroke-width': 3 }, a);
    ants[s] = a;
  }
  el('ellipse', { cx: 0, cy: -54, rx: 64, ry: 54, fill: color, stroke: OUT, 'stroke-width': 4 }, head);
  el('ellipse', { cx: -22, cy: -88, rx: 18, ry: 9, fill: '#fff', opacity: .25, transform: 'rotate(-18 -22 -88)' }, head);
  const blush = el('g', { opacity: 0 }, head);
  for (const s of [-1, 1]) el('ellipse', { cx: s * 44, cy: -34, rx: 12, ry: 7, fill: '#ff5f9e', opacity: .8 }, blush);
  const eyesN = el('g', null, head), look = el('g', null, eyesN);
  for (const s of [-1, 1]) {
    el('ellipse', { cx: s * 24, cy: -60, rx: 16, ry: 21, fill: '#111' }, look);
    el('circle', { cx: s * 24 - 5, cy: -68, r: 6, fill: '#fff' }, look);
    el('circle', { cx: s * 24 + 5, cy: -53, r: 2.5, fill: '#fff' }, look);
  }
  const eyesH = el('g', { opacity: 0 }, head);
  for (const s of [-1, 1]) el('path', { d: `M${s * 24 - 15} -55 Q${s * 24} -82 ${s * 24 + 15} -55`, stroke: '#111', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }, eyesH);
  const mouthN = el('path', { d: 'M-10 -26 Q0 -21 10 -26', stroke: '#111', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, head);
  const mouthH = el('g', { opacity: 0 }, head);
  el('path', { d: 'M-24 -34 Q0 6 24 -34 Z', fill: '#5a1030', stroke: '#111', 'stroke-width': 4, 'stroke-linejoin': 'round' }, mouthH);
  el('path', { d: 'M-11 -18 Q0 -28 11 -18 Q0 -10 -11 -18 Z', fill: '#ff6f91' }, mouthH);
  return { root, body, head, legs, arms, ants, eyesN, look, eyesH, mouthN, mouthH, blush, face: -1, vis: true, seed };
}

function setFace(A, h) {
  if (A.face === h) return;
  A.face = h;
  A.eyesN.setAttribute('opacity', 1 - h); A.mouthN.setAttribute('opacity', 1 - h);
  A.eyesH.setAttribute('opacity', h); A.mouthH.setAttribute('opacity', h); A.blush.setAttribute('opacity', h);
}
function setVis(A, v) { if (A.vis !== v) { A.vis = v; A.root.style.display = v ? '' : 'none'; } }

const N = { dx: 0, dy: 0, rot: 0, head: 0, look: 0, ant: 0, sx: 1, sy: 1, blink: 1,
  lUA: 14, lFA: -8, rUA: -14, rFA: 8, lTh: 5, lSh: -2, rTh: -5, rSh: 2 };
const KEYS = Object.keys(N);
const P = o => Object.assign({}, N, o);
function blend(a, b, w) { const o = {}; for (const k of KEYS) o[k] = lerp(a[k], b[k], w); return o; }

const rot = (g, a) => g.setAttribute('transform', `rotate(${a.toFixed(1)})`);
function applyPose(A, p, x, y, s) {
  A.root.setAttribute('transform', `translate(${(x + p.dx * s).toFixed(1)},${(y + p.dy * s).toFixed(1)}) scale(${(s * p.sx).toFixed(3)},${(s * p.sy).toFixed(3)})`);
  A.body.setAttribute('transform', `rotate(${p.rot.toFixed(1)} 0 -74)`);
  rot(A.head, p.head);
  rot(A.arms[-1].ua, p.lUA); rot(A.arms[-1].fa, p.lFA);
  rot(A.arms[1].ua, p.rUA); rot(A.arms[1].fa, p.rFA);
  rot(A.legs[-1].th, p.lTh); rot(A.legs[-1].sh, p.lSh);
  rot(A.legs[1].th, p.rTh); rot(A.legs[1].sh, p.rSh);
  rot(A.ants[-1], p.ant); rot(A.ants[1], -p.ant * .8);
  A.look.setAttribute('transform', `translate(${p.look.toFixed(1)},${(-60 * (1 - p.blink)).toFixed(1)}) scale(1,${p.blink.toFixed(2)})`);
}

// ---------- poses ----------
function walk(t) {
  const ph = t * Math.PI * 3.2, s = Math.sin(ph), b = Math.abs(Math.sin(ph));
  return P({ dy: -9 * b, rot: 4 * s, head: -3 * s, sy: 1 - .03 * (1 - b), ant: 14 * Math.sin(ph + 1),
    lUA: 16 + 22 * s, rUA: -16 + 22 * s, lFA: -14, rFA: 14,
    lTh: 4 + 16 * s, rTh: -4 + 16 * s, lSh: -8 * pos(s), rSh: 8 * pos(-s), look: 3 });
}
function lookUp(t) {
  return P({ head: 9, look: 7, rot: 2, ant: 4 * Math.sin(t * 3), lUA: 10, rUA: -10 });
}
function cheer(th, ph = 0, amt = 1) {
  const hop = th < .7 ? Math.sin(Math.PI * th / .7) : 0;
  const w = Math.sin(th * 11 + ph), bb = Math.abs(Math.sin(th * Math.PI / BEAT / 2 + ph));
  const land = th > .7 && th < .95 ? Math.sin(Math.PI * (th - .7) / .25) : 0;
  return P({ dy: (-75 * hop - 8 * bb) * amt, sy: 1 - .1 * land, sx: 1 + .08 * land,
    lUA: 150 + 12 * w, lFA: -18 + 16 * w, rUA: -150 + 12 * w, rFA: 18 + 16 * w,
    head: 6 * Math.sin(th * 5 + ph), ant: 26 * Math.sin(th * 14 + ph) * Math.exp(-th * .8) + 8 * Math.sin(th * 6 + ph),
    lTh: 8 + 6 * hop, rTh: -8 - 6 * hop });
}

// Subject 3 (科目三) inspired moves. b = beat (float).
function legTwist(c) {
  return { lTh: 6 - 18 * pos(c) + 6 * pos(-c), lSh: 26 * pos(c),
           rTh: -6 + 18 * pos(-c) - 6 * pos(c), rSh: -26 * pos(-c) };
}
function moveSwing(b) {          // arms swing across chest, hips go the other way, knees twist
  const c = snap(Math.cos(Math.PI * b)), d = Math.abs(Math.cos(Math.PI * b));
  return P(Object.assign({ dx: 14 * c, dy: 10 * d - 5, rot: -6 * c, head: 8 * c, look: 5 * c, ant: 14 * c,
    lUA: 28 - 30 * c, lFA: -112, rUA: -28 - 30 * c, rFA: 112 }, legTwist(c)));
}
function moveWings(b) {          // arms out wide, wrists flap, alternating kick-twist
  const c = snap(Math.cos(Math.PI * b)), f = Math.sin(2 * Math.PI * b), d = Math.abs(Math.cos(Math.PI * b));
  return P({ dy: 11 * d - 6, rot: 5 * c, head: -6 * c, look: -4 * c, ant: 16 * f,
    lUA: 94 + 6 * f, lFA: 28 * f, rUA: -94 - 6 * f, rFA: -28 * f,
    lTh: 6 + 26 * pos(c), lSh: -30 * pos(c), rTh: -6 - 26 * pos(-c), rSh: 30 * pos(-c) });
}
function movePaws(b) {           // paws at the chin, head tilts, double-time knee wobble
  const c = snap(Math.cos(Math.PI * b)), k = snap(Math.cos(2 * Math.PI * b));
  return P({ dx: 7 * c, dy: 6 * Math.abs(k) - 3, rot: 7 * c, head: 13 * c, look: 5 * c, ant: 18 * k,
    lUA: 30, lFA: -150 + 10 * k, rUA: -30, rFA: 150 + 10 * k,
    lTh: 8 - 15 * k, lSh: 18 * k, rTh: -8 + 15 * k, rSh: -18 * k });
}
function moveWave(b) {           // shuffle sideways, one hand on hip, other waving overhead
  const c = snap(Math.cos(Math.PI * b)), f = Math.sin(2 * Math.PI * b), d = Math.abs(Math.cos(Math.PI * b));
  const left = Math.floor(b / 4) % 2 === 0;
  const arms = left
    ? { lUA: 102, lFA: 72 + 28 * f, rUA: -42, rFA: 98 }
    : { rUA: -102, rFA: -72 + 28 * f, lUA: 42, lFA: -98 };
  return P(Object.assign({ dx: 50 * Math.sin(Math.PI * b / 4), dy: 9 * d - 4, rot: -4 * c, head: (left ? -8 : 8), ant: 15 * f }, arms, legTwist(c)));
}
const ROUTINE = [moveSwing, moveWings, moveSwing, movePaws, moveWave];
function dance(b) {
  const ph = Math.floor(b / 8), local = b - ph * 8;
  const cur = ROUTINE[ph % ROUTINE.length](b);
  if (ph > 0 && local < .5) return blend(ROUTINE[(ph - 1) % ROUTINE.length](b), cur, smooth(local / .5));
  return cur;
}

// ---------- cast ----------
const actors = $('actors');
const main = makeAlien('#7ee36b');
main.isMain = true;

const PALETTE = ['#7ee36b', '#5fe0c3', '#b48cff', '#ff8fd1', '#ffd45e', '#6ec9ff', '#a3f05a', '#ff9f6b'];
const crowd = [];
const ROWS = [[675, .5, 82, 0], [705, .62, 100, 0], [760, .86, 140, 140], [880, 1.02, 168, 120], [1010, 1.2, 200, 170]];
const CR = rng(42);
ROWS.forEach(([y, s, gap, hole], ri) => {
  for (let x = -420 + (ri % 2) * gap / 2; x < 2020; x += gap) {
    const jx = x + (CR() - .5) * gap * .3;
    if (Math.abs(jx - MAIN.x) < hole) continue;
    const a = makeAlien(PALETTE[Math.floor(CR() * PALETTE.length)], CR());
    a.x = jx; a.y = y + (CR() - .5) * 14; a.s = s * (.92 + CR() * .16);
    a.drop = lerp(TL.crowd[0], TL.crowd[1], Math.pow(CR(), .8));
    a.ph = CR() * 6.28;
    setFace(a, 1);
    crowd.push(a);
  }
});
[...crowd, Object.assign(main, MAIN)].sort((a, b) => a.y - b.y).forEach(a => actors.appendChild(a.root));

// ---------- sparkles ----------
const fx = $('fx');
const sparks = [];
for (let i = 0; i < 18; i++) {
  const g = el('path', { d: 'M0 -14 L3.5 -3.5 L14 0 L3.5 3.5 L0 14 L-3.5 3.5 L-14 0 L-3.5 -3.5 Z', fill: i % 3 ? '#ffe066' : '#ff8fd1', opacity: 0 }, fx);
  sparks.push({ g, a: i / 18 * Math.PI * 2 + R() * .3, v: 120 + R() * 110, d: R() * .25, s: .7 + R() * .8 });
}

// ---------- title ----------
const title = $('title');
title.innerHTML = ['GOOD MORNING', 'TENG'].map((line, li) =>
  `<span class="line line${li + 1}">` + [...line].map(ch => ch === ' ' ? '<span class="sp"></span>' : `<span class="l">${ch}</span>`).join('') + '</span>').join('');
[...title.querySelectorAll('.l')].forEach((s, i) => s.style.setProperty('--i', i));
title.style.setProperty('--beat', BEAT + 's');
title.setAttribute('aria-label', 'Good morning Teng');

// ---------- camera ----------
const svg = $('stage');
function camFor(cx, cy, w, h) {
  const a = innerWidth / innerHeight;
  w *= clamp(a / 1.78, .5, 1);               // narrower screens: crop the sides rather than shrink
  const vw = Math.max(w, h * a), vh = vw / a;
  if (vh > h) cy = Math.min(cy, cy + h / 2 + 120 - vh / 2);  // tall screens: keep the floor in, extra room goes to sky
  return [cx - vw / 2, cy - vh / 2, vw, vh];
}
const CAM_BASE = [800, 480, 1500, 860], CAM_IN = [800, 600, 470, 300], CAM_OUT = [800, 700, 2200, 1040];
function camAt(t) {
  let A = CAM_BASE, B = CAM_IN, e = 0;
  if (t < TL.zoomIn[1]) e = easeInOut(inv(TL.zoomIn[0], TL.zoomIn[1], t));
  else { A = CAM_IN; B = CAM_OUT; e = easeInOut(inv(TL.zoomOut[0], TL.zoomOut[1], t)); }
  const w = Math.exp(lerp(Math.log(A[2]), Math.log(B[2]), e)), h = Math.exp(lerp(Math.log(A[3]), Math.log(B[3]), e));
  let cx = lerp(A[0], B[0], e), cy = lerp(A[1], B[1], e);
  if (t >= TL.dance) cy += 6 * Math.sin((t - TL.dance) * Math.PI / BEAT);   // gentle groove sway
  return camFor(cx, cy, w, h);
}

// ---------- frame ----------
const stopEls = [$('sk0'), $('sk1'), $('sk2')];
const SKY = [['#070b24', '#3a4aa8', '#56b4ff'], ['#1a1744', '#c46a8f', '#9fd8ff'], ['#3b2559', '#ffb36b', '#fff0bf']];
const starEls = [...$('stars').children];
let lastSkyP = -1;

function render(t) {
  // sky + sun
  const p = easeInOut(inv(TL.sun[0], TL.sun[1], t));
  if (Math.abs(p - lastSkyP) > .002) {
    lastSkyP = p;
    stopEls.forEach((s, i) => s.setAttribute('stop-color', mix3(...SKY[i], p)));
    $('ground').setAttribute('fill', mix3('#1c3326', '#3e7a4f', '#5cc46b', p));
    $('hillsFar').setAttribute('fill', mix3('#15233a', '#5a5a8a', '#4aa8a0', p));
    $('hillsNear').setAttribute('fill', mix3('#182c2c', '#4b7a5a', '#46b36a', p));
    $('tint').setAttribute('opacity', (.5 * Math.pow(1 - p, 1.6)).toFixed(3));
    $('moon').setAttribute('opacity', (1 - smooth(p)).toFixed(3));
    $('moon').setAttribute('transform', `translate(0,${(p * 160).toFixed(1)})`);
  }
  $('sun').setAttribute('transform', `translate(1180,${lerp(860, 250, p).toFixed(1)})`);
  $('rays').setAttribute('transform', `rotate(${(t * 12).toFixed(1)}) scale(${(1 + .06 * Math.sin(t * 3)).toFixed(3)})`);
  $('sunFace').setAttribute('opacity', smooth(inv(TL.happy - .4, TL.happy + .4, t)).toFixed(2));
  const so = 1 - smooth(p);
  for (const s of starEls) s.setAttribute('opacity', (so * (.55 + .45 * Math.sin(t * s._sp + s._ph))).toFixed(2));

  // camera
  svg.setAttribute('viewBox', camAt(t).map(v => v.toFixed(1)).join(' '));

  // main alien
  let pose, x = MAIN.x;
  if (t < TL.walkEnd) {
    const u = t / TL.walkEnd;
    x = lerp(-260, MAIN.x, 1 - Math.pow(1 - u, 1.6));
    pose = walk(t);
    if (t > TL.walkEnd - .6) pose = blend(pose, lookUp(t), smooth(inv(TL.walkEnd - .6, TL.walkEnd, t)));
  } else if (t < TL.happy) {
    pose = lookUp(t);
  } else if (t < TL.dance) {
    pose = blend(lookUp(t), cheer(t - TL.happy), smooth(inv(TL.happy, TL.happy + .15, t)));
  } else {
    const b = (t - TL.dance) / BEAT;
    pose = blend(cheer(t - TL.happy), dance(b), smooth(clamp(b / .5)));
  }
  const blinkT = (t % 2.9);
  pose.blink = t < TL.happy && blinkT < .14 ? Math.abs(blinkT - .07) / .07 * .9 + .1 : 1;
  setFace(main, t >= TL.happy ? 1 : 0);
  applyPose(main, pose, x, MAIN.y, MAIN.s);

  // crowd
  for (const a of crowd) {
    if (t < a.drop) { setVis(a, false); continue; }
    setVis(a, true);
    const u = (t - a.drop) / .75;
    let cp, dy = 0;
    if (u < 1) {
      dy = -(1 - bounce(clamp(u))) * 950;
      cp = P({ lUA: 120, rUA: -120, lFA: -20, rFA: 20, ant: 30 * Math.sin(u * 20) });
    } else if (t < TL.dance) {
      cp = cheer(t - a.drop - .75 + 1, a.ph, .6);
    } else {
      const b = (t - TL.dance) / BEAT;
      cp = blend(cheer(t - a.drop + .25, a.ph, .6), dance(b), smooth(clamp(b / .5)));
    }
    applyPose(a, cp, a.x, a.y + dy, a.s);
  }

  // sparkles around main alien's head
  const hx = x + pose.dx, hy = MAIN.y + pose.dy - 200;
  for (const s of sparks) {
    const k = (t - TL.happy - s.d) / 1.6;
    if (k < 0 || k > 1) { s.g.setAttribute('opacity', 0); continue; }
    const r = 40 + s.v * easeOut(k);
    s.g.setAttribute('opacity', (1 - k).toFixed(2));
    s.g.setAttribute('transform', `translate(${(hx + Math.cos(s.a) * r).toFixed(1)},${(hy + Math.sin(s.a) * r * .8).toFixed(1)}) rotate(${(k * 180).toFixed(0)}) scale(${(s.s * Math.sin(Math.PI * k) + .2).toFixed(2)})`);
  }

  // title
  title.classList.toggle('show', t >= TL.title);
  title.classList.toggle('dance', t >= TL.dance);
}

// ---------- clock & controls ----------
let startPerf = null;
function loop() {
  const t = window.freezeAt !== undefined ? window.freezeAt
    : startPerf === null ? 0 : (performance.now() - startPerf) / 1000;
  render(Math.max(0, t));
  requestAnimationFrame(loop);
}

const DROPS = crowd.filter((_, i) => i % 6 === 0).map((a, i) => ({ time: a.drop + .2, freq: 500 + (i % 5) * 90 }));
function begin() {
  title.classList.remove('show', 'dance');
  void title.offsetWidth;                    // restart CSS animations on replay
  let lead = 0;
  if (Music.init()) lead = Music.start(TL, BEAT, DROPS) || 0;
  startPerf = performance.now() + lead * 1000;
}

$('start').addEventListener('click', () => {
  $('intro').classList.add('gone');
  $('controls').hidden = false;
  begin();
});
$('replay').addEventListener('click', begin);
$('mute').addEventListener('click', e => {
  const m = Music.toggleMute();
  e.currentTarget.textContent = m ? '🔇' : '🔊';
  e.currentTarget.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
});

// Debug/preview helper: ?t=12 jumps straight to a moment (no sound).
const qs = new URLSearchParams(location.search), jump = parseFloat(qs.get('t'));
if (!isNaN(jump)) {
  $('intro').classList.add('gone');
  $('controls').hidden = false;
  startPerf = performance.now() - jump * 1000;
  if (qs.has('freeze')) window.freezeAt = jump;  // ?t=..&freeze holds a single frame
}
requestAnimationFrame(loop);
