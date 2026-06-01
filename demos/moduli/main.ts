/**
 * Moduli viewer — plot flat tori as points τ in the upper half-plane ℍ.
 *
 * Loads demos/moduli/moduli.csv (precomputed by scripts/compute-moduli.mjs:
 * rows `re,im,src`), colored by source file. If pointed instead at a raw tori
 * CSV (24 columns per row) it develops each torus on the fly via modulus().
 *
 * Toggle (button / Space): raw τ (Teichmüller, the marked modulus) ⇄ reduced
 * τ̂ folded into the SL(2,ℤ) fundamental domain (moduli space). Drag to pan,
 * wheel to zoom, "fit" button to reframe.
 */

import csvRaw from './moduli.csv?raw';
import { VERTEX_COUNT } from '../../src/math/topology';
import { modulus, reduceModulus, type V2 } from '../../src/math/develop';

const DIM = VERTEX_COUNT * 3;

// ---- parse: comment line gives file labels; data rows are re,im,src or 24-col tori ----
let labels: string[] = [];
const raw: { re: number; im: number; src: number }[] = [];
for (const line of csvRaw.split('\n')) {
  const s = line.trim();
  if (!s) continue;
  if (s.startsWith('#')) { const m = s.match(/files:\s*(.+)/); if (m) labels = m[1].split(',').map((x) => x.trim()); continue; }
  const nums = s.split(',').map(Number);
  if (nums.length === DIM) { const t = modulus(Float64Array.from(nums)).tau; raw.push({ re: t[0], im: t[1], src: 0 }); }
  else if (nums.length >= 2) raw.push({ re: nums[0], im: nums[1], src: nums[2] ?? 0 });
}
const nSrc = Math.max(1, ...raw.map((p) => p.src + 1));
if (labels.length !== nSrc) labels = Array.from({ length: nSrc }, (_, i) => `src ${i}`);

// reduced copy (τ̂ ∈ SL(2,ℤ) fundamental domain)
const reduced = raw.map((p) => { const r = reduceModulus([p.re, p.im] as V2); return { re: r[0], im: r[1], src: p.src }; });

const color = (src: number) => src === nSrc - 1 && labels[src] === 'seeds.csv'
  ? '#ffffff'
  : `hsl(${Math.round((360 * src) / nSrc)}, 70%, 62%)`;

// ---- state ----
let mode: 'raw' | 'reduced' = 'raw';
const pts = () => (mode === 'raw' ? raw : reduced);

// ---- canvas ----
const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh;background:#0e0e12;touch-action:none';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

// view: screen = (ox + scale*re, oy − scale*im)
let scale = 200, ox = 0, oy = 0;
function fit(): void {
  const W = window.innerWidth, H = window.innerHeight, m = 70;
  let minX = Infinity, maxX = -Infinity, minY = 0, maxY = -Infinity;
  for (const p of pts()) { if (p.re < minX) minX = p.re; if (p.re > maxX) maxX = p.re; if (p.im > maxY) maxY = p.im; if (p.im < minY) minY = p.im; }
  if (!isFinite(minX)) { minX = -1; maxX = 1; maxY = 2; }
  minY = Math.min(minY, 0);
  scale = Math.min((W - 2 * m) / (maxX - minX || 1), (H - 2 * m) / (maxY - minY || 1));
  ox = (W - scale * (minX + maxX)) / 2;
  oy = (H + scale * (minY + maxY)) / 2;
}
const SX = (re: number) => ox + scale * re;
const SY = (im: number) => oy - scale * im;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', resize);

