/**
 * hex-hunt demo — the RACE toward the hexagonal torus ρ, in the Teichmüller plane ℍ.
 *
 * Draws the initial near-ρ seeds (large, one color per lineage), the target ρ (open circle — a
 * goal, not a torus we have), and the growing cloud each lineage's random walk explores
 * (`samples/hex-hunt/cloud.csv`, `seedId,re,im,dist`), animated in file order (≈ time) so you can
 * watch who creeps closest. Reload to pick up the live run's latest cloud.
 *
 * scroll zoom · drag pan · space pause · r restart
 */
import seedsRaw from '../../samples/hex-hunt/seeds.csv?raw';
import { RICH } from '@core/triangulations';
import { modulus } from '@core/moduli/modulus';
import { HEXAGONAL } from '@core/moduli/reduce';

// cloud from the LATEST dated run folder (samples/hex-hunt/<stamp>/cloud.csv); empty until a run exists
const cloudRuns = import.meta.glob('../../samples/hex-hunt/*/cloud.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const cloudKeys = Object.keys(cloudRuns).sort();
const cloudRaw: string = cloudKeys.length ? cloudRuns[cloudKeys[cloudKeys.length - 1]] : '';

const TARGET = HEXAGONAL as [number, number];   // ρ; raw ≈ reduced here since these tori sit in the domain
const PALETTE = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#10b981', '#0ea5e9', '#8b5cf6'];
const color = (id: number) => PALETTE[id % PALETTE.length];

// seeds → their RAW Teichmüller τ (unreduced)
const seeds: [number, number][] = seedsRaw.trim().split('\n').map((l) => {
  const p = Float64Array.from(l.split(',').map(Number));
  return modulus(RICH, p).tau as [number, number];
});
// cloud rows: [seedId, rawRe, rawIm, reducedDist] — plot the raw (re,im), rank by the reduced dist
const cloud = cloudRaw.trim().split('\n').filter(Boolean).map((l) => {
  const [id, re, im, dist] = l.split(',').map(Number);
  return { id, re, im, dist };
});

const bounds = (() => {
  let minRe = TARGET[0], maxRe = TARGET[0], minIm = TARGET[1], maxIm = TARGET[1];
  const acc = (re: number, im: number) => { if (re < minRe) minRe = re; if (re > maxRe) maxRe = re; if (im < minIm) minIm = im; if (im > maxIm) maxIm = im; };
  for (const s of seeds) acc(s[0], s[1]);
  for (const c of cloud) acc(c.re, c.im);
  return { minRe, maxRe, minIm, maxIm };
})();

const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh;background:#0e0e12;cursor:grab';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

let scale = 1, cx = 0, cy = 1;
function fitView(): void {
  const W = window.innerWidth, H = window.innerHeight, m = 90;
  scale = Math.min((W - 2 * m) / ((bounds.maxRe - bounds.minRe) || 1), (H - 2 * m) / ((bounds.maxIm - bounds.minIm) || 1));
  cx = (bounds.minRe + bounds.maxRe) / 2; cy = (bounds.minIm + bounds.maxIm) / 2;
}
const sx = (re: number) => window.innerWidth / 2 + (re - cx) * scale;
const sy = (im: number) => window.innerHeight / 2 - (im - cy) * scale;
const planeX = (px: number) => cx + (px - window.innerWidth / 2) / scale;
const planeY = (py: number) => cy - (py - window.innerHeight / 2) / scale;
function resize(): void { const dpr = window.devicePixelRatio || 1; canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
window.addEventListener('resize', resize);

function drawAxesAndDomain(): void {
  const W = innerWidth, H = innerHeight;
  const left = planeX(0), right = planeX(W), top = planeY(0), bot = planeY(H);
  const raw = (right - left) / 8, pow = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pow;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
  ctx.lineWidth = 1; ctx.font = '11px ui-monospace, monospace'; ctx.textBaseline = 'top';
  for (let re = Math.ceil(left / step) * step; re <= right; re += step) {
    const X = sx(re); ctx.strokeStyle = Math.abs(re) < step / 2 ? 'rgba(150,160,190,0.28)' : 'rgba(150,160,190,0.07)';
    ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke();
    ctx.fillStyle = 'rgba(180,186,200,0.5)'; ctx.textAlign = 'center'; ctx.fillText(re.toFixed(2), X, H - 16);
  }
  for (let im = Math.max(step, Math.ceil(bot / step) * step); im <= top; im += step) {
    const Y = sy(im); ctx.strokeStyle = 'rgba(150,160,190,0.07)';
    ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke();
    ctx.fillStyle = 'rgba(180,186,200,0.5)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(`${im.toFixed(2)}i`, 6, Y); ctx.textBaseline = 'top';
  }
  ctx.strokeStyle = 'rgba(240,200,120,0.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2;
  for (const wall of [-0.5, 0.5]) { const X = sx(wall); ctx.beginPath(); ctx.moveTo(X, sy(Math.sin(Math.PI / 3))); ctx.lineTo(X, 0); ctx.stroke(); }
  ctx.beginPath(); for (let k = 0; k <= 64; k++) { const re = -0.5 + k / 64; const X = sx(re), Y = sy(Math.sqrt(1 - re * re)); k === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
}

let shown = 0, paused = false;
const bestPer = new Array(seeds.length).fill(Infinity);
function draw(): void {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  drawAxesAndDomain();
  // target ρ — open circle
  const TX = sx(TARGET[0]), TY = sy(TARGET[1]);
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(TX, TY, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(250,204,21,0.9)'; ctx.font = 'bold 12px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('  ρ (hex)', TX + 8, TY);
  // cloud up to `shown`
  bestPer.fill(Infinity);
  for (let i = 0; i < shown && i < cloud.length; i++) {
    const c = cloud[i]; const X = sx(c.re), Y = sy(c.im);
    ctx.fillStyle = color(c.id); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(X, Y, 1.7, 0, Math.PI * 2); ctx.fill();
    if (c.dist < bestPer[c.id]) bestPer[c.id] = c.dist;   // rank by the reduced distance (the search metric)
  }
  ctx.globalAlpha = 1;
  // seeds — large colored dots + id
  seeds.forEach((s, id) => {
    const X = sx(s[0]), Y = sy(s[1]);
    ctx.fillStyle = color(id); ctx.beginPath(); ctx.arc(X, Y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#0e0e12'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(id), X, Y);
  });
  // HUD
  ctx.fillStyle = 'rgba(232,232,236,0.95)'; ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`hex-hunt race → ρ   ${seeds.length} lineages · ${Math.min(shown, cloud.length).toLocaleString()}/${cloud.length.toLocaleString()} cloud pts`, 16, 14);
  const rank = bestPer.map((d, id) => ({ id, d })).filter((r) => isFinite(r.d)).sort((a, b) => a.d - b.d).slice(0, 5);
  ctx.font = '12px ui-monospace, monospace';
  rank.forEach((r, k) => { ctx.fillStyle = color(r.id); ctx.fillText(`#${r.id}  d=${r.d.toExponential(2)}`, 16, 36 + k * 16); });
  ctx.fillStyle = 'rgba(180,186,200,0.7)'; ctx.fillText('scroll zoom · drag pan · space pause · r restart', 16, 36 + 5 * 16 + 6);
}
function tick(): void { if (!paused && shown < cloud.length) shown = Math.min(cloud.length, shown + Math.max(1, Math.ceil(cloud.length / 900))); draw(); requestAnimationFrame(tick); }

let dragging = false, lx = 0, ly = 0;
canvas.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.style.cursor = 'grabbing'; });
window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'grab'; });
window.addEventListener('mousemove', (e) => { if (!dragging) return; cx -= (e.clientX - lx) / scale; cy += (e.clientY - ly) / scale; lx = e.clientX; ly = e.clientY; });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); const f = Math.exp(-e.deltaY * 0.001), mx = planeX(e.clientX), my = planeY(e.clientY); scale *= f; cx = mx + (cx - mx) / f; cy = my + (cy - my) / f; }, { passive: false });
window.addEventListener('keydown', (e) => { if (e.key === ' ') { paused = !paused; e.preventDefault(); } if (e.key === 'r') shown = 0; });

fitView(); resize(); tick();
