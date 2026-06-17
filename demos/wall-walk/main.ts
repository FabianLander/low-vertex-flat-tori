/**
 * wall-walk — live random walk near the minimal Re τ̂ = ½ (rhombic-wall) tori.
 *
 * The night3 search found flat embedded tori sitting exactly on the rhombic
 * wall |Re τ̂| = ½ for three triangulations: push-t7 and push-t3 (margins as
 * thin as ~1e-9 — barely embedded) and wall-t6 (~1e-5, a little fatter). This
 * demo seeds from those champions and runs the simplest possible search IN THE
 * BROWSER (src/math is pure, no DOM): for each attempt
 *
 *     1. pick a seed, kick every coordinate by Gaussian σ
 *     2. newtonFlatten — plain projection back onto the flat manifold
 *     3. keep it if it is embedded AND still on the wall: ||Re τ̂| − ½| < band
 *     4. normalize to unit area, re-flatten, record the certificate
 *
 * Every keeper is scattered live in ℍ (against the SL(2,ℤ) fundamental domain),
 * coloured by triangulation, and can be saved to CSV in the standard 28-column
 * format (24 positions, coneDeficit, Re τ̂, Im τ̂, margin) — exactly what
 * scripts/search-near-rect.mjs writes, so the output drops back into the pipeline.
 *
 * Points are drawn at the raw TEICHMÜLLER τ by default (consistent with the
 * wall-moduli demo); tick "fold to domain" to plot the reduced τ̂, which hugs
 * the Re = ±½ walls. Hover for τ, reduced Re τ̂, cone deficit, and margin.
 */

import { byId } from '../../src/triangulations';
import type { Triangulation } from '../../src/topology/triangulation';
import { modulus, reduceModulus } from '../../src/topology/develop';
import { newtonFlatten } from '../../src/math/newton';
import { maxConeDeficit } from '../../src/conditions/flat';
import { isEmbedded } from '../../src/conditions/embedded/index';
import { minMargin, linearSize } from '../../src/conditions/embedded/index';
import { makeRng } from '../../src/configuration/rng';

import pushT7Raw from './data/push-t7-best.csv?raw';
import pushT3Raw from './data/push-t3-best.csv?raw';
import wallT6Raw from './data/wall-t6-best.csv?raw';

// ---- walk parameters (live-editable) ----
const params = { sigma: 0.004, band: 3e-3, angleTol: 1e-10, newtonTol: 1e-12 };
const TARGET_RE = 0.5;          // the rhombic wall |Re τ̂| = ½
const SEED_RE_TOL = 0.05;       // a best-file row only seeds if it is near the wall
const MAX_FINDS = 60_000;       // per-family cap (memory / responsiveness)
const MAX_POOL = 20_000;        // cap feedback-grown seed pools

type Family = {
  key: string; type: number; color: string; torus: Triangulation; N: number;
  pool: Float64Array[];                 // seed positions (grows via feedback)
  seedTau: { re: number; im: number }[];// where the original champions develop (markers)
  // parallel find arrays
  rawRe: number[]; rawIm: number[]; redRe: number[]; redIm: number[];
  cone: number[]; margin: number[]; pos: Float64Array[];
  attempts: number; accepts: number; bestMargin: number;
  active: boolean; visible: boolean; drawn: number;  // how many finds painted to the layer
};

function rows(text: string, N: number): number[][] {
  const out: number[][] = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || /^[a-zA-Z]/.test(s)) continue;
    const p = s.split(',').map(Number);
    if (p.length >= N) out.push(p);
  }
  return out;
}

