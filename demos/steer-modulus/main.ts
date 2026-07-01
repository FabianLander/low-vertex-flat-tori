/**
 * steer-modulus demo — watch a cloud of embedded tori get STEERED toward the hexagonal torus
 * ρ = e^{iπ/3} = (½, √3/2), animated in the Teichmüller plane ℍ.
 *
 * Each path was precomputed by `scripts/precompute-steer-hex.mjs`: an embedded torus from
 * data/explore-from-seeds, steered toward ρ by `steerModulus` (fatten → march along the
 * hyperbolic geodesic, staying embedded), recording its modulus τ after each round. Here we
 * animate every torus sliding along its recorded trajectory: points that reach ρ settle on it
 * (green), points that pinch at the embedded-component boundary freeze there (orange).
 *
 * Mirrors the `moduli` demo's ℍ plot (canvas 2D, equal-aspect, SL(2,ℤ) fundamental domain
 * drawn faintly). Scroll to zoom, drag to pan, space to pause, r to restart the animation.
 */

import trajRaw from './data/trajectories.json?raw';

type Path = { start: number; traj: [number, number][]; reached: boolean };
const data = JSON.parse(trajRaw) as { target: [number, number]; paths: Path[] };
const TARGET = data.target;
const paths = data.paths;
const maxLen = Math.max(...paths.map((p) => p.traj.length));

// ---- bounds over all trajectory points + the target, for the initial fit ----
const bounds = (() => {
  let minRe = TARGET[0], maxRe = TARGET[0], minIm = TARGET[1], maxIm = TARGET[1];
  for (const p of paths) for (const [re, im] of p.traj) {
    if (re < minRe) minRe = re; if (re > maxRe) maxRe = re;
    if (im < minIm) minIm = im; if (im > maxIm) maxIm = im;
  }
  return { minRe, maxRe, minIm, maxIm };
})();

// ---- canvas ----
const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh;background:#0e0e12;cursor:grab';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

// ---- view transform: equal-aspect, plane → screen ----
let scale = 1, cx = 0, cy = 1;
function fitView(): void {
  const W = window.innerWidth, H = window.innerHeight, m = 90;
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
}
window.addEventListener('resize', () => { resize(); });

// ---- axes + SL(2,ℤ) fundamental domain ----
function niceStep(span: number): number {
  const raw = span / 8, pow = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pow;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
}
function drawAxes(): void {
  const W = window.innerWidth, H = window.innerHeight;
  const left = planeX(0), right = planeX(W), top = planeY(0), bot = planeY(H);
  const step = niceStep(right - left);
  ctx.lineWidth = 1; ctx.font = '11px ui-monospace, monospace'; ctx.textBaseline = 'top';
  for (let re = Math.ceil(left / step) * step; re <= right; re += step) {
    const X = sx(re);
    ctx.strokeStyle = Math.abs(re) < step / 2 ? 'rgba(150,160,190,0.30)' : 'rgba(150,160,190,0.08)';
    ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke();
    ctx.fillStyle = 'rgba(180,186,200,0.5)'; ctx.textAlign = 'center'; ctx.fillText(re.toFixed(2), X, H - 16);
  }
  for (let im = Math.max(step, Math.ceil(bot / step) * step); im <= top; im += step) {
    const Y = sy(im);
    ctx.strokeStyle = 'rgba(150,160,190,0.08)';
    ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke();
    ctx.fillStyle = 'rgba(180,186,200,0.5)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${im.toFixed(2)}i`, 6, Y); ctx.textBaseline = 'top';
  }
  // fundamental domain: Re=±½ walls and the arc |τ|=1
  ctx.strokeStyle = 'rgba(240,200,120,0.40)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.3;
  for (const wall of [-0.5, 0.5]) { const X = sx(wall); ctx.beginPath(); ctx.moveTo(X, sy(Math.sin(Math.PI / 3))); ctx.lineTo(X, 0); ctx.stroke(); }
  ctx.beginPath();
  for (let k = 0; k <= 64; k++) { const re = -0.5 + k / 64; const X = sx(re), Y = sy(Math.sqrt(1 - re * re)); k === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
  ctx.stroke(); ctx.setLineDash([]);
}

// ---- the target ρ marker: an OPEN circle (a goal we're aiming at, not one we've found) ----
function drawTarget(): void {
  const X = sx(TARGET[0]), Y = sy(TARGET[1]);
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(X, Y, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(250,204,21,0.9)'; ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('  ρ  (hex)', X + 8, Y);
}

// ---- animation ----
let progress = 0;       // 0 → maxLen, the global trajectory index
let paused = false;
const SPEED = 0.25;     // rounds per frame

function draw(): void {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawAxes();
  drawTarget();
  const idx = Math.floor(progress);
  let reached = 0, pinched = 0, moving = 0;
  for (const p of paths) {
    const n = p.traj.length, i = Math.min(idx, n - 1);
    // very faint connector (just to associate a path's points), then the ACTUAL tori as dots
    ctx.strokeStyle = 'rgba(120,170,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k <= i; k++) { const X = sx(p.traj[k][0]), Y = sy(p.traj[k][1]); k === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(140,180,255,0.55)';                 // each dot = a real flat embedded torus we found this round
    for (let k = 0; k < i; k++) { ctx.beginPath(); ctx.arc(sx(p.traj[k][0]), sy(p.traj[k][1]), 1.7, 0, Math.PI * 2); ctx.fill(); }
    // head (the current torus)
    const [re, im] = p.traj[i];
    const done = i === n - 1 && idx >= n - 1;
    const color = !done ? '#e8e8ec' : p.reached ? '#22c55e' : '#f59e0b';
    if (done) { p.reached ? reached++ : pinched++; } else moving++;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sx(re), sy(im), done ? 3 : 3.5, 0, Math.PI * 2); ctx.fill();
  }
  // HUD
  ctx.fillStyle = 'rgba(232,232,236,0.95)'; ctx.font = '13px ui-monospace, monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`steering ${paths.length} tori → ρ   round ${idx}/${maxLen - 1}`, 16, 16);
  ctx.fillStyle = 'rgba(180,186,200,0.85)'; ctx.font = '12px ui-monospace, monospace';
  ctx.fillText(`● moving ${moving}   ● reached ${reached}   ● pinched ${pinched}`, 16, 38);
  ctx.fillText('scroll zoom · drag pan · space pause · r restart', 16, 58);
}

function tick(): void {
  if (!paused && progress < maxLen) progress = Math.min(maxLen, progress + SPEED);
  draw();
  requestAnimationFrame(tick);
}

// ---- interaction: pan / zoom / keys ----
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.style.cursor = 'grabbing'; });
window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'grab'; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  cx -= (e.clientX - lastX) / scale; cy += (e.clientY - lastY) / scale; lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const f = Math.exp(-e.deltaY * 0.001), mx = planeX(e.clientX), my = planeY(e.clientY);
  scale *= f; cx = mx + (cx - mx) / f; cy = my + (cy - my) / f;
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { paused = !paused; e.preventDefault(); }
  if (e.key === 'r') progress = 0;
});

fitView();
resize();
tick();
