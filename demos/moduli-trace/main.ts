/**
 * Moduli-trace — place the cartoon-torus curve (docs/torus.svg) inside the REAL
 * moduli point cloud and pull out the tori whose τ trace the donut.
 *
 * Each row of data/explore-from-seeds/seed-*.csv is a torus in ℝ²⁴; its modulus
 * τ = v₂/v₁ ∈ ℍ is one cloud point (carrying its source row as provenance). We
 * lay the torus outline (outer oval + two hole arcs) over the cloud, sample
 * points evenly along it, and take the nearest cloud point to each — those are
 * the tori that draw the torus. Press w to download them as a CSV.
 *
 * Controls:  arrows move · + / − scale · , / . point count · [ / ] tube
 *            b cloud · c curve · w download selected tori (CSV)
 */

import { RICH } from '../../src/tori';
import { modulus } from '../../src/math/develop';
import { makeCurve, type PlaneCurve } from '../../src/math/plane/curve';
import { sampleAlongCurve, type CloudPoint, type Match } from '../../src/math/plane/curveCloudSample';
import type { Vec2 } from '../../src/math/plane/vec2';

const DIM = RICH.vertexCount * 3;
const ROT_TOL = 1e-5;

// ---- load the real moduli cloud (τ + the source ℝ²⁴ row as provenance) ----
const seedFiles = import.meta.glob('../../data/explore-from-seeds/seed-*.csv', {
  eager: true, query: '?raw', import: 'default',
}) as Record<string, string>;

type Src = { row: Float64Array; file: string };
const cloud: CloudPoint<Src>[] = [];
for (const [path, text] of Object.entries(seedFiles)) {
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length !== DIM) continue;
    const row = Float64Array.from(nums);
    const m = modulus(RICH, row);
    if (m.rotDefect > ROT_TOL) continue;             // keep only genuine flat tori
    cloud.push({ p: [m.tau[0], m.tau[1]], payload: { row, file: path } });
  }
}

// cloud bounding box + centroid (the τ region the donut must sit in)
const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
let mx = 0, my = 0;
for (const c of cloud) {
  if (c.p[0] < bb.x0) bb.x0 = c.p[0]; if (c.p[0] > bb.x1) bb.x1 = c.p[0];
  if (c.p[1] < bb.y0) bb.y0 = c.p[1]; if (c.p[1] > bb.y1) bb.y1 = c.p[1];
  mx += c.p[0]; my += c.p[1];
}
mx /= cloud.length; my /= cloud.length;

// ---- the cartoon torus, in its own (unit) coords (from docs/torus.svg) ----
const S = 0.02;
const Wc = (x: number, y: number): Vec2 => [(x - 250) * S, -(y - 165) * S];
const bezier = (p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2) => (t: number): Vec2 => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
};
const ovalF = (t: number): Vec2 => [175 * S * Math.cos(2 * Math.PI * t), 95 * S * Math.sin(2 * Math.PI * t)];
const backF = bezier(Wc(175, 158), Wc(195, 120), Wc(305, 120), Wc(325, 158));
const frontF = bezier(Wc(150, 150), Wc(185, 200), Wc(315, 200), Wc(350, 150));
const TORUS_HALF_W = 175 * S; // outer-oval half-width (unit coords)

// place the unit torus into τ-space (center + uniform scale)
function buildTorus(cx: number, cy: number, scale: number): PlaneCurve[] {
  const place = (f: (t: number) => Vec2) => (t: number): Vec2 => {
    const p = f(t); return [cx + p[0] * scale, cy + p[1] * scale];
  };
  return [
    makeCurve(place(ovalF), { samples: 400, closed: true }),
    makeCurve(place(backF), { samples: 160 }),
    makeCurve(place(frontF), { samples: 160 }),
  ];
}

// ---- state ----
// Place the torus centered at (0.07, 0.98) with outer-oval diameter 0.05 in τ.
const CENTER: Vec2 = [0.07, 0.98];
const DIAMETER = 0.05;
const baseScale = (DIAMETER / 2) / TORUS_HALF_W;
let tx = CENTER[0], ty = CENTER[1], scale = baseScale;
let count = 60, maxDist = 0.02;
let showCloud = true, showCurve = true;
let torus = buildTorus(tx, ty, scale);

