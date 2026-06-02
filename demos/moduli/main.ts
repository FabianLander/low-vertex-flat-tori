/**
 * Moduli demo — every explored torus as a point τ ∈ ℍ, colored by class.
 *
 * The seven files data/explore-from-seeds/seed-N.csv are seven exploration
 * COMPONENTS: each is a Markov walk that started from one seed flat torus and
 * wandered over the embedded-and-flat manifold. We treat each file as one
 * CLASS and give it its own color. For every torus (one CSV row, 24 floats) we
 * develop it and read off its modulus τ = v₂/v₁ ∈ ℍ (see src/math/develop.ts,
 * the same computation animated in develop-orig-7). Then we scatter all ~45k
 * points in the upper half plane, so each class is a colored cloud in
 * Teichmüller space.
 *
 * The standard SL(2,ℤ) fundamental domain ( |Re τ| ≤ ½, |τ| ≥ 1 ) is drawn
 * faintly for reference — the clouds sit right on top of the unit-circle arc.
 *
 * Interaction: scroll to zoom, drag to pan, click a legend row to toggle a
 * class, hover to read τ. r resets the view. Pure canvas 2D, no three.js.
 */

import { VERTEX_COUNT } from '../../src/math/topology';
import { modulus, type V2 } from '../../src/math/develop';
import { RICH_REFERENCE } from '../../src/math/reference';
import seedsRaw from '../../data/explore-from-seeds/seeds.csv?raw';

const DIM = VERTEX_COUNT * 3;
const ROT_TOL = 1e-5; // skip any row whose holonomy isn't a pure translation

// Vite: pull in every seed-N.csv as raw text, keyed by path.
const seedFiles = import.meta.glob('../../data/explore-from-seeds/seed-*.csv', {
  eager: true, query: '?raw', import: 'default',
}) as Record<string, string>;

// Distinct, dark-background-friendly categorical colors (one per class).
const PALETTE = ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];

type Klass = { name: string; color: string; pts: V2[]; visible: boolean };

function parseRows(text: string): Float64Array[] {
  const rows: Float64Array[] = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length === DIM) rows.push(Float64Array.from(nums));
  }
  return rows;
}

// Build classes in seed-1..seed-N order, compute τ for every torus.
const classes: Klass[] = Object.keys(seedFiles)
  .sort((a, b) => {
    const na = Number(a.match(/seed-(\d+)/)![1]), nb = Number(b.match(/seed-(\d+)/)![1]);
    return na - nb;
  })
  .map((path, i) => {
    const name = path.match(/(seed-\d+)/)![1];
    const pts: V2[] = [];
    for (const p of parseRows(seedFiles[path])) {
      const m = modulus(p);
      if (m.rotDefect > ROT_TOL) continue;
      pts.push(m.tau);
    }
    return { name, color: PALETTE[i % PALETTE.length], pts, visible: true };
  });

const totalPts = classes.reduce((s, c) => s + c.pts.length, 0);

// ---- the 8 SEED markers: 0 = Rich's reference embedding, 1..7 = seeds.csv ----
// These are the starting tori of the seven explorations (plus Rich's). Overlaid
// on the clouds so you can see where each seed lands — and that each cloud is
// the orbit wandering out from its seed.
type Seed = { label: string; tau: V2; color: string; isRich: boolean };
const seedSources: { src: ArrayLike<number>; label: string; color: string; isRich: boolean }[] = [
  { src: RICH_REFERENCE.positions, label: '0', color: '#ffffff', isRich: true },
];
parseRows(seedsRaw).forEach((p, i) =>
  seedSources.push({ src: p, label: String(i + 1), color: PALETTE[i % PALETTE.length], isRich: false }));
const seeds: Seed[] = seedSources.map((s) => ({ label: s.label, color: s.color, isRich: s.isRich, tau: modulus(s.src).tau }));