function makeFamily(key: string, type: number, color: string, raw: string): Family {
  const torus = byId(type);
  const N = torus.vertexCount * 3;
  const pool: Float64Array[] = [];
  const seedTau: { re: number; im: number }[] = [];
  for (const r of rows(raw, N)) {
    // col 25 (0-indexed) = reduced Re τ̂; only seed from rows actually on the wall
    if (r.length >= 28 && Math.abs(Math.abs(r[25]) - TARGET_RE) > SEED_RE_TOL) continue;
    const p = Float64Array.from(r.slice(0, N));
    pool.push(p);
    const t = modulus(torus, p).tau;
    seedTau.push({ re: t[0], im: t[1] });
  }
  return {
    key, type, color, torus, N, pool, seedTau,
    rawRe: [], rawIm: [], redRe: [], redIm: [], cone: [], margin: [], pos: [],
    attempts: 0, accepts: 0, bestMargin: 0, active: true, visible: true, drawn: 0,
  };
}

const families: Family[] = [
  makeFamily('push-t7', 7, '#ef4444', pushT7Raw),
  makeFamily('push-t3', 3, '#f97316', pushT3Raw),
  makeFamily('wall-t6', 6, '#a855f7', wallT6Raw),
].filter((f) => f.pool.length > 0);

// ---- rng / gaussian ----
let rng = makeRng('xoshiro', (Date.now() >>> 0) || 1);
function gaussian(): number {
  let u = rng(); if (u < 1e-12) u = 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

// one perturb→flatten→filter attempt; returns true if a keeper was recorded
function attempt(f: Family, scratch: Float64Array): boolean {
  f.attempts++;
  const seed = f.pool[(rng() * f.pool.length) | 0];
  for (let i = 0; i < f.N; i++) scratch[i] = seed[i] + params.sigma * gaussian();

  const nr = newtonFlatten(f.torus, scratch, { tolerance: params.newtonTol });
  if (nr.status !== 'converged' || maxConeDeficit(f.torus, scratch) >= params.angleTol) return false;
  let tHat = reduceModulus(modulus(f.torus, scratch).tau);
  if (Math.abs(Math.abs(tHat[0]) - TARGET_RE) >= params.band) return false;
  if (!isEmbedded(f.torus, scratch)) return false;

  // normalize to unit area (preserves flat/embedded/τ), re-flatten, re-check
  const k = 1 / linearSize(f.torus, scratch);
  for (let i = 0; i < f.N; i++) scratch[i] *= k;
  const polish = newtonFlatten(f.torus, scratch, { tolerance: params.newtonTol });
  const cone = maxConeDeficit(f.torus, scratch);
  if (polish.status !== 'converged' || cone >= params.angleTol) return false;
  const raw = modulus(f.torus, scratch).tau;
  tHat = reduceModulus(raw);
  if (Math.abs(Math.abs(tHat[0]) - TARGET_RE) >= params.band || !isEmbedded(f.torus, scratch)) return false;
  const margin = minMargin(f.torus, scratch).margin;

  if (f.pos.length < MAX_FINDS) {
    const p = Float64Array.from(scratch.subarray(0, f.N));
    f.rawRe.push(raw[0]); f.rawIm.push(raw[1]);
    f.redRe.push(tHat[0]); f.redIm.push(tHat[1]);
    f.cone.push(cone); f.margin.push(margin); f.pos.push(p);
    if (f.pool.length < MAX_POOL) f.pool.push(p);   // feedback: keepers seed future kicks
  }
  f.accepts++;
  if (margin > f.bestMargin) f.bestMargin = margin;
  return true;
}

// ===================== plot =====================
let fold = false;   // false = raw Teichmüller τ, true = reduced τ̂ (folded into domain)
const px = (f: Family, i: number) => (fold ? f.redRe[i] : f.rawRe[i]);
const py = (f: Family, i: number) => (fold ? f.redIm[i] : f.rawIm[i]);

const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh;background:#0e0e12;cursor:grab';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;
const layer = document.createElement('canvas');     // axes + accumulated points
const lctx = layer.getContext('2d')!;

let scale = 1, cx = 0, cy = 1.4;
function setView(minRe: number, maxRe: number, minIm: number, maxIm: number): void {
  const W = window.innerWidth, H = window.innerHeight, m = 70;
  scale = Math.min((W - 2 * m) / ((maxRe - minRe) || 1), (H - 2 * m) / ((maxIm - minIm) || 1));
  cx = (minRe + maxRe) / 2; cy = (minIm + maxIm) / 2;
}
const homeView = () => setView(-1.05, 1.05, 0.35, 3.0);
const sx = (re: number) => window.innerWidth / 2 + (re - cx) * scale;
const sy = (im: number) => window.innerHeight / 2 - (im - cy) * scale;
const planeX = (qx: number) => cx + (qx - window.innerWidth / 2) / scale;
const planeY = (qy: number) => cy - (qy - window.innerHeight / 2) / scale;

function niceStep(span: number): number {
  const raw = span / 8, pow = Math.pow(10, Math.floor(Math.log10(raw))), fr = raw / pow;
  return (fr < 1.5 ? 1 : fr < 3 ? 2 : fr < 7 ? 5 : 10) * pow;
}

function drawAxes(c: CanvasRenderingContext2D): void {
  const W = window.innerWidth, H = window.innerHeight;
  const left = planeX(0), right = planeX(W), top = planeY(0), bot = planeY(H);
  const step = niceStep(right - left);
  c.lineWidth = 1; c.font = '11px ui-monospace, monospace'; c.textBaseline = 'top';
  for (let re = Math.ceil(left / step) * step; re <= right; re += step) {
    const X = sx(re);
    c.strokeStyle = Math.abs(re) < step / 2 ? 'rgba(150,160,190,0.30)' : 'rgba(150,160,190,0.08)';
    c.beginPath(); c.moveTo(X, 0); c.lineTo(X, H); c.stroke();
    c.fillStyle = 'rgba(180,186,200,0.5)'; c.textAlign = 'center'; c.fillText(re.toFixed(2), X, H - 16);
  }
  for (let im = Math.max(step, Math.ceil(Math.max(bot, 0) / step) * step); im <= top; im += step) {
    const Y = sy(im);
    c.strokeStyle = 'rgba(150,160,190,0.08)';
    c.beginPath(); c.moveTo(0, Y); c.lineTo(W, Y); c.stroke();
    c.fillStyle = 'rgba(180,186,200,0.5)'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(`${im.toFixed(2)}i`, 6, Y); c.textBaseline = 'top';
  }
  c.strokeStyle = 'rgba(240,200,120,0.5)'; c.setLineDash([5, 5]); c.lineWidth = 1.3;
  for (const wall of [-0.5, 0.5]) {
    const X = sx(wall);
    c.beginPath(); c.moveTo(X, sy(Math.sin(Math.PI / 3))); c.lineTo(X, 0); c.stroke();
  }
  c.beginPath();
  for (let k = 0; k <= 96; k++) {
    const re = -0.5 + k / 96, X = sx(re), Y = sy(Math.sqrt(1 - re * re));
    if (k === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
  }
  c.stroke(); c.setLineDash([]);
}

// paint finds [from, count) of family f onto ctx c
function paintFinds(c: CanvasRenderingContext2D, f: Family, from: number): void {
  if (!f.visible) return;
  const W = window.innerWidth, H = window.innerHeight;
  c.fillStyle = f.color; c.globalAlpha = 0.55;
  for (let i = from; i < f.pos.length; i++) {
    const X = sx(px(f, i)), Y = sy(py(f, i));
    if (X < -3 || X > W + 3 || Y < -3 || Y > H + 3) continue;
    c.beginPath(); c.arc(X, Y, 2, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}

function rebuildLayer(): void {
  const dpr = window.devicePixelRatio || 1;
  layer.width = Math.floor(window.innerWidth * dpr);
  layer.height = Math.floor(window.innerHeight * dpr);
  lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawAxes(lctx);
  for (const f of families) { paintFinds(lctx, f, 0); f.drawn = f.pos.length; }
}

function drawSeeds(): void {
  ctx.lineWidth = 2;
  for (const f of families) {
    if (!f.visible) continue;
    for (const s of f.seedTau) {
      const re = fold ? reduceModulus([s.re, s.im])[0] : s.re;
      const im = fold ? reduceModulus([s.re, s.im])[1] : s.im;
      const X = sx(re), Y = sy(im);
      ctx.beginPath(); ctx.arc(X, Y, 6, 0, Math.PI * 2);
      ctx.fillStyle = f.color; ctx.fill();
      ctx.strokeStyle = '#0e0e12'; ctx.stroke();
      ctx.beginPath(); ctx.arc(X, Y, 7.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.lineWidth = 2;
    }
  }
}

let hover: { x: number; y: number } | null = null;
function drawHover(): void {
  if (!hover) return;
  const pr = 12; let best: { f: Family; i: number; d2: number } | null = null;
  for (const f of families) {
    if (!f.visible) continue;
    for (let i = 0; i < f.pos.length; i++) {
      const dx = sx(px(f, i)) - hover.x, dy = sy(py(f, i)) - hover.y, d2 = dx * dx + dy * dy;
      if (d2 < pr * pr && (!best || d2 < best.d2)) best = { f, i, d2 };
    }
  }
  if (!best) return;
  const { f, i } = best;
  const X = sx(px(f, i)), Y = sy(py(f, i));
  ctx.beginPath(); ctx.arc(X, Y, 4, 0, Math.PI * 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  const lines = [
    f.key,
    `τ = ${f.rawRe[i].toFixed(5)} ${f.rawIm[i] >= 0 ? '+' : '−'} ${Math.abs(f.rawIm[i]).toFixed(5)} i`,
    `reduced Re τ̂  ${f.redRe[i].toFixed(6)}`,
    `cone deficit  ${f.cone[i].toExponential(2)}`,
    `embed margin  ${f.margin[i].toExponential(2)}`,
  ];
  ctx.font = '12px ui-monospace, monospace';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
  const h = 16 + lines.length * 16;
  let bx = X + 12, by = Y - h - 8;
  if (bx + w > window.innerWidth) bx = X - 12 - w;
  if (by < 0) by = Y + 14;
  ctx.fillStyle = 'rgba(20,22,30,0.95)'; ctx.fillRect(bx, by, w, h);
  ctx.strokeStyle = f.color; ctx.lineWidth = 1.2; ctx.strokeRect(bx, by, w, h);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  lines.forEach((l, k) => { ctx.fillStyle = k === 0 ? f.color : '#e8e8ec'; ctx.fillText(l, bx + 8, by + 14 + k * 16); });
}

function draw(): void {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.drawImage(layer, 0, 0, window.innerWidth, window.innerHeight);
  drawSeeds();
  drawHover();
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rebuildLayer(); draw();
}
window.addEventListener('resize', resize);

// ===================== run loop =====================
let running = false;
const scratch = new Float64Array(Math.max(...families.map((f) => f.N)));
function frame(): void {
  if (running) {
    const t0 = performance.now();
    do {
      for (const f of families) if (f.active && f.pos.length < MAX_FINDS) attempt(f, scratch);
    } while (performance.now() - t0 < 10);     // ~10ms of search per frame, stays responsive
    for (const f of families) { paintFinds(lctx, f, f.drawn); f.drawn = f.pos.length; }
    updateHud();
  }
  draw();
  requestAnimationFrame(frame);
}

// ===================== controls (HTML overlay) =====================
const panel = document.createElement('div');
panel.style.cssText = [
  'position:fixed', 'top:14px', 'right:14px', 'width:280px', 'padding:12px 14px',
  'background:rgba(20,22,30,0.92)', 'border:1px solid rgba(150,160,190,0.25)', 'border-radius:8px',
  'font:12px ui-monospace,monospace', 'color:#e8e8ec', 'user-select:none', 'z-index:10',
].join(';');
document.body.appendChild(panel);

const startBtn = document.createElement('button');
const sigmaIn = document.createElement('input');
const bandSel = document.createElement('select');
const foldBox = document.createElement('input');
const stats = document.createElement('div');
const famBox = document.createElement('div');

function btnStyle(b: HTMLElement): void {
  b.style.cssText = 'cursor:pointer;background:#2a2d3a;color:#e8e8ec;border:1px solid rgba(150,160,190,0.3);'
    + 'border-radius:5px;padding:5px 9px;font:12px ui-monospace,monospace;margin:0 4px 0 0';
}

(function buildPanel() {
  const title = document.createElement('div');
  title.textContent = 'wall-walk · |Re τ̂| = ½';
  title.style.cssText = 'font-weight:bold;margin-bottom:8px;font-size:13px';
  panel.appendChild(title);

  btnStyle(startBtn); startBtn.textContent = '▶ start';
  startBtn.onclick = () => { running = !running; startBtn.textContent = running ? '⏸ pause' : '▶ start'; };
  const resetBtn = document.createElement('button'); btnStyle(resetBtn); resetBtn.textContent = 'reset';
  resetBtn.onclick = () => {
    for (const f of families) {
      f.rawRe.length = f.rawIm.length = f.redRe.length = f.redIm.length = 0;
      f.cone.length = f.margin.length = f.pos.length = 0;
      f.attempts = f.accepts = f.bestMargin = f.drawn = 0;
      f.pool = f.pool.slice(0, Math.min(f.pool.length, 64)); // keep original-ish seeds
    }
    rebuildLayer(); updateHud(); draw();
  };
  const row1 = document.createElement('div'); row1.style.margin = '0 0 10px';
  row1.append(startBtn, resetBtn); panel.appendChild(row1);

  // σ slider
  const sl = document.createElement('label'); sl.style.cssText = 'display:block;margin:8px 0';
  sigmaIn.type = 'range'; sigmaIn.min = '0.0005'; sigmaIn.max = '0.02'; sigmaIn.step = '0.0005';
  sigmaIn.value = String(params.sigma); sigmaIn.style.cssText = 'width:100%;vertical-align:middle';
  const sigmaLab = document.createElement('span');
  const updSigma = () => { params.sigma = +sigmaIn.value; sigmaLab.textContent = `σ = ${params.sigma}`; };
  sigmaIn.oninput = updSigma;
  sl.append(sigmaLab, sigmaIn); panel.appendChild(sl); updSigma();

  // band select
  const bl = document.createElement('label'); bl.style.cssText = 'display:block;margin:8px 0';
  for (const v of [1e-4, 3e-4, 1e-3, 3e-3, 1e-2]) {
    const o = document.createElement('option'); o.value = String(v); o.textContent = v.toExponential(0);
    if (v === params.band) o.selected = true; bandSel.appendChild(o);
  }
  bandSel.style.cssText = 'margin-left:6px;background:#2a2d3a;color:#e8e8ec;border:1px solid rgba(150,160,190,0.3);border-radius:4px';
  bandSel.onchange = () => { params.band = +bandSel.value; };
  bl.append('keep band  ||Re τ̂|−½| <', bandSel); panel.appendChild(bl);

  // fold toggle
  const fl = document.createElement('label'); fl.style.cssText = 'display:block;margin:8px 0;cursor:pointer';
  foldBox.type = 'checkbox';
  foldBox.onchange = () => { fold = foldBox.checked; rebuildLayer(); draw(); };
  fl.append(foldBox, ' fold to fundamental domain (plot τ̂)'); panel.appendChild(fl);

  stats.style.cssText = 'margin:8px 0;color:rgba(180,186,200,0.85);line-height:1.5'; panel.appendChild(stats);
  famBox.style.cssText = 'margin-top:6px'; panel.appendChild(famBox);

  const dlAll = document.createElement('button'); btnStyle(dlAll); dlAll.textContent = '⤓ download all';
  dlAll.style.marginTop = '8px';
  dlAll.onclick = () => { for (const f of families) downloadFamily(f); };
  panel.appendChild(dlAll);

  const help = document.createElement('div');
  help.style.cssText = 'margin-top:8px;color:rgba(150,160,190,0.6);line-height:1.4';
  help.textContent = 'scroll zoom · drag pan · r reset view · hover for τ / margin';
  panel.appendChild(help);
})();

function downloadFamily(f: Family): void {
  if (f.pos.length === 0) return;
  const lines: string[] = [];
  for (let i = 0; i < f.pos.length; i++) {
    let row = f.pos[i][0].toString();
    for (let j = 1; j < f.N; j++) row += ',' + f.pos[i][j].toString();
    row += `,${f.cone[i]},${f.redRe[i]},${f.redIm[i]},${f.margin[i]}`;  // 28-col, search-near-rect format
    lines.push(row);
  }
  const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `wall-walk-${f.key}-${f.pos.length}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
}

function updateHud(): void {
  const totA = families.reduce((s, f) => s + f.attempts, 0);
  const totK = families.reduce((s, f) => s + f.pos.length, 0);
  stats.innerHTML = `attempts ${totA.toLocaleString()} · kept ${totK.toLocaleString()}`
    + ` · accept ${totA ? (100 * families.reduce((s, f) => s + f.accepts, 0) / totA).toFixed(1) : '0'}%`;
  famBox.innerHTML = '';
  for (const f of families) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0';
    const vis = document.createElement('input'); vis.type = 'checkbox'; vis.checked = f.visible;
    vis.title = 'show / hide'; vis.onchange = () => { f.visible = vis.checked; rebuildLayer(); draw(); };
    const act = document.createElement('input'); act.type = 'checkbox'; act.checked = f.active;
    act.title = 'search on / off'; act.onchange = () => { f.active = act.checked; };
    const sw = document.createElement('span');
    sw.style.cssText = `width:11px;height:11px;background:${f.color};display:inline-block;border-radius:2px`;
    const lab = document.createElement('span'); lab.style.flex = '1';
    lab.textContent = `${f.key}  ${f.pos.length.toLocaleString()}  m≤${f.bestMargin.toExponential(1)}`;
    const dl = document.createElement('button'); btnStyle(dl); dl.textContent = '⤓'; dl.style.padding = '2px 6px';
    dl.title = 'download this family'; dl.onclick = () => downloadFamily(f);
    row.append(act, vis, sw, lab, dl);
    famBox.appendChild(row);
  }
}

// ===================== interaction =====================
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.style.cursor = 'grabbing'; });
window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'grab'; });
window.addEventListener('mousemove', (e) => {
  if (dragging) {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    cx -= dx / scale; cy += dy / scale; lastX = e.clientX; lastY = e.clientY;
    hover = null; rebuildLayer();
  } else if (!(e.target instanceof HTMLElement && panel.contains(e.target))) {
    hover = { x: e.clientX, y: e.clientY };
  }
});
canvas.addEventListener('mouseleave', () => { hover = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const k = Math.exp(-e.deltaY * 0.0015);
  const pX = planeX(e.clientX), pY = planeY(e.clientY);
  scale *= k;
  cx = pX - (e.clientX - window.innerWidth / 2) / scale;
  cy = pY + (e.clientY - window.innerHeight / 2) / scale;
  rebuildLayer();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'r') { homeView(); rebuildLayer(); draw(); }
  else if (e.key === ' ') { running = !running; startBtn.textContent = running ? '⏸ pause' : '▶ start'; e.preventDefault(); }
});

homeView();
resize();
updateHud();
requestAnimationFrame(frame);
