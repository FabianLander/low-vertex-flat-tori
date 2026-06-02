/**
 * Curve-cloud demo — trace a parametric curve through a planar point cloud,
 * sampling points evenly spaced along the curve (the moduli use-case, synthetic
 * data only).
 *
 * The cloud is a plain uniform 2D scatter (NOT concentrated on the curve). A
 * shape (white) threads through it; we run sampleAlongCurve and highlight the
 * SELECTED points (gold) — the nearest cloud point to each evenly-spaced sample
 * point. A shape may be several curves (e.g. the cartoon torus = outer oval +
 * two hole arcs); the point budget is split across them by arclength.
 *
 * Controls:  ←/→ switch shape · ↑/↓ point count · [ / ] tube radius · r reseed
 */

import { makeCurve, type PlaneCurve } from '../../src/math/plane/curve';
import { sampleAlongCurve, type CloudPoint, type Match } from '../../src/math/plane/curveCloudSample';
import type { Vec2 } from '../../src/math/plane/vec2';

// ---- tiny deterministic RNG ----
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- the cartoon torus from docs/torus.svg, in world coords ----
// SVG is 500×330 with the shape around (250,165); map to world (centered, y-up).
const S = 0.02;
const W = (x: number, y: number): Vec2 => [(x - 250) * S, -(y - 165) * S];
// cubic Bézier through 4 control points → parametric t↦(x,y)
const bezier = (p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2) => (t: number): Vec2 => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
};
function torusCurves(): PlaneCurve[] {
  const oval = makeCurve((t) => [175 * S * Math.cos(2 * Math.PI * t), 95 * S * Math.sin(2 * Math.PI * t)] as Vec2,
    { samples: 400, closed: true });
  const back = makeCurve(bezier(W(175, 158), W(195, 120), W(305, 120), W(325, 158)), { samples: 160 });
  const front = makeCurve(bezier(W(150, 150), W(185, 200), W(315, 200), W(350, 150)), { samples: 160 });
  return [oval, back, front];
}

// ---- shapes (each = one or more curves) ----
const SHAPES: { name: string; curves: PlaneCurve[] }[] = [
  { name: 'torus', curves: torusCurves() },
  { name: 'line', curves: [makeCurve((t) => [-3 + 6 * t, 0.6 * Math.sin(2.2 * t)] as Vec2)] },
  { name: 'lissajous', curves: [makeCurve((t) => [2.6 * Math.sin(2 * Math.PI * 3 * t), 2.6 * Math.sin(2 * Math.PI * 2 * t)] as Vec2, { closed: true })] },
];

type Src = { id: number };

// ---- state ----
let shapeIdx = 0;
let count = 50;
let maxDist = 0.35;
let seed = 1;
let showCurve = true;
let showCloud = true;
let cloud: CloudPoint<Src>[] = [];

function rebuildCloud(): void {
  const rng = mulberry32(seed);
  cloud = [];
  for (let i = 0; i < 14000; i++) cloud.push({ p: [-3.8 + 7.6 * rng(), -3.8 + 7.6 * rng()], payload: { id: i } });
}
rebuildCloud();

/** Sample across a shape's curves, splitting the point budget by arclength. */
function sampleShape(curves: PlaneCurve[]): { matches: Match<Src>[]; gapPts: Vec2[] } {
  const total = curves.reduce((s, c) => s + c.length, 0);
  const matches: Match<Src>[] = [];
  const gapPts: Vec2[] = [];
  for (const cv of curves) {
    const n = Math.max(2, Math.round((count * cv.length) / total));
    const res = sampleAlongCurve(cv, cloud, { count: n, maxDist });
    matches.push(...res.matches);
    if (res.gaps.length) {
      const pts = cv.uniform(n);
      for (const g of res.gaps) gapPts.push(pts[g].p);
    }
  }
  return { matches, gapPts };
}

// ---- canvas ----
const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh;background:#0e0e12';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', resize);

function fit(): { sx: (p: Vec2) => number; sy: (p: Vec2) => number } {
  const Wd = window.innerWidth, H = window.innerHeight;
  const k = Math.min(Wd, H) / 8.4;
  return { sx: (p) => Wd / 2 + p[0] * k, sy: (p) => H / 2 - p[1] * k };
}

function draw(): void {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const f = fit();
  const shape = SHAPES[shapeIdx];
  const { matches, gapPts } = sampleShape(shape.curves);

  // cloud — one neutral colour (toggle with b)
  if (showCloud) {
    ctx.fillStyle = 'rgba(150,160,180,0.5)';
    for (const c of cloud) { ctx.beginPath(); ctx.arc(f.sx(c.p), f.sy(c.p), 1.6, 0, 2 * Math.PI); ctx.fill(); }
  }

  // the shape's curves (toggle with c)
  if (showCurve) {
    ctx.strokeStyle = 'rgba(235,238,245,0.85)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    for (const cv of shape.curves) {
      ctx.beginPath();
      cv.polyline.forEach((p, i) => { const X = f.sx(p), Y = f.sy(p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke();
    }
  }

  // gaps
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.6;
  for (const p of gapPts) {
    const X = f.sx(p), Y = f.sy(p), r = 4;
    ctx.beginPath(); ctx.moveTo(X - r, Y - r); ctx.lineTo(X + r, Y + r); ctx.moveTo(X + r, Y - r); ctx.lineTo(X - r, Y + r); ctx.stroke();
  }

  // selected points
  ctx.strokeStyle = 'rgba(240,200,120,0.4)'; ctx.lineWidth = 1;
  for (const m of matches) { ctx.beginPath(); ctx.moveTo(f.sx(m.p), f.sy(m.p)); ctx.lineTo(f.sx(m.curvePoint), f.sy(m.curvePoint)); ctx.stroke(); }
  for (const m of matches) {
    ctx.fillStyle = '#f0be5a';
    ctx.beginPath(); ctx.arc(f.sx(m.p), f.sy(m.p), 4.5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#0e0e12'; ctx.lineWidth = 1.2; ctx.stroke();
  }

  // HUD
  const lines = [
    `shape ${shapeIdx + 1}/${SHAPES.length}  ${shape.name}   (← → switch)`,
    `cloud ${cloud.length}   points ${count}   selected ${matches.length}   gaps ${gapPts.length}   tube ${maxDist.toFixed(2)}`,
    `(↑↓ points · [ ] tube · c curve ${showCurve ? 'on' : 'off'} · b cloud ${showCloud ? 'on' : 'off'} · r reseed)`,
  ];
  ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let yy = 22;
  for (const L of lines) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(L, 13, yy + 1);
    ctx.fillStyle = '#e8e8ec'; ctx.fillText(L, 12, yy);
    yy += 19;
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    shapeIdx = (shapeIdx + (e.key === 'ArrowLeft' ? -1 : 1) + SHAPES.length) % SHAPES.length;
    draw(); e.preventDefault();
  } else if (e.key === 'ArrowUp') { count = Math.min(200, count + 4); draw(); e.preventDefault(); }
  else if (e.key === 'ArrowDown') { count = Math.max(6, count - 4); draw(); e.preventDefault(); }
  else if (e.key === ']') { maxDist = Math.min(4, maxDist + 0.05); draw(); }
  else if (e.key === '[') { maxDist = Math.max(0.05, maxDist - 0.05); draw(); }
  else if (e.key === 'c') { showCurve = !showCurve; draw(); }
  else if (e.key === 'b') { showCloud = !showCloud; draw(); }
  else if (e.key === 'r') { seed++; rebuildCloud(); draw(); }
});

resize();