// Data bounds over all τ (cloud points + seed markers), used for the initial fit.
const bounds = (() => {
  let minRe = Infinity, maxRe = -Infinity, minIm = Infinity, maxIm = -Infinity;
  const acc = (re: number, im: number) => {
    if (re < minRe) minRe = re; if (re > maxRe) maxRe = re;
    if (im < minIm) minIm = im; if (im > maxIm) maxIm = im;
  };
  for (const c of classes) for (const [re, im] of c.pts) acc(re, im);
  for (const s of seeds) acc(s.tau[0], s.tau[1]);
  return { minRe, maxRe, minIm, maxIm };
})();

// ---- canvas ----
const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh;background:#0e0e12;cursor:grab';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

// ---- view transform: equal-aspect, plane → screen ----
// scale px-per-unit; (cx,cy) is the plane point at the canvas center.
let scale = 1, cx = 0, cy = 1;
function fitView(): void {
  const W = window.innerWidth, H = window.innerHeight, m = 80;
  const spanX = (bounds.maxRe - bounds.minRe) || 1;
  const spanY = (bounds.maxIm - bounds.minIm) || 1;
  scale = Math.min((W - 2 * m) / spanX, (H - 2 * m) / spanY);
  cx = (bounds.minRe + bounds.maxRe) / 2;
  cy = (bounds.minIm + bounds.maxIm) / 2;
}
const sx = (re: number) => window.innerWidth / 2 + (re - cx) * scale;
const sy = (im: number) => window.innerHeight / 2 - (im - cy) * scale;
const planeX = (px: number) => cx + (px - window.innerWidth / 2) / scale;
const planeY = (py: number) => cy - (py - window.innerHeight / 2) / scale;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', resize);

// ---- axes, grid, and the SL(2,ℤ) fundamental domain ----
function niceStep(spanUnits: number): number {
  const raw = spanUnits / 8;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
}