function sampleShape(curves: PlaneCurve[]): { matches: Match<Src>[] } {
  const total = curves.reduce((s, c) => s + c.length, 0);
  const matches: Match<Src>[] = [];
  for (const cv of curves) {
    const n = Math.max(2, Math.round((count * cv.length) / total));
    matches.push(...sampleAlongCurve(cv, cloud, { count: n, maxDist }).matches);
  }
  return { matches };
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

// zoom a square window centered on the torus (so the small donut is visible),
// preserving aspect; the view follows the torus as you move/scale it
function fit(): { sx: (p: Vec2) => number; sy: (p: Vec2) => number } {
  const Wd = window.innerWidth, H = window.innerHeight, m = 40;
  const viewHalf = TORUS_HALF_W * scale * 3.5; // ~3.5× the donut's half-width
  const k = (Math.min(Wd, H) - 2 * m) / (2 * viewHalf);
  return { sx: (p) => Wd / 2 + (p[0] - tx) * k, sy: (p) => H / 2 - (p[1] - ty) * k };
}

function draw(): void {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const f = fit();
  const { matches } = sampleShape(torus);

  if (showCloud) {
    ctx.fillStyle = 'rgba(150,160,180,0.45)';
    for (const c of cloud) { ctx.beginPath(); ctx.arc(f.sx(c.p), f.sy(c.p), 1.3, 0, 2 * Math.PI); ctx.fill(); }
  }

  if (showCurve) {
    ctx.strokeStyle = 'rgba(235,238,245,0.85)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    for (const cv of torus) {
      ctx.beginPath();
      cv.polyline.forEach((p, i) => { const X = f.sx(p), Y = f.sy(p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(240,200,120,0.4)'; ctx.lineWidth = 1;
  for (const mm of matches) { ctx.beginPath(); ctx.moveTo(f.sx(mm.p), f.sy(mm.p)); ctx.lineTo(f.sx(mm.curvePoint), f.sy(mm.curvePoint)); ctx.stroke(); }
  for (const mm of matches) {
    ctx.fillStyle = '#f0be5a';
    ctx.beginPath(); ctx.arc(f.sx(mm.p), f.sy(mm.p), 4, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#0e0e12'; ctx.lineWidth = 1; ctx.stroke();
  }

  const lines = [
    `moduli τ ∈ ℍ — ${cloud.length} tori   (arrows move · +/− scale · ,/. points · [ ] tube)`,
    `points ${count}   selected ${matches.length}   tube ${maxDist.toFixed(3)}   scale ${(scale / baseScale).toFixed(2)}×`,
    `b cloud ${showCloud ? 'on' : 'off'} · c curve ${showCurve ? 'on' : 'off'} · w download selected tori (CSV)`,
  ];
  ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let yy = 22;
  for (const L of lines) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(L, 13, yy + 1);
    ctx.fillStyle = '#e8e8ec'; ctx.fillText(L, 12, yy);
    yy += 19;
  }
}

function downloadCSV(): void {
  const { matches } = sampleShape(torus);
  const seen = new Set<Float64Array>();
  const rows: string[] = [];
  for (const m of matches) {
    if (seen.has(m.payload.row)) continue;            // distinct tori only
    seen.add(m.payload.row);
    rows.push(Array.from(m.payload.row).map((v) => v.toPrecision(10)).join(','));
  }
  const blob = new Blob([rows.join('\n') + '\n'], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'torus-trace-tori.csv'; a.click();
  URL.revokeObjectURL(url);
}

const step = () => 0.03 * (bb.x1 - bb.x0); // nudge ~3% of the cloud width
window.addEventListener('keydown', (e) => {
  const k = e.key;
  if (k === 'ArrowLeft') { tx -= step(); }
  else if (k === 'ArrowRight') { tx += step(); }
  else if (k === 'ArrowUp') { ty += step(); }
  else if (k === 'ArrowDown') { ty -= step(); }
  else if (k === '+' || k === '=') { scale *= 1.1; }
  else if (k === '-' || k === '_') { scale /= 1.1; }
  else if (k === '.') { count = Math.min(400, count + 5); }
  else if (k === ',') { count = Math.max(6, count - 5); }
  else if (k === ']') { maxDist = Math.min(1, maxDist + 0.005); }
  else if (k === '[') { maxDist = Math.max(0.002, maxDist - 0.005); }
  else if (k === 'b') { showCloud = !showCloud; }
  else if (k === 'c') { showCurve = !showCurve; }
  else if (k === 'w') { downloadCSV(); return; }
  else return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(k)) torus = buildTorus(tx, ty, scale);
  e.preventDefault();
  draw();
});

resize();
