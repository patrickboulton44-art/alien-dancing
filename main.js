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

// ---------- alien rig: armless, legless plush gumdrop ----------
const BLOB = 'M-82 -6 C-94 -86 -80 -164 -36 -192 C-14 -205 14 -205 36 -192 C80 -164 94 -86 82 -6 C66 7 -66 7 -82 -6 Z';
let gradN = 0;
function makeAlien(color, seed = 0) {
  const OUT = mix(color, '#0a1a05', .55), HI = mix(color, '#ffffff', .45), LO = mix(color, '#203a00', .25);
  const gid = 'bg' + (gradN++);
  const defs = document.querySelector('#stage defs');
  const grad = el('radialGradient', { id: gid, cx: '.38', cy: '.3', r: '.85' }, defs);
  el('stop', { offset: '0', 'stop-color': HI }, grad);
  el('stop', { offset: '.45', 'stop-color': color }, grad);
  el('stop', { offset: '1', 'stop-color': LO }, grad);

  const root = el('g');
  const shadow = el('ellipse', { cx: 0, cy: 2, rx: 70, ry: 12, fill: '#000', opacity: .18 }, root);
  const mover = el('g', null, root);
  const body = el('g', null, mover);                       // pivots at the blob's base
  const ants = {};
  // antennae: short yellow stalks with flat felt discs (behind the body)
  [[-1, -30, -184, 18, -14], [1, 32, -182, 14, 22]].forEach(([s, x, y, r, tilt]) => {
    const a = el('g', null, el('g', { transform: `translate(${x},${y})` }, body));
    el('path', { d: `M0 6 Q ${s * 2} -6 ${s * 6} -16`, stroke: '#c79a00', 'stroke-width': 13, fill: 'none', 'stroke-linecap': 'round' }, a);
    el('path', { d: `M0 6 Q ${s * 2} -6 ${s * 6} -16`, stroke: '#ffd31a', 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }, a);
    el('ellipse', { cx: s * 8, cy: -22 - r * .5, rx: r, ry: r * (s < 0 ? 1 : .62), fill: '#ffde2e', stroke: '#c79a00', 'stroke-width': 3, transform: `rotate(${tilt} ${s * 8} ${-22 - r * .5})` }, a);
    ants[s] = a;
  });
  el('path', { d: BLOB, fill: `url(#${gid})`, stroke: OUT, 'stroke-width': 4, 'stroke-linejoin': 'round' }, body);
  // soft plush sheen
  el('ellipse', { cx: -30, cy: -150, rx: 20, ry: 11, fill: '#fff', opacity: .22, transform: 'rotate(-30 -30 -150)' }, body);

  const face = el('g', null, body);
  const blush = el('g', { opacity: 0 }, face);
  for (const s of [-1, 1]) el('ellipse', { cx: s * 50, cy: -62, rx: 13, ry: 7, fill: '#ff6f9e', opacity: .75 }, blush);
  const eyesN = el('g', null, face), look = el('g', null, eyesN);
  const sparkle = [];
  for (const s of [-1, 1]) {
    const e = el('g', { transform: `translate(${s * 33},-92) rotate(${s * 28})` }, look);
    el('ellipse', { cx: 0, cy: 0, rx: 21, ry: 29, fill: '#141414', stroke: '#3a3a3a', 'stroke-width': 3 }, e);
    el('ellipse', { cx: 2 * -s, cy: -12, rx: 5, ry: 4, fill: '#fff', transform: `rotate(${-s * 28} ${2 * -s} -12)` }, e);
    sparkle.push(el('circle', { cx: 7 * s, cy: 10, r: 3.5, fill: '#fff', opacity: 0 }, e));
  }
  const mouthN = el('path', { d: 'M-13 -52 Q0 -40 13 -52', stroke: '#1a1a1a', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }, face);
  const mouthH = el('g', { opacity: 0 }, face);
  el('path', { d: 'M-20 -56 Q0 -22 20 -56 Z', fill: '#5a1030', stroke: '#1a1a1a', 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, mouthH);
  el('path', { d: 'M-9 -40 Q0 -48 9 -40 Q0 -33 -9 -40 Z', fill: '#ff6f91' }, mouthH);
  return { root, shadow, mover, body, face, ants, eyesN, look, mouthN, mouthH, blush, sparkle, face_: -1, vis: true, seed };
}

function setFace(A, h) {
  if (A.face_ === h) return;
  A.face_ = h;
  A.mouthN.setAttribute('opacity', 1 - h); A.mouthH.setAttribute('opacity', h);
  A.blush.setAttribute('opacity', h); A.sparkle.forEach(s => s.setAttribute('opacity', h));
}
function setVis(A, v) { if (A.vis !== v) { A.vis = v; A.root.style.display = v ? '' : 'none'; } }

// dx/dy: position offset · rot: lean · sk: jelly skew · st: vertical stretch (<1 squash)
// head: face slides sideways (fake 3D turn) · look: pupils · ant: antenna wobble
const N = { dx: 0, dy: 0, rot: 0, sk: 0, st: 1, head: 0, look: 0, ant: 0, blink: 1 };
const KEYS = Object.keys(N);
const P = o => Object.assign({}, N, o);
function blend(a, b, w) { const o = {}; for (const k of KEYS) o[k] = lerp(a[k], b[k], w); return o; }

function applyPose(A, p, x, y, s) {
  const sx = 1 + (1 - p.st) * .9;
  A.root.setAttribute('transform', `translate(${(x + p.dx * s).toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(3)})`);
  const air = clamp(-p.dy / 120);
  A.shadow.setAttribute('transform', `scale(${(1 - .45 * air).toFixed(3)})`);
  A.shadow.setAttribute('opacity', (.18 * (1 - .6 * air)).toFixed(3));
  A.mover.setAttribute('transform', `translate(0,${p.dy.toFixed(1)})`);
  A.body.setAttribute('transform', `rotate(${p.rot.toFixed(1)}) skewX(${p.sk.toFixed(1)}) scale(${sx.toFixed(3)},${p.st.toFixed(3)})`);
  A.face.setAttribute('transform', `translate(${p.head.toFixed(1)},0)`);
  A.ants[-1].setAttribute('transform', `rotate(${p.ant.toFixed(1)})`);
  A.ants[1].setAttribute('transform', `rotate(${(-p.ant * .8).toFixed(1)})`);
  A.look.setAttribute('transform', `translate(${p.look.toFixed(1)},${(-92 * (1 - p.blink)).toFixed(1)}) scale(1,${p.blink.toFixed(2)})`);
}

// ---------- poses ----------
function walk(t) {                 // hop-hop-hop along
  const ph = t * Math.PI * 2.4, hop = Math.abs(Math.sin(ph));
  const land = Math.pow(1 - hop, 6);
  return P({ dy: -26 * hop, st: 1 + .08 * hop - .14 * land, rot: 6 + 3 * Math.cos(ph * 2), sk: -6 * Math.cos(ph),
    head: 8, look: 4, ant: 18 * Math.sin(ph * 2 + 1) });
}
function lookUp(t) {
  return P({ rot: 4, head: 10, look: 6, st: 1.03, ant: 5 * Math.sin(t * 3) });
}
function cheer(th, ph = 0, amt = 1) {
  const hop = th < .7 ? Math.sin(Math.PI * th / .7) : 0;
  const land = th > .62 && th < .95 ? Math.sin(Math.PI * (th - .62) / .33) : 0;
  const bb = Math.abs(Math.sin(th * Math.PI / BEAT / 2 + ph));
  return P({ dy: (-95 * hop - 14 * bb) * amt, st: 1 + .16 * hop - .2 * land - .05 * (1 - bb) * amt,
    sk: 9 * Math.sin(th * 9 + ph) * amt, rot: 5 * Math.sin(th * 4.5 + ph),
    head: 6 * Math.sin(th * 5 + ph), ant: 30 * Math.sin(th * 14 + ph) * Math.exp(-th * .8) + 10 * Math.sin(th * 6 + ph) });
}

// Subject 3 (科目三) inspired moves, reworked for a blob with no arms. b = beat (float).
function moveSwing(b) {          // hips one way, top jiggles the other, dip on every beat
  const c = snap(Math.cos(Math.PI * b)), d = Math.abs(Math.cos(Math.PI * b));
  return P({ dx: 16 * c, dy: -6 * (1 - d), rot: -7 * c, sk: 14 * c, st: 1 - .08 * d + .04,
    head: 12 * c, look: 5 * c, ant: 18 * c });
}
function moveBounce(b) {         // hop every beat, tilting alternately, squash on landing
  const c = snap(Math.cos(Math.PI * b)), hop = Math.abs(Math.sin(Math.PI * b)), land = Math.pow(1 - hop, 5);
  return P({ dy: -48 * hop, st: 1 + .12 * hop - .18 * land, rot: 9 * c, sk: -6 * c,
    head: -8 * c, look: -4 * c, ant: 24 * Math.sin(2 * Math.PI * b) });
}
function moveWobble(b) {         // double-time jelly wobble, head bobbing side to side
  const c = snap(Math.cos(Math.PI * b)), k = snap(Math.cos(2 * Math.PI * b));
  return P({ dx: 6 * c, sk: 16 * k, rot: 5 * c, st: 1 + .05 * k, dy: -5 * Math.abs(k),
    head: 13 * c, look: 5 * c, ant: 22 * k });
}
function moveShuffle(b) {        // slide sideways while "turning" (face slides round the blob)
  const c = snap(Math.cos(Math.PI * b)), d = Math.abs(Math.cos(Math.PI * b)), turn = Math.sin(Math.PI * b / 2);
  return P({ dx: 55 * Math.sin(Math.PI * b / 4), dy: -8 * (1 - d), rot: -8 * c, sk: 8 * c, st: 1 - .07 * d + .03,
    head: 26 * turn, look: 8 * turn, ant: 16 * Math.sin(2 * Math.PI * b) });
}
const ROUTINE = [moveSwing, moveBounce, moveSwing, moveWobble, moveShuffle];
function dance(b) {
  const ph = Math.floor(b / 8), local = b - ph * 8;
  const cur = ROUTINE[ph % ROUTINE.length](b);
  if (ph > 0 && local < .5) return blend(ROUTINE[(ph - 1) % ROUTINE.length](b), cur, smooth(local / .5));
  return cur;
}

// ---------- cast ----------
const actors = $('actors');
const main = makeAlien('#aedb2f');
main.isMain = true;

const PALETTE = ['#aedb2f', '#aedb2f', '#5fe0c3', '#b48cff', '#ff8fd1', '#ffd45e', '#6ec9ff', '#ff9f6b'];
const crowd = [];
const ROWS = [[675, .5, 96, 0], [705, .62, 116, 0], [760, .86, 160, 150], [880, 1.02, 190, 130], [1010, 1.2, 225, 180]];
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
const CAM_BASE = [800, 480, 1500, 860], CAM_IN = [800, 650, 460, 300], CAM_OUT = [800, 700, 2200, 1040];
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
      cp = P({ st: u < .6 ? 1.18 : 1 - .2 * Math.sin(Math.PI * clamp((u - .6) / .4)), ant: 30 * Math.sin(u * 20) });
    } else if (t < TL.dance) {
      cp = cheer(t - a.drop - .75 + 1, a.ph, .6);
    } else {
      const b = (t - TL.dance) / BEAT;
      cp = blend(cheer(t - a.drop + .25, a.ph, .6), dance(b), smooth(clamp(b / .5)));
    }
    applyPose(a, cp, a.x, a.y + dy, a.s);
  }

  // sparkles around main alien's head
  const hx = x + pose.dx, hy = MAIN.y + pose.dy - 125;
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