function drawAxes(): void {
  const W = window.innerWidth, H = window.innerHeight;
  const left = planeX(0), right = planeX(W), top = planeY(0), bot = planeY(H);
  const step = niceStep(right - left);

  ctx.lineWidth = 1;
  ctx.font = '11px ui-monospace, monospace';
  ctx.textBaseline = 'top';
  // vertical grid (constant Re)
  for (let re = Math.ceil(left / step) * step; re <= right; re += step) {
    const X = sx(re);
    ctx.strokeStyle = Math.abs(re) < step / 2 ? 'rgba(150,160,190,0.30)' : 'rgba(150,160,190,0.08)';
    ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke();
    ctx.fillStyle = 'rgba(180,186,200,0.5)'; ctx.textAlign = 'center';
    ctx.fillText(re.toFixed(2), X, H - 16);
  }
  // horizontal grid (constant Im) — Im > 0 only
  for (let im = Math.max(step, Math.ceil(bot / step) * step); im <= top; im += step) {
    const Y = sy(im);
    ctx.strokeStyle = 'rgba(150,160,190,0.08)';
    ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke();
    ctx.fillStyle = 'rgba(180,186,200,0.5)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${im.toFixed(2)}i`, 6, Y);
    ctx.textBaseline = 'top';
  }

  // SL(2,ℤ) fundamental domain: vertical walls Re=±½ and the arc |τ|=1.
  ctx.strokeStyle = 'rgba(240,200,120,0.45)';
  ctx.setLineDash([5, 5]); ctx.lineWidth = 1.3;
  for (const wall of [-0.5, 0.5]) {
    const X = sx(wall);
    ctx.beginPath(); ctx.moveTo(X, sy(Math.sin(Math.PI / 3))); ctx.lineTo(X, 0); ctx.stroke();
  }
  // arc |τ| = 1 from the corner e^{i·2π/3}=(−½,√3⁄2) to e^{iπ/3}=(½,√3⁄2),
  // drawn as a polyline im = √(1−re²) (avoids screen-space angle sign issues).
  ctx.beginPath();
  for (let k = 0; k <= 64; k++) {
    const re = -0.5 + k / 64;
    const X = sx(re), Y = sy(Math.sqrt(1 - re * re));
    if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---- points ----
function drawPoints(): void {
  const W = window.innerWidth, H = window.innerHeight;
  const r = totalPts > 20000 ? 1.4 : 2;
  ctx.globalAlpha = 0.5;
  for (const c of classes) {
    if (!c.visible) continue;
    ctx.fillStyle = c.color;
    for (const [re, im] of c.pts) {
      const X = sx(re), Y = sy(im);
      if (X < -4 || X > W + 4 || Y < -4 || Y > H + 4) continue;
      ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ---- seed markers (0 = Rich, 1..7 = seeds), drawn on top of the clouds ----
function relLum(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function drawSeeds(): void {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 10px ui-monospace, monospace';
  for (const s of seeds) {
    const X = sx(s.tau[0]), Y = sy(s.tau[1]);
    ctx.beginPath(); ctx.arc(X, Y, 7, 0, Math.PI * 2);
    ctx.fillStyle = s.color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#0e0e12'; ctx.stroke();          // dark rim for contrast on any cloud
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(X, Y, 8.5, 0, Math.PI * 2); ctx.stroke();      // thin white halo
    ctx.fillStyle = relLum(s.color) > 0.6 ? '#0e0e12' : '#ffffff';         // legible digit
    ctx.fillText(s.label, X, Y + 0.5);
  }
}

// ---- legend (top-left), click a row to toggle a class ----
type LegendHit = { x: number; y: number; w: number; h: number; klass: Klass };
let legendHits: LegendHit[] = [];
function drawLegend(): void {
  legendHits = [];
  const x0 = 16, y0 = 16, rowH = 22, sw = 12;
  ctx.font = '13px ui-monospace, monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  // title
  ctx.fillStyle = 'rgba(232,232,236,0.95)';
  ctx.fillText(`moduli τ ∈ ℍ — ${totalPts.toLocaleString()} tori, ${classes.length} classes`, x0, y0 + 8);
  ctx.fillStyle = 'rgba(180,186,200,0.75)'; ctx.font = '11px ui-monospace, monospace';
  ctx.fillText('◯ seed markers: 0 = Rich, 1–7 = seeds', x0, y0 + 26);
  ctx.font = '13px ui-monospace, monospace';
  classes.forEach((c, i) => {
    const y = y0 + 48 + i * rowH;
    legendHits.push({ x: x0 - 4, y: y - rowH / 2, w: 180, h: rowH, klass: c });
    ctx.globalAlpha = c.visible ? 1 : 0.35;
    ctx.fillStyle = c.color;
    ctx.fillRect(x0, y - sw / 2, sw, sw);
    ctx.fillStyle = 'rgba(232,232,236,0.92)';
    ctx.fillText(`${c.name}  (${c.pts.length.toLocaleString()})`, x0 + sw + 8, y + 1);
    ctx.globalAlpha = 1;
  });
}

// ---- hover readout: nearest visible point to the cursor ----
let hover: { x: number; y: number } | null = null;
function drawHover(): void {
  if (!hover) return;

  // Seed markers take priority (they sit on top of the clouds).
  let bSeed: Seed | null = null, bSeedD = Infinity;
  for (const s of seeds) {
    const dx = sx(s.tau[0]) - hover.x, dy = sy(s.tau[1]) - hover.y, d2 = dx * dx + dy * dy;
    if (d2 < 10 * 10 && d2 < bSeedD) { bSeedD = d2; bSeed = s; }
  }
  if (bSeed) {
    const X = sx(bSeed.tau[0]), Y = sy(bSeed.tau[1]);
    const name = bSeed.isRich ? 'Rich (seed 0)' : `seed-${bSeed.label}`;
    const label = `${name}   τ = ${bSeed.tau[0].toFixed(4)} ${bSeed.tau[1] >= 0 ? '+' : '−'} ${Math.abs(bSeed.tau[1]).toFixed(4)}i`;
    ctx.font = '12px ui-monospace, monospace';
    const w = ctx.measureText(label).width + 14;
    let bx = X + 12, by = Y - 30;
    if (bx + w > window.innerWidth) bx = X - 12 - w;
    if (by < 0) by = Y + 14;
    ctx.fillStyle = 'rgba(20,22,30,0.95)'; ctx.fillRect(bx, by, w, 22);
    ctx.strokeStyle = bSeed.color; ctx.lineWidth = 1.2; ctx.strokeRect(bx, by, w, 22);
    ctx.fillStyle = '#e8e8ec'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + 7, by + 12);
    return;
  }

  const pr = 14; // px search radius
  let best: { c: Klass; re: number; im: number; d2: number } | null = null;
  for (const c of classes) {
    if (!c.visible) continue;
    for (const [re, im] of c.pts) {
      const dx = sx(re) - hover.x, dy = sy(im) - hover.y, d2 = dx * dx + dy * dy;
      if (d2 < pr * pr && (!best || d2 < best.d2)) best = { c, re, im, d2 };
    }
  }
  if (!best) return;
  const X = sx(best.re), Y = sy(best.im);
  ctx.beginPath(); ctx.arc(X, Y, 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  const label = `${best.c.name}  τ = ${best.re.toFixed(4)} ${best.im >= 0 ? '+' : '−'} ${Math.abs(best.im).toFixed(4)}i`;
  ctx.font = '12px ui-monospace, monospace';
  const w = ctx.measureText(label).width + 14;
  let bx = X + 10, by = Y - 28;
  if (bx + w > window.innerWidth) bx = X - 10 - w;
  if (by < 0) by = Y + 12;
  ctx.fillStyle = 'rgba(20,22,30,0.92)';
  ctx.fillRect(bx, by, w, 22);
  ctx.strokeStyle = best.c.color; ctx.lineWidth = 1; ctx.strokeRect(bx, by, w, 22);
  ctx.fillStyle = '#e8e8ec'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + 7, by + 12);
}

function draw(): void {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawAxes();
  drawPoints();
  drawSeeds();
  drawLegend();
  drawHover();
}

// ---- interaction: pan, zoom, legend toggle, hover ----
let dragging = false, dragMoved = false, lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', (e) => {
  dragging = true; dragMoved = false; lastX = e.clientX; lastY = e.clientY;
  canvas.style.cursor = 'grabbing';
});
window.addEventListener('mouseup', (e) => {
  if (dragging && !dragMoved) {
    const hit = legendHits.find((h) => e.clientX >= h.x && e.clientX <= h.x + h.w && e.clientY >= h.y && e.clientY <= h.y + h.h);
    if (hit) { hit.klass.visible = !hit.klass.visible; draw(); }
  }
  dragging = false; canvas.style.cursor = 'grab';
});
window.addEventListener('mousemove', (e) => {
  if (dragging) {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
    cx -= dx / scale; cy += dy / scale;
    lastX = e.clientX; lastY = e.clientY;
    hover = null; draw();
  } else {
    hover = { x: e.clientX, y: e.clientY }; draw();
  }
});
canvas.addEventListener('mouseleave', () => { hover = null; draw(); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const k = Math.exp(-e.deltaY * 0.0015);
  // zoom about the cursor: keep the plane point under the cursor fixed.
  const pX = planeX(e.clientX), pY = planeY(e.clientY);
  scale *= k;
  cx = pX - (e.clientX - window.innerWidth / 2) / scale;
  cy = pY + (e.clientY - window.innerHeight / 2) / scale;
  draw();
}, { passive: false });
window.addEventListener('keydown', (e) => { if (e.key === 'r') { fitView(); draw(); } });

fitView();
resize();