function drawGridAndDomain(W: number, H: number): void {
  // real axis (Im = 0)
  ctx.strokeStyle = 'rgba(200,210,235,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, SY(0)); ctx.lineTo(W, SY(0)); ctx.stroke();
  // half-integer vertical guides and unit circle (faint)
  ctx.strokeStyle = 'rgba(150,160,190,0.12)';
  for (let k = -3; k <= 3; k++) { const x = SX(k * 0.5); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(SX(0), SY(0), scale, Math.PI, 2 * Math.PI); ctx.stroke();
  // SL(2,ℤ) fundamental domain boundary (emphasized in reduced mode)
  ctx.strokeStyle = mode === 'reduced' ? 'rgba(240,200,90,0.85)' : 'rgba(240,200,90,0.35)';
  ctx.lineWidth = 2;
  const yTop = SY(3);
  ctx.beginPath();
  ctx.moveTo(SX(-0.5), yTop); ctx.lineTo(SX(-0.5), SY(Math.sqrt(3) / 2));
  ctx.arc(SX(0), SY(0), scale, Math.PI - Math.PI / 3, Math.PI / 3, true);
  ctx.moveTo(SX(0.5), SY(Math.sqrt(3) / 2)); ctx.lineTo(SX(0.5), yTop);
  ctx.stroke();
}

function draw(): void {
  const W = window.innerWidth, H = window.innerHeight;
  syncBtn();
  ctx.clearRect(0, 0, W, H);
  drawGridAndDomain(W, H);

  // points grouped by source (one fillStyle per group)
  const groups: { re: number; im: number }[][] = Array.from({ length: nSrc }, () => []);
  for (const p of pts()) groups[p.src].push(p);
  for (let s = 0; s < nSrc; s++) {
    ctx.fillStyle = color(s);
    const big = labels[s] === 'seeds.csv';
    const r = big ? 4 : 1.6;
    for (const p of groups[s]) {
      const x = SX(p.re), y = SY(p.im);
      if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue;
      if (big) { ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); }
      else ctx.fillRect(x - r / 2, y - r / 2, r, r);
    }
  }

  // HUD
  ctx.fillStyle = 'rgba(232,232,236,0.9)'; ctx.font = '13px ui-monospace, monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`${raw.length.toLocaleString()} tori — ${mode === 'raw' ? 'τ (Teichmüller)' : 'τ̂ (moduli space, SL(2,ℤ))'}`, 12, 10);
  let ly = 32;
  for (let s = 0; s < nSrc; s++) {
    ctx.fillStyle = color(s); ctx.fillRect(12, ly + 2, 11, 11);
    ctx.fillStyle = 'rgba(220,225,240,0.8)'; ctx.fillText(labels[s], 30, ly);
    ly += 17;
  }
}

// ---- interaction: pan (drag), zoom (wheel) ----
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { if (!dragging) return; ox += e.clientX - lastX; oy += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; draw(); });
canvas.addEventListener('pointerup', (e) => { dragging = false; canvas.releasePointerCapture(e.pointerId); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const f = Math.exp(-e.deltaY * 0.0015);
  const mx = e.clientX, my = e.clientY;
  ox = mx + (ox - mx) * f; oy = my + (oy - my) * f; scale *= f;
  draw();
}, { passive: false });

// ---- buttons ----
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed;right:16px;bottom:16px;display:flex;gap:10px;z-index:10';
const mkBtn = (label: string, fn: () => void): HTMLButtonElement => {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = ['font:600 15px/1 system-ui,sans-serif', 'color:#e8e8ec', 'background:rgba(40,44,54,0.9)', 'border:1px solid #4a5060', 'border-radius:10px', 'padding:12px 18px', 'cursor:pointer', '-webkit-tap-highlight-color:transparent', 'touch-action:manipulation'].join(';');
  b.addEventListener('click', () => { fn(); b.blur(); });
  return b;
};
const modeBtn = mkBtn('', () => { mode = mode === 'raw' ? 'reduced' : 'raw'; fit(); draw(); });
function syncBtn(): void { modeBtn.textContent = mode === 'raw' ? 'reduce → SL(2,ℤ)' : 'raw τ'; }
ui.append(mkBtn('fit', () => { fit(); draw(); }), modeBtn);
document.body.appendChild(ui);

window.addEventListener('keydown', (e) => { if (e.key === ' ') { mode = mode === 'raw' ? 'reduced' : 'raw'; fit(); draw(); e.preventDefault(); } });

fit();
resize();
